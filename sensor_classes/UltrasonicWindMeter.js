const BTSensor = require("../BTSensor");
class UltrasonicWindMeter extends BTSensor{
    static Domain = BTSensor.SensorDomains.environmental
		
    static async identify(device){
        
        const uuids = await this.getDeviceProp(device,'UUIDs')
        const name = await this.getDeviceProp(device,"Name")
        if (name == 'ULTRASONIC')
            return this 
        else
            return null
    }
    static ImageFile="Ultrasonic.jpg"
    static Manufacturer="Calypso Instruments EMEA, S.L."
    
    hasGATT(){
        return true
    }
    usingGATT(){
        return true
    }
    emitGATT(){
        this.battCharacteristic.readValue()
        .then((buffer)=>
            this.emitData("batt", buffer)
        )
        this.awsCharacteristic.readValue()
        .then((buffer)=>
            this.emitData("aws", buffer)  
        )
        this.awaCharacteristic.readValue()
        .then((buffer)=>
            this.emitData("awa", buffer)   
        )

    }
     initSchema(){
        super.initSchema()
        this.getGATTParams()["useGATT"].default=true
        this.addDefaultPath("batt",'sensors.batteryStrength')
            .read=(buffer)=>{return (buffer.readUInt8())/100}

        this.addMetadatum("awa","rad","Apparent Wind Angle",
            (buffer)=>{return ((buffer.readInt16LE())/100)*(Math.PI/180)}
        )
        .default='environment.wind.angleApparent'

        this.addMetadatum("aws","m/s","Apparent Wind Speed",
        (buffer)=>{return (buffer.readInt16LE()/100)*.514444} //convert knots to m/s
        )
        .default='environment.wind.speedApparent'
    }

    async initGATTConnection(isReconnecting){ 
        await super.initGATTConnection(isReconnecting)
        const gattServer = await this.getGATTServer() 
        const battService = await gattServer.getPrimaryService("0000180f-0000-1000-8000-00805f9b34fb") 
        this.battCharacteristic = await battService.getCharacteristic("00002a19-0000-1000-8000-00805f9b34fb")
        const envService = await gattServer.getPrimaryService("0000181a-0000-1000-8000-00805f9b34fb") 
        this.awsCharacteristic = await envService.getCharacteristic("00002a72-0000-1000-8000-00805f9b34fb") 
        this.awaCharacteristic = await envService.getCharacteristic("00002a73-0000-1000-8000-00805f9b34fb") 
    }
    async initGATTNotifications() { 
        await this.battCharacteristic.startNotifications()
        this.battCharacteristic.on('valuechanged', buffer => {
            this.emitData("batt",buffer)
        })
    
        await this.awaCharacteristic.startNotifications()
        this.awaCharacteristic.on('valuechanged', buffer => {
                this.emitData("awa", buffer)
        })
        await this.awsCharacteristic.startNotifications()
        this.awsCharacteristic.on('valuechanged', buffer => {
                this.emitData("aws", buffer)
        })
}
  
    async deactivateGATT(){
        await this.stopGATTNotifications(this.battCharacteristic)
        await this.stopGATTNotifications(this.awaCharacteristic)
        await this.stopGATTNotifications(this.awsCharacteristic)
        await super.deactivateGATT()
    }
}
module.exports=UltrasonicWindMeter