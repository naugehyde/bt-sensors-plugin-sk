const BTSensor = require("../BTSensor");
class UltrasonicWindMeter extends BTSensor{
    static async identify(device){
        try{
            const uuids = await this.getDeviceProp(device,'UUIDs')
            const name = await this.getDeviceProp(device,"Name")
            if (name == 'ULTRASONIC'){
                return this
            }
        } catch (e){
            this.debug(e)
            return null
        }
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
        if (!this?.gattWarningDelivered) {
            this.debug(this.GATTwarning.toUpperCase())
            this.gattWarningDelivered=true
        }
        return new Promise((resolve,reject )=>{
            this.device.connect().then(async ()=>{
                if (!this.gattServer) {
                    this.gattServer = await this.device.gatt()
                    this.battService = await this.gattServer.getPrimaryService("180F")
                    this.battCharacteristic = await this.gattService.getCharacteristic("2A19")

                    this.envService = await this.gattServer.getPrimaryService("181A")
                    this.awsCharacteristic = await this.gattService.getCharacteristic("2A72")
                    this.awaCharacteristic = await this.gattService.getCharacteristic("2A73")
                }
                resolve(this)
            })
            .catch((e)=>{
                reject(e.message)
            })
        })
    }

    async init(){
        await super.init()
        this.addMetadatum("batt","","Battery strength",
            (buffer)=>{return buffer.readUInt8()})
        this.addMetadatum("awa","","Apparent Wind Angle",
            (buffer)=>{return buffer.readInt16LE()}
        )
        this.addMetadatum("aws","","Apparent Wind Speed",
        (buffer)=>{return buffer.readInt16LE()}
        )
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