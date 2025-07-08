

const BTSensor = require("../BTSensor");

function bytesToBase10String(bytes){
        let s = ""
        for (let byte of bytes){
            s+=byte.toString(16)
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
        this.addMetadatum('impedance','mOhm', 'measured resistance')
            .default='electrical.batteries.{batteryID}.impedance'
    }

    emitFrom(buffer){
        var value=[], chargeDirection = 1
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
                value=[]
                switch (byte){
                case 0xC0:
                    this.emit("voltage",v/100)
                    break
                
                case 0xC1:
                    this.emit("current",(v/100)*chargeDirection)
                    break

                case 0xD1:
                    if (byte==0)
                        chargeDirection=-1
                    break

                case 0xD2:
                    this.emit("remaining",v*3.6)
                    break

                case 0xD3:
                    this.emit("discharge",v/100000)
                    break
                case 0xD4:
                    this.emit("charge",v/100000)
                    break
                case 0xD6:
                    this.emit("timeRemaining",v*60)
                    break
                case 0xD7:
                    this.emit("impedance",v/100)
                    break
                case 0xD8:
                    this.emit("power",(v/100)*chargeDirection)
                    break
                case 0xD9:
                    this.emit("temperature",v + 273.15) //assume C not F
                    break
                case 0xB1:
                    this.emit("capacityActual",v /10 )
                    break
            }
            }
            else{
                value.push(byte)
            }
        }
    }
    emitGATT(){
        this.battCharacteristic.readValue()
        .then((buffer)=>{
            this.emitFrom(buffer)
        })
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
