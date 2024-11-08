/**
  
 */

const RenogySensor = require("./Renogy/RenogySensor.js");
class RenogyBattery extends RenogySensor {
    
    static async identify(device){
        return new Promise( async ( resolve, reject )=>{
            if (!await super.identify(device)) 
                resolve()
            else
            try {
            await device.connect()
            const rw =  await this.getReadWriteCharacteristics(device)    
            await rw.read.startNotifications()
            await this.sendReadFunctionRequest( rw.write, 0xFF, 0x0c, 0x08)

            rw.read.once('valuechanged', async (buffer) => {
                await rw.read.stopNotifications()
                await device.disconnect()
                if (buffer[2]!=0x10) 
                    resolve() 
                else {//????
                    const model = buffer.subarray(3,15).toString().trim()
                    if (model.startsWith("RNG-BATT") || model.startsWith("RNGRBP"))
                        resolve(this)           
                    else
                        resolve()
                }
            })
            
        } catch (error) {
            reject(error.message)
        }
        })
    }
  
    async init(){
        await super.init()
        await this.device.connect()
        await this.readChar.startNotifications()
        this.numberOfCells = await this.retrieveNumberOfCells()
        this.deviceID = await this.retrieveDeviceID()
        await this.readChar.stopNotifications()
        await this.device.disconnect()
        this.initMetadata()
    }

    async getAllEmitterFunctions(){
        return [this.getAndEmitBatteryInfo, 
                this.getAndEmitCellTemperatures, 
                this.getAndEmitCellVoltages]
    }
    initMetadata(){

        this.addMetadatum('numberOfCells','', 'number of cells')
        this.addMetadatum('current','A','current',
             (buffer)=>{return buffer.readInt16BE(3)/100})
             
        this.addMetadatum('voltage','V','voltage',
            (buffer)=>{return buffer.readUInt16BE(5)/10})
        
        this.addMetadatum('remainingCharge', 'Ah', 'remaining charge',  //TODO: units 
            (buffer)=>{return buffer.readUInt32BE(7)/1000})

        this.addMetadatum('capacity','Ah', 'capacity',
            (buffer)=>{return buffer.readUInt32BE(11)/1000})

        for (let i = 0; i++ ; i < this.numberOfCells) {
            this.addMetadatum(`cellVoltage${i}`, 'V', `cell #${i} voltage`,
                (buffer)=>{ return buffer.readUInt16(5+ i*2) }
            )
            this.addMetadatum(`cellTemp${i}`, 'K', `cell #${i} temperature`,
                (buffer)=>{ return buffer.readUInt16(5+ i*2)+273.15 }
            )
        }
    }
    async initGATTConnection() {
        await super.initGATTConnection()
        this.emit('numberOfCells', this.numberOfCells)
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
    retrieveDeviceID(){
        return new Promise( async ( resolve, reject )=>{
            this.sendFunctionRequest(0x14, 0x67)

            const valChanged = async (buffer) => {
                resolve((buffer.readUInt8(4)))
            }
            this.readChar.once('valuechanged', valChanged )
        })
    }

    getAndEmitBatteryInfo(){
        return new Promise( async ( resolve, reject )=>{

            await this.sendReadFunctionRequest(0x13b2, 0x6)

        
            this.readChar.once('valuechanged', (buffer) => {
                ["current", "voltage", "remainingCharge", "capacity"].forEach(tag)
                    this.emitData( tag, buffer )
                
                resolve(this)
            })
        })
    }
    
    getAndEmitCellVoltages(){
        return new Promise( async ( resolve, reject )=>{
            this.sendReadFunctionRequest(0x1388,0x11)

            this.readChar.once('valuechanged', (buffer) => {
                for (let i = 0; i++ ; i < this.numberOfCells) 
                    this.emitData(`cellVoltage${i}`, buffer)
                resolve(this)
            })
        })
    }

    getAndEmitCellTemperatures(){
        return new Promise( async ( resolve, reject )=>{
            this.sendReadFunctionRequest(0x1399,0x22)

            this.readChar.once('valuechanged', buffer => {
                for (let i = 0; i++ ; i < this.numberOfCells) 
                    this.emitData(`cellTemp${i}`, buffer)
                resolve(this)
            })
        })
    }

  
}
module.exports=RenogyBattery