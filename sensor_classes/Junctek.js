

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
        this.addDefaultPath("remainingAh",'electrical.batteries.capacity.remaining')
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

        for (let byte of buffer){
            if (byte==0xBB) {
                value=[]
                continue
            }
            if (byte==0xEE){
                continue
            }
            
            value.push[byte]

            if (parseInt(byte.toString(16))==NaN){ //not a base-10 number. seriously. that's how Junctek does this.
                const v = parseInt(bytesToBase10String(value))
                switch (byte){
                case 0xC0:{
                    emit("voltage",v/100)
                }
                case 0xC1:{
                    emit("current",(v/100)*chargeDirection)
                }

                case 0xD1:{
                    if (byte==0)
                        chargeDirection=-1
                }

                case 0xD2:{
                    emit("remainingAh",v/1000)
                }

                case 0xD3:{
                    emit("discharge",v/100000)
                }
                case 0xD4:{
                    emit("charge",v/100000)
                }
                case 0xD6:{
                    emit("timeRemaining",v*60)
                }
                case 0xD7:{
                    emit("impedance",v/100)
                }
                case 0xD8:{
                    emit("power",(v/100)*chargeDirection)
                }
                case 0xD9:{
                    emit("temperature",v + 173.15) //assume C not F
                }
                case 0xB1:{
                    emit("capacityActual",v /10 )
                }
            }
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
                this.battCharacteristic = await this.battService.getCharacteristic("0000ffe1-0000-1000-8000-00805f9b34fb")
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
