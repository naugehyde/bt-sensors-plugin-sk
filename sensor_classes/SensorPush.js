const BTSensor = require("../BTSensor");
class SensorPush extends BTSensor{
    static Domain = BTSensor.SensorDomains.environmental
        
    static async identify(device){
        
        const name = await this.getDeviceProp(device,"Name")
        const regex= /^SensorPush\s(HT|HTP)\s[0-9a-fA-F]{4}$/
        if (name && name.match(regex))
            return this 
        else
            return null
    }
    static ImageFile="SensorPush.webp"
    static Manufacturer="Cousins & Sears - Creative Technologists - Brooklyn, NY USA"
    static ServiceUUID = "EF090000-11D6-42BA-93B8-9DD7EC090AB0"
    static Characteristics = 
        {
            tx:   "EF090003-11D6-42BA-93B8-9DD7EC090AA9",
            adv:  "EF090005-11D6-42BA-93B8-9DD7EC090AA9",
            batt: "EF090007-11D6-42BA-93B8-9DD7EC090AA9",
            LED:  "EF09000C-11D6-42BA-93B8-9DD7EC090AA9",
            temp: "EF090080-11D6-42BA-93B8-9DD7EC090AA9",
            hum:  "EF090081-11D6-42BA-93B8-9DD7EC090AA9",
            bar:  "EF090082-11D6-42BA-93B8-9DD7EC090AA9"
        }
    hasGATT(){
        return true
    }
    usingGATT(){
        return true
    }
    
    async emitGATT(){
        this.emitData("temp", await this.characteristics.temp.readValue())
        this.emitData("humidity", await this.characteristics.hum.readValue())
        this.emitData("batt", await this.characteristics.batt.readValue())
        this.emitData("pressure", await this.characteristics.bar.readValue())
    }

     initSchema(){
        super.initSchema()
        this.getGATTParams()["useGATT"].default=true
        this.getGATTParams()["pollFreq"].default=30
        this._schema.properties.gattParams.required.push("pollFreq")
        
        this.addDefaultParam("zone")

        this.addParameter(
        "tx",
            {
                title:'transmission strength in db',
                type: 'number',
                enum: [-21, -18, -15, -12, -9, -6, -3, 0, 1, 2, 3, 4, 5],
                default: -3,
                isRequired: true
            }
        )
        this.addParameter(
        "adv",
            {
                title:'advertising interval in ms',
                type: 'number',
                default: 1285,
                minimum: Math.round((32*625)/1000),
                maximum: Math.round((32767*625)/1000),
                isRequired: true
            }
      )

       this.addParameter(
        "LED",
            {
                type: 'number',
                title:'LED flashes per second (0=off, 1-127, 128=once every second',
                default: 0,
                minimum: 0,
                maximum: 128,
                isRequired: true
            }
      )

        this.addDefaultPath("batt","sensors.batteryVoltage")
        .read=(buffer)=>{ return buffer.readUInt16LE()/1000}

        this.addDefaultPath("temp","environment.temperature") 
        .read=(buffer)=>{ return buffer.readInt32LE()/100}
       
        this.addDefaultPath("humidity","environment.humidity") 
        .read=(buffer)=>{ return buffer.readInt32LE()/10000}

        this.addDefaultPath("pressure","environment.pressure") 
        .read=(buffer)=>{ return buffer.readInt32LE()/100}

    }

    
    async initGATTConnection(isReconnecting){ 
        async function writeUInt8(characteristic, val ){
            const buffer = Buffer.alloc(1)
            buffer.writeUInt8(val)
            characteristic.writeValueWithoutResponse(buffer)
        }

        async function writeInt8(characteristic, val ){
            const buffer = Buffer.alloc(1)
            buffer.writeInt8(val)
            characteristic.writeValueWithoutResponse(buffer)
        }
        async function writeUInt16LE(characteristic, val ){
            const buffer = Buffer.alloc(2)
            buffer.writeUInt16LE(val)
            characteristic.writeValueWithoutResponse(buffer)
        }

        await super.initGATTConnection(isReconnecting)
        const gattServer = await this.getGATTServer() 
        const service = await gattServer.getPrimaryService(this.constructor.ServiceUUID.toLowerCase()) 
        this.characteristics={}
        for (const c in this.constructor.Characteristics) {
            this.characteristics[c] = await service.getCharacteristic(this.constructor.Characteristics[c].toLowerCase())
        }
        if (this.tx) 
            await writeInt8(this.characteristics.tx,this.tx)
        if (this.LED) 
            await writeUInt8(this.characteristics.LED,this.LED)
        if (this.adv) 
            await writeUInt16LE(this.characteristics.adv,Math.round((this.adv/625)*1000))
    }
    async initGATTNotifications() { 

    } 
}
module.exports=SensorPush