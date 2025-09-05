
function arduinoDateDecode (elapsedSeconds) {
    const date = new Date("2000-01-01")
    date.setTime(date.getTime() + 1000 * elapsedSeconds)
    return date
}
const errors=  {
                0: "Undefined",
                1: "Invalid Battery",
                2: "Overheat",
                3: "Overheat Shutdown",
                4: "Generator lead 1 disconnected",
                5: "Generator lead 2 disconnected",
                6: "Generator lead 3 disconnected",
                7: "Short Circuit"
        }

const eventTypes = {
            0: "Reboot",
            1: "Invalid Battery",
            2: "Overheat",
            3: "Overheat Shutdown",
            4: "Generator lead 1 disconnected",
            5: "Generator lead 2 disconnected",
            6: "Generator lead 3 disconnected",
            7: "Short Circuit",
            255: "Debug"
        }

const states= ["Charging Needed", "Charging", "Floating", "Idle"]


const BTSensor = require("../BTSensor");
 class RemoranWave3 extends BTSensor{
    static Domain = BTSensor.SensorDomains.electrical
    static ImageFile = "RemoranWave3.jpeg"
    serviceUUID = "81d08df0-c0f8-422a-9d9d-e4379bb1ea3b"
    info1CharUUID = "62c91222-fafe-4f6e-95f0-afc02bd19f2e"
    info2CharUUID = "f5d12d34-4390-486c-b906-24ea8906af71"
    eventUUID =  "f12a8e25-59f7-42f2-b7ae-ba96fb25c13c"


     static async identify(device){
         
         const name = await this.getDeviceProp(device,"Name")
         if (name == 'Remoran Wave.3')
             return this 
         else
             return null
     }
     hasGATT(){
         return true
     }
     usingGATT(){
         return true
     }
    emitInfo1Data(buffer){
        if (buffer.length < 20) {
            this.debug(`Bad buffer size ${buffer.length}. Buffer size must be 20 bytes or more.`)
            return
        }
        this.emit("versionNumber", buffer.readUInt8(0))
        const errors = buffer.readUInt8(2)
        const errorState = []
        for (var i = 0; i < 8; ++i) {
            var c = 1 << i;
            errors & c && errorState.push(errors[i])
        }
        this.emit("errors", errorState)
        this.emit("state",  states[buffer.readUInt8(3)])
        this.emit("rpm", buffer.readUInt32LE(4))
        this.emit( "voltage" , buffer.readFloatLE(8))
        this.emit("current",  buffer.readFloatLE(12))
        this.emit( "power", buffer.readFloatLE(16))
                
        if (buffer.length > 23) {
            this.emit( "temp", ((buffer.readFloatLE(20))+273.15))
            this.emit( "uptime", buffer.readUInt32LE(24))
            if (versionNumber>1 && buffer.size > 31) {
                this.emit("energy", buffer.readFloatLE(32))
            }
        }
    
    }
    emitInfo2Data(buffer){

        if (buffer.size < 12) {
            this.setError(`Bad buffer size ${buffer.length}. Buffer size must be 12 bytes or more.`)
            return
         }
        this.emit("versionNumber", buffer.readUInt8(0))
        this.emit("temp",  ((buffer.readFloatLE(4))+273.15))
        this.emit("uptime", buffer.readUInt32LE(8))
        this.emit("lastBootTime", arduinoDateDecode(buffer.readUInt32LE(12)))
        this.emit("energy",   buffer.readFloatLE(16))
    }
    emitEventData(buffer){
        if (buffer.length < 14) {
            this.debug(`Bad buffer size ${buffer.length}. Buffer size must be 14 bytes or more.`)
            return
         }
        const eventType = buffer.readUInt16LE(8)
        var eventDesc = eventType.toString()
        if (Object.hasOwn(eventTypes,eventType))
            eventDesc = eventTypes[eventType]


        this.emit("event", 
            {
                firstDate: arduinoDateDecode(buffer.readUInt32LE(0)),
                lastDate: arduinoDateDecode(buffer.readUInt32LE(4)),
                eventType: eventType,
                count: buffer.readUInt16LE(10),
                index: buffer.readUInt16LE(12),
                eventDesc: eventDesc
            }
        )
    }
    emitGATT(){
        this.info1Characteristic.readValue()
        .then((buffer)=>
            this.emitInfo1Data( buffer)
        )
        this.info2Characteristic.readValue()
        .then((buffer)=>
            this.emitInfo2Data(buffer)  
        )
        this.eventCharacteristic.readValue()
        .then((buffer)=>
            this.emitEventData(buffer)   
        )

    }
     initSchema(){
        super.initSchema()
        this.addDefaultParam("id")
            .default="RemoranWave3"         
    
        this.getGATTParams()["useGATT"].default=true

        this.addMetadatum('errorCodes','', 'charger error codes (array)')
            .default= "electrical.chargers.{id}.errorCodes"

        this.addMetadatum('state','', 'charger state')
            .default= "electrical.chargers.{id}.state"

        this.addMetadatum('voltage','V', 'battery voltage')
        .default= "electrical.chargers.{id}.battery.voltage"

        this.addMetadatum('current','A', 'battery current')
        .default= "electrical.chargers.{id}.battery.current"

        this.addMetadatum('power','W', 'battery power')
        .default= "electrical.chargers.{id}.battery.power"

        this.addMetadatum('temp', 'K', 'charger temperature')
        .default= "electrical.chargers.{id}.temperature"

        this.addMetadatum('energy', 'wh', 'energy created today in Wh')
        .default= "electrical.chargers.{id}.energy"

        this.addMetadatum('event', '', 'charger event')
        .default= "electrical.chargers.{id}.event"

        this.addMetadatum('lastBootTime', 's', 'last boot time')
        .default= "electrical.chargers.{id}.lastBootTime"

        this.addMetadatum('rpm', '', 'revolutions per minute')
        .default= "sensors.{macAndName}.rpm"

        this.addMetadatum('uptime', 's', 'charger/sensor uptime')
        .default= "sensors.{macAndName}.uptime"

        this.addMetadatum('versionNumber', '', 'charger/sensor version number')
        .default= "sensors.{macAndName}.version"

    }

 
     initGATTConnection(){ 
         return new Promise((resolve,reject )=>{ this.deviceConnect().then(async ()=>{ 
             if (!this.gattServer) { 
                 this.gattServer = await this.device.gatt() 
                 this.service = await this.gattServer.getPrimaryService(this.serviceUUID) 
                 this.info1Characteristic = await this.service.getCharacteristic(this.info1CharUUID)
                 this.info2Characteristic = await this.service.getCharacteristic(this.info2CharUUID) 
                 this.eventCharacteristic = await this.service.getCharacteristic(this.eventUUID)
                 resolve(this)
            }}) .catch((e)=>{ this.debug(e); reject(e.message) }) }) 
     }
     
     initGATTNotifications() { 
         Promise.resolve(this.info1Characteristic.startNotifications().then(()=>{    
             this.info1Characteristic.on('valuechanged', buffer => {
                 this.emitInfo1Data(buffer)
             })
         }))
         Promise.resolve(this.info2Characteristic.startNotifications().then(()=>{    
             this.info2Characteristic.on('valuechanged', buffer => {
                 this.emitInfo2Data(buffer)
             })
         }))
         Promise.resolve(this.eventCharacteristic.startNotifications().then(()=>{    
             this.eventCharacteristic.on('valuechanged', buffer => {
                 this.emitEventData(buffer)
             })
         }))
     }
    
    async stopNotifications(characteristic){
        if (characteristic  && await characteristic.isNotifying()) {
                await characteristic.stopNotifications()
        }
    }
     async stopListening(){
        super.stopListening()
        await this.stopNotifications(this?.info1Characteristic)
        await this.stopNotifications(this?.info2Characteristic)
        await this.stopNotifications(this?.eventCharacteristic)
        if (await this.device.isConnected()){
            await this.device.disconnect()
        }
     }
 }
 module.exports=RemoranWave3
 