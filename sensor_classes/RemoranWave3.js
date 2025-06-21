
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
    serviceUUID = "81D08DF0-C0F8-422A-9D9D-E4379BB1EA3B"
    info1CharUUID = "62C91222-FAFE-4F6E-95F0-AFC02BD19F2E"
    info2CharUUID = "f5d12d34-4390-486c-b906-24ea8906af71"
    eventUuid =  "f12a8e25-59f7-42f2-b7ae-ba96fb25c13c"

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
            app.debug(`Bad buffer size ${buffer.length}. Buffer size must be 20 bytes or more.`)
            return
        }
        emitData("versionNumber", buffer.readUInt8(0))
        const errors = buffer.readUInt8(2)
        const errorState = []
        for (var i = 0; i < 8; ++i) {
            var c = 1 << i;
            r & c && errorState.push(errors[i])
        }
        emitData("errors", errorState)
        emitData("state",  states[buffer.readUInt8(3)])
        emitData("rpm", buffer.readUInt32LE(4))
        emitData( "voltage" , buffer.readFloatLE(8))
        emitData("current",  buffer.readFloatLE(12))
        emitData( "power", buffer.readFloatLE(16))
                
        if (buffer.length > 23) {
            emitData( "temp", buffer.readFloatLE(20).toFixed(1))
            emitData( "uptime", buffer.readUInt32(24))
            if (versionNumber>1 && buffer.size > 31) {
                emitData("energy", buffer.readFloatLE(32).toFixed(1))
            }
        }
    
    }
    emitInfo2Data(buffer){
        if (buffer.size < 12) {
            app.debug(`Bad buffer size ${buffer.length}. Buffer size must be 12 bytes or more.`)
            return
         }
        emitData("versionNumber", buffer.getUint8(0))
        emitData("temp",  buffer.readFloat32LE(4))
        emitData("uptime", buffer.readUInt32(8))
        emitData("lastBootTime", arduinoDateDecode(buffer.getUInt32LE(12)))
        emitData("energy",   buffer.readFloat32LE(16))
    }
    emitEventData(buffer){
        if (buffer.size < 14) {
            app.debug(`Bad buffer size ${buffer.length}. Buffer size must be 14 bytes or more.`)
            return
         }
        this.emitData("event", 
            {
                firstDate: arduinoDateDecode(buffer.readUInt32LE(0)),
                lastDate: arduinoDateDecode(buffer.readUInt32LE(4)),
                eventType: buffer.readUInt16LE(8),
                count: buffer.readUInt16LE(10),
                index: buffer.readUInt16LE(12),
                eventDesc: eventTypes[i]
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
                 this.info2Characteristic = await this.service.getPrimaryService(this.info2CharUUID) 
                 this.eventCharacteristic = await this.service.getCharacteristic(this.eventUUID)
                 resolve(this)
            }}) .catch((e)=>{ reject(e.message) }) }) 
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
        await stopNotifations(this.info1Characteristic)
        await stopNotifations(this.info2Characteristic)
        await stopNotifations(this.eventCharacteristic)
        if (await this.device.isConnected()){
            await this.device.disconnect()
        }
     }
 }
 module.exports=RemoranWave3
 