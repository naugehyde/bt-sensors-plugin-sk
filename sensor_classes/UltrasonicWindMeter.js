const BTSensor = require("../BTSensor");
class UltrasonicWindMeter extends BTSensor{
    static async identify(device){
        
        const uuids = await this.getDeviceProp(device,'UUIDs')
        const name = await this.getDeviceProp(device,"Name")
        if (name == 'ULTRASONIC')
            return this 
        else
            return null
    }
    hasGATT(){
        return true
    }
    emitGatt(){
        this.battCharacteristic.readValue()
        .then((buffer)=>
            this.emitData("batt", buffer)
        )
        this.awsCharacteristic.readValue()
        .then((buffer)=>
            this.emit("aws", buffer)
            
        )
        this.awaCharacteristic.readValue()
        .then((buffer)=>
            this.emit("awa", buffer)   
        )

    }

    initGATTConnection(){ 
        return new Promise((resolve,reject )=>{ this.device.connect().then(async ()=>{ 
            if (!this.gattServer) { 
                this.gattServer = await this.device.gatt() 
                this.battService = await this.gattServer.getPrimaryService("0000180f-0000-1000-8000-00805f9b34fb") 
                this.battCharacteristic = await this.battService.getCharacteristic("00002a19-0000-1000-8000-00805f9b34fb")
                this.envService = await this.gattServer.getPrimaryService("0000181a-0000-1000-8000-00805f9b34fb") 
                this.awsCharacteristic = await this.envService.getCharacteristic("00002a72-0000-1000-8000-00805f9b34fb") 
                this.awaCharacteristic = await this.envService.getCharacteristic("00002a73-0000-1000-8000-00805f9b34fb") } 
                resolve(this)
             }) .catch((e)=>{ reject(e.message) }) }) 
    }
    initGATTNotifications() { 
        Promise.resolve(this.battCharacteristic.startNotifications().then(()=>{    
            this.battCharacteristic.on('valuechanged', buffer => {
                this.emitData("batt",buffer)
            })
        }))
        Promise.resolve(this.awaCharacteristic.startNotifications().then(()=>{    
            this.awaCharacteristic.on('valuechanged', buffer => {
                this.emitData("awa", buffer)
            })
        }))
        Promise.resolve(this.awsCharacteristic.startNotifications().then(()=>{    
            this.awsCharacteristic.on('valuechanged', buffer => {
                this.emitData("aws", buffer)
            })
        }))
    }
  
    async stopListening(){
        super.stopListening()
        if (this.battCharacteristic  && await this.battCharacteristic.isNotifying()) {
            await this.battCharacteristic.stopNotifications()
            this.battCharacteristic=null
        }
        if (this.awaCharacteristic  && await this.awaCharacteristic.isNotifying()) {
            await this.awaCharacteristic.stopNotifications()
            this.awaCharacteristic=null
        }
        if (this.awsCharacteristic  && await this.awsCharacteristic.isNotifying()) {
            await this.awsCharacteristic.stopNotifications()
            this.awsCharacteristic=null
        }
        if (await this.device.isConnected()){
               await this.device.disconnect()
        }
    }
}
module.exports=UltrasonicWindMeter