const BTSensor = require("../BTSensor");

class BankManager extends BTSensor{

    static Domain = BTSensor.SensorDomains.electrical
    static async  identify(device){

        const name = await this.getDeviceProp(device,"Name")
        const regex = /^BankManager*[0-9]{2}/
 
        if (name && name.match(regex))  
            return this
        else
            return null
        
    }
    initSchema(){
        super.initSchema()

        this.addDefaultParam("id")
            .default="bankManager"

        this.addMetadatum('liVoltage','V','Lithium Voltage')
            .default="electrical.batteries.{id}.voltage.lithium"
        this.addMetadatum('pbVoltage','V','Lead Voltage')
            .default="electrical.batteries.{id}.voltage.lead"
        this.addMetadatum('current','A','total current')
            .default="electrical.batteries.{id}.current"
        this.addMetadatum('soc','ratio','state of charge')
            .default="electrical.batteries.{id}.soc"
        this.addMetadatum('connectionStatus','','Connection Status')
            .default="electrical.batteries.{id}.connectionStatus"

    }

    getManufacturer(){
        return "Bank Manager"
    }
    hasGATT(){
        return true
    }
    usingGATT(){
        return true
    }
    emitDataFrom(buffer){
        let data=buffer.toString().split(",")
        this.emit("liVoltage", parseFloat(data[1]))
        this.emit("pbVoltage", parseFloat(data[2]))
        this.emit("current", parseFloat(data[3])) 
        this.emit("soc", parseFloat(data[4])/100) 
        this.emit("connectionStatus", data[5]) 

    }
    emitGATT(){
    
    }


    initGATTConnection(){ 
        return new Promise((resolve,reject )=>{ this.deviceConnect().then(async ()=>{ 
            if (!this.gattServer) { 
                this.gattServer = await this.device.gatt() 
                this.service = await this.gattServer.getPrimaryService("0000ffe0-0000-1000-8000-00805f9b34fb") 
                this.characteristic = await this.service.getCharacteristic("0000ffe1-0000-1000-8000-00805f9b34fb")
             } 
            resolve(this)
             }) .catch((e)=>{ reject(e.message) }) }) 
    }

    initGATTNotifications() { 
        Promise.resolve(this.characteristic.startNotifications().then(()=>{   
            let data = null 
            this.characteristic.on('valuechanged', buffer => {
                if (buffer.length>0 && buffer[0]==0x23) {
                    data = Buffer.from(buffer)
                } else if (data && buffer.indexOf(0x0d0a)!==-1) {
                    data=Buffer.concat([data,buffer.subarray(0,buffer.indexOf(0x0d0a)-1)], data.length+buffer.indexOf(0x0d0a)-1)
                    this.emitDataFrom(data)
                    data=null
                }
            })
        }))
       
    }
  
    async stopListening(){
        super.stopListening()
        if (this.characteristic  && await this.characteristic.isNotifying()) {
            await this.characteristic.stopNotifications()
        }
        if (await this.device.isConnected()){
            await this.device.disconnect()
        }
    }                  
}
module.exports=BankManager