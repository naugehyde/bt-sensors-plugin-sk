

class MopekaDevice{
    
    constructor (ID, name, lengthOfAd = 10){
        this.ID=ID
        this.name=name
        this.lengthOfAd=lengthOfAd
    }
}
    
const MopekaDevices = new Map()

MopekaDevices.set()
    .set (0x0, new MopekaDevice("XXXX","Unknown Mopeka device"))
    .set (0x3, new MopekaDevice("M1017", "Pro Check"))
    .set (0x4, new MopekaDevice("Pro-200", "Pro-200"))
    .set (0x5, new MopekaDevice("Pro H20", "Pro Check H2O"))
    .set (0x6, new MopekaDevice("M1017", "Lippert BottleCheck"))
    .set (0x8, new MopekaDevice("M1015", "Pro Plus"))
    .set (0x9, new MopekaDevice("M1015", "Pro Plus with Cellular"))
    .set (0xA, new MopekaDevice("TD40/TD200", "TD40/TD200"))
    .set (0xB, new MopekaDevice("TD40/TD200", "TD40/TD200 with Cellular"))
    .set (0xC, new MopekaDevice("M1017", "Pro Check Universal"))

    const Media={
        PROPANE: {coefficients: [0.573045, -0.002822, -0.00000535]},
        AIR: {coefficients: [0.153096, 0.000327, -0.000000294]},
        FRESH_WATER: {coefficients: [0.600592, 0.003124, -0.00001368]},
        WASTE_WATER: {coefficients: [0.600592, 0.003124, -0.00001368]},
        LIVE_WELL: {coefficients: [0.600592, 0.003124, -0.00001368]},
        BLACK_WATER: {coefficients: [0.600592, 0.003124, -0.00001368]},
        RAW_WATER: {coefficients: [0.600592, 0.003124, -0.00001368]},
        GASOLINE: {coefficients: [0.7373417462, -0.001978229885, 0.00000202162]},
        DIESEL: {coefficients: [0.7373417462, -0.001978229885, 0.00000202162]},
        LNG: {coefficients: [0.7373417462, -0.001978229885, 0.00000202162]},
        OIL: {coefficients: [0.7373417462, -0.001978229885, 0.00000202162]},
        HYDRAULIC_OIL: {coefficients: [0.7373417462, -0.001978229885, 0.00000202162]}
    }
    
    
const BTSensor = require("../BTSensor");
class MopekaTankSensor extends BTSensor{
    static Domain = BTSensor.SensorDomains.tanks
    static batteryStrengthTag="battStrength"

    static serviceID = "0000fee5-0000-1000-8000-00805f9b34fb"
    static serviceID16 = 0xFEE5

    static manufacturerID = 0x0059
    static Manufacturer = "Mopeka Products LLC"

    static ImageFile="MopekaTankSensor.jpg"
    static async identify(device){
        if (await this.getManufacturerID(device)==this.manufacturerID ){
            const uuids = await this.getDeviceProp(device, 'UUIDs')
            if (uuids && uuids.length>0 && uuids.includes(this.serviceID)) 
                return this
            else
                return null
        } else
            return null
    }    
        
    async init(){
        await super.init()
        const md = this.getManufacturerData(this.constructor.manufacturerID)
        this.modelID = md?md[0]:0
    } 

    getMedium(){
        return Media[this?.medium??'PROPANE']
    }
    getTankHeight(){
        return this?.tankHeight??304.8 //Assume a foot
    }

    _tankLevel( rawLevel ){
        const coefs= this.getMedium().coefficients
        return rawLevel * (coefs[0] + (coefs[1] * (this.temp-233.15)) + (coefs[2] * ((this.temp-233.15)^2)))
    }
    
    initSchema(){
        super.initSchema()
        this.addParameter("medium",
            {
                title:"type of liquid in tank",
                enum: Object.keys(Media),
                isRequired: true
            }
        )
        this.addParameter("tankHeight",
            {
                title:"height of tank (in mm)",
                type:"number",
                unit:"mm",
                isRequired: true
            }
        )
        this.addDefaultParam("id", true)

        this.addDefaultPath("battVolt","sensors.batteryVoltage") 
            .read=((buffer)=>{ 
                this.battVolt = (buffer.readUInt8(1)/32) 
                return this.battVolt
            }).bind(this)
        
        this.addDefaultPath("battStrength", "sensors.batteryStrength") 
            .read=(buffer)=>{ return Math.max(0, Math.min(1, (((this.battVolt) - 2.2) / 0.65))) }
        
        this.addMetadatum("temp","K","temperature", 
            ((buffer)=>{ 
                this.temp = parseFloat(((buffer.readUInt8(2)&0x7F)+233.15).toFixed(2))
                return this.temp
            })
        )
        .default="tanks.{id}.temperature"
        this.addMetadatum("tankLevel","ratio","tank level", 
            (buffer)=>{ return (this._tankLevel(((buffer.readUInt16LE(3))&0x3FFF)))/this.getTankHeight()}
        )
        .default="tanks.{id}.currentLevel"

        this.addMetadatum("readingQuality","","quality of read", 
            (buffer)=>{ return buffer.readUInt8(4)>>6}
        )
        .default="sensors.{macAndName}.readingQuality"

        this.addMetadatum("accX","Mg","acceleration on X-axis", 
            (buffer)=>{ return buffer.readUInt8(8)}
        )
        .examples=["sensors.{macAndName}.accelerationXAxis"]

        this.addMetadatum("accY","Mg","acceleration on Y-axis", 
            (buffer)=>{ return buffer.readUInt8(9)}
        )        
        .examples=["sensors.{macAndName}.accelerationYAxis"]
    }

    propertiesChanged(props){
        super.propertiesChanged(props)
        if (props.ManufacturerData)
            this.emitValuesFrom( this.getManufacturerData(this.constructor.manufacturerID) )
    }

    getName(){
        if (this.name)
            return this.name

        const _name = MopekaDevices.get(this?.modelID??0x0).name
        return _name?_name:MopekaDevices.get(0x0).name
        
    }
}
module.exports=MopekaTankSensor