

const BTSensor = require("../BTSensor");

function bytesToBase10String(bytes){
        let s = ""
        for (let byte of bytes){
            s+=byte.toString(16).padStart(2,'0')
        }
        return s
    }

class JunctekBMS extends BTSensor{
    static Domain = BTSensor.SensorDomains.electrical
    
    constructor(device, config, gattConfig) {
        super(device, config, gattConfig)
    }

    static async identify(device){

        return null
    }

    chargeDirection = 1 

    hasGATT(){
        return true
    }



    async initSchema(){
        super.initSchema()
        this.addDefaultParam("batteryID")

        this.addDefaultPath("voltage","electrical.batteries.voltage")
            
        this.addDefaultPath("current","electrical.batteries.current")
        
        this.addDefaultPath("power","electrical.batteries.power")
        
        this.addDefaultPath("cycles",'electrical.batteries.cycles')

        this.addDefaultPath("soc",'electrical.batteries.capacity.stateOfCharge')
        this.addDefaultPath("remaining",'electrical.batteries.capacity.remaining')
        this.addDefaultPath("timeRemaining",'electrical.batteries.capacity.timeRemaining')
        this.addDefaultPath("discharge",'electrical.batteries.capacity.dischargeSinceFull')
        this.addDefaultPath("charge",'electrical.batteries.capacity.charge')
        this.addDefaultPath("temperature",'electrical.batteries.temperature')
        this.addDefaultPath("actualCapacity",'electrical.batteries.capacity.actual')
        this.addMetadatum('timeToCharged','s', 'time in seconds to battery is fully charged')
            .default='electrical.batteries.{batteryID}.timeToCharged'
        this.addMetadatum('impedance','mOhm', 'measured resistance')
            .default='electrical.batteries.{batteryID}.impedance'
    }

    emitFrom(buffer){
        let value=[], emitObject={}
        this.debug(buffer)
        for (let byte of buffer){
            if (byte==0xBB) {
                value=[]
                continue
            }
            if (byte==0xEE){
                continue
            }
            
            if (isNaN(parseInt(byte.toString(16)))){ //not a base-10 number. seriously. that's how Junctek does this.
                const v = parseInt(bytesToBase10String(value))
                //if (byte!==0xd5)
                //    this.debug(`0x${(byte).toString(16)}: ${(value).map((v)=>'0x'+v.toString(16))} (${v})`)
                value=[]
                switch (byte){
                case 0xC0:
                    emitObject["voltage"]=v/100
                    break
                
                case 0xC1:
                    emitObject["current"]=()=>{return (v/100)*this.chargeDirection}
                    break

                case 0xD1:
                    this.debug(v)
                    if (v==0)
                        this.chargeDirection=-1
                    else 
                        this.chargeDirection= 1
                    this.debug(this.chargeDirection)
                    break

                case 0xD2:

                    emitObject["remaining"]=v*3.6
                    break

                case 0xD3:
                    emitObject["discharge"]= v/100000
                    break
                case 0xD4:
                    emitObject["charge"]=v/100000
                    break
                case 0xD6:
                    if (chargeDirection==-1){
                        emitObject["timeToCharged"] = NaN
                        emitObject["timeRemaining"] = v*60
                    }
                    else {
                        emitObject["timeRemaining"] = NaN
                        emitObject["timeToCharged"] = v*60
                    }
                    break
                case 0xD7:
                    emitObject["impedance"]=v/100
                    break
                case 0xD8:
                    emitObject["power"]=()=>{
                        this.debug(this.chargeDirection)
                        return (v/100)*this.chargeDirection
                    }
                    break
                case 0xD9:
                    emitObject["temperature"]=v + 173.15 //assume C not F -- raw value is c - 100
                    break
                case 0xB1:
                    emitObject["capacityActual"]=v /10
                    break
            }
            }
            else{
                value.push(byte)
            }
        }
        for (const [key, value] of Object.entries(emitObject)) {
                this.emit(key,value instanceof Function?value():value)
        }
        emitObject = {}
    }
    emitGATT(){
        /*this.battCharacteristic.readValue()
        .then((buffer)=>{
            this.emitFrom(buffer)
        })*/
    }
    initGATTConnection(){ 
        return new Promise((resolve,reject )=>{ this.deviceConnect().then(async ()=>{ 
            if (!this.gattServer) { 
                this.gattServer = await this.device.gatt() 
                this.battService = await this.gattServer.getPrimaryService("0000fff0-0000-1000-8000-00805f9b34fb") 
                this.battCharacteristic = await this.battService.getCharacteristic("0000fff1-0000-1000-8000-00805f9b34fb")

            }
                resolve(this)
             }) .catch((e)=>{ reject(e.message) }) }) 
    }

    initGATTNotifications() { 
        Promise.resolve(this.battCharacteristic.startNotifications().then(()=>{    
            this.battCharacteristic.on('valuechanged', buffer => {
                this.emitFrom(buffer)
            })
        }))
    }
  
    async stopListening(){
        super.stopListening()
        if (this.battCharacteristic  && await this.battCharacteristic.isNotifying()) {
            await this.battCharacteristic.stopNotifications()
            this.battCharacteristic=null
        }
        if (await this.device.isConnected()){
            await this.device.disconnect()
        }
    }
}
module.exports=JunctekBMS
