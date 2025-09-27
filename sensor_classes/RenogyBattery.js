/**
  
 */

const RenogySensor = require("./Renogy/RenogySensor.js");
class RenogyBattery extends RenogySensor {
    
    static ImageFile="RenogySmartLiFePo4Battery.webp"

    async getAllEmitterFunctions(){
        return [this.getAndEmitBatteryInfo.bind(this), 
                this.getAndEmitCellTemperatures.bind(this), 
                this.getAndEmitCellVoltages.bind(this)]
    }
    numberOfCells=4
    initSchema(){
        this.addDefaultParam("batteryID").default="house"
        this.addParameter(
            "numberOfCells",
            {
                title:"Number of cells",
                type: "number",
                isRequired: true,
                default: this.numberOfCells,
                minimum: 1,
                maximum: 16,
                multipleOf:1
            }
        )
        this.addDefaultPath('current','electrical.batteries.current')
            .read=(buffer)=>{return buffer.readInt16BE(3)/100}
             
        this.addDefaultPath('voltage','electrical.batteries.voltage')
            .read=(buffer)=>{return buffer.readUInt16BE(5)/10}
        
        this.addDefaultPath('remainingCharge', 'electrical.batteries.capacity.remaining') 
            .read=(buffer)=>{return buffer.readUInt32BE(7)/1000}
        
        this.addDefaultPath('capacity', 'electrical.batteries.capacity.actual') 
            .read=(buffer)=>{return buffer.readUInt32BE(11)/1000}

        for (let i = 0; i++ ; i < this.numberOfCells) {
            this.addMetadatum(`cellVoltage${i}`, 'V', `cell #${i} voltage`,
                (buffer)=>{ return buffer.readUInt16(5+ i*2) })
            .default=`electrical.batteries.{batteryID}.cell${i}.voltage`

            this.addMetadatum(`cellTemp${i}`, 'K', `cell #${i} temperature`,
                (buffer)=>{ return buffer.readUInt16(5+ i*2)+273.15 })
                .default=`electrical.batteries.{batteryID}.cell${i}.temperature`

        }
    }
    async initGATTConnection() {
        await super.initGATTConnection()
        this.numberOfCells = await this.retrieveNumberOfCells()
    }
    
    retrieveModelID(){
        return new Promise( async ( resolve, reject )=>{

        await this.sendReadFunctionRequest(0x1402,0x08)
          
        this.readChar.once('valuechanged', async (buffer) => {
            if (buffer[2]!=0x10) 
                reject("Unknown error retrieving model ID") //???
            const model = buffer.subarray(3,17).toString().trim()
            resolve(model)           
        })
    })
    }
    retrieveNumberOfCells(){

        return new Promise( async ( resolve, reject )=>{
            await this.sendReadFunctionRequest(0x1388,0x11)

            const valChanged = async (buffer) => {
                resolve(buffer.readUInt16(3))
            }
            this.readChar.once('valuechanged', valChanged )
        })
    }
   

    getAndEmitBatteryInfo(){
        return new Promise( async ( resolve, reject )=>{

            await this.sendReadFunctionRequest(0x13b2, 0x6)

        
            this.readChar.once('valuechanged', (buffer) => {
                ["current", "voltage", "remainingCharge", "capacity"].forEach((tag)=>
                    this.emitData( tag, buffer ))
                
                resolve(this)
            })
        })
    }
    
    getAndEmitCellVoltages(){
        return new Promise( async ( resolve, reject )=>{
            await this.sendReadFunctionRequest(0x1388,0x11)

            this.readChar.once('valuechanged', (buffer) => {
                for (let i = 0; i++ ; i < this.numberOfCells) 
                    this.emitData(`cellVoltage${i}`, buffer)
                resolve(this)
            })
        })
    }

    getAndEmitCellTemperatures(){
        return new Promise( async ( resolve, reject )=>{
            await this.sendReadFunctionRequest(0x1399,0x22)

            this.readChar.once('valuechanged', buffer => {
                for (let i = 0; i++ ; i < this.numberOfCells) 
                    this.emitData(`cellTemp${i}`, buffer)
                resolve(this)
            })
        })
    }

  
}
module.exports=RenogyBattery