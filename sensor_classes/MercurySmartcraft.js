/*
Service UUID	Characteristic UUID	Type	Param	Convertion	Unit	SignalK Path	Comment
00000000-0000-1000-8000-ec55f9f5b963 (Unknown)	00000001-0000-1000-8000-ec55f9f5b963	write / indicate	SDP	-	-	-	Enable or disable data stream. To enable write 0x0D 0x01; To disable write 0x0D 0x00.
00000100-0000-1000-8000-ec55f9f5b963 (L2CAP)	00000101-0000-1000-8000-ec55f9f5b963	read	?	-	-	?	Returns: Value: 1.1.0 (raw: 312e312e30)
00000100-0000-1000-8000-ec55f9f5b963 (L2CAP)	00000102-0000-1000-8000-ec55f9f5b963	write / notify	ENGINE_RPM_UUID	value / 60	Hz	propulsion.p0.revolutions	
00000100-0000-1000-8000-ec55f9f5b963 (L2CAP)	00000103-0000-1000-8000-ec55f9f5b963	write / notify	COOLANT_TEMPERATURE_UUID	value + 273.15	Kelvin	propulsion.p0.temperature	
00000100-0000-1000-8000-ec55f9f5b963 (L2CAP)	00000104-0000-1000-8000-ec55f9f5b963	write / notify	BATTERY_VOLTAGE_UUID	value / 1000	Volts	propulsion.p0.alternatorVoltage	
00000100-0000-1000-8000-ec55f9f5b963 (L2CAP)	00000105-0000-1000-8000-ec55f9f5b963	write / notify	UNK_105_UUID	?	?	?	Need longer data to figure out what is it. Value around 17384.
00000100-0000-1000-8000-ec55f9f5b963 (L2CAP)	00000106-0000-1000-8000-ec55f9f5b963	write / notify	ENGINE_RUNTIME_UUID	value * 60	Seconds	propulsion.p0.runTime	
00000100-0000-1000-8000-ec55f9f5b963 (L2CAP)	00000107-0000-1000-8000-ec55f9f5b963	write / notify	CURRENT_FUEL_FLOW_UUID	value / 100000	m3 / hour	propulsion.p0.fuel.rate	
00000100-0000-1000-8000-ec55f9f5b963 (L2CAP)	00000108-0000-1000-8000-ec55f9f5b963	write / notify	FUEL_TANK_PCT_UUID	value / 100	%	propulsion.p0.fuel.tank	Maybe there is a more appropriate name for the Signalk path
00000100-0000-1000-8000-ec55f9f5b963 (L2CAP)	00000109-0000-1000-8000-ec55f9f5b963	write / notify	UNK_109_UUID	?	?	?	Need longer data to figure out what is it. Raw data varied from 102701 to 102700.
00000100-0000-1000-8000-ec55f9f5b963 (L2CAP)	0000010a-0000-1000-8000-ec55f9f5b963	write / notify	OIL_PRESSURE_UUID	value / 100	kPascal	propulsion.p0.oilPressure	
00000100-0000-1000-8000-ec55f9f5b963 (L2CAP)	0000010b-0000-1000-8000-ec55f9f5b963	write / notify	UNK_10B_UUID	?	?	?	Always zero. To investigate with more data.
*/
const BTSensor = require("../BTSensor");
class MercurySmartcraft extends BTSensor{
    static Domain = BTSensor.SensorDomains.propulsion
	
    static async identify(device){
        
        const name = await this.getDeviceProp(device,"Name")
        const address = await this.getDeviceProp(device,"Address")
        if (name == `VVM_${address.replace(":","")}`)
            return this 
        else
            return null
    }

    

    hasGATT(){
        return false
    }
    usingGATT(){
        return true
    }
    emitGATT(){
    }
    initSchema(){
        const bo = 0

        super.initSchema()
        this.addParameter(
            "id",
            {
                "title": "Engine ID",
                "examples": ["port","starboard","p0","p1"]
            }
        )
        _schema.properties.params.required=["id"]

        this.addMetadatum("rpm","Hz","engine revolutions per sec", 
            (buffer)=>{return buffer.readUInt16LE(bo)/60}
        ).default='propulsion.{id}.revolutions'

        this.addMetadatum("coolant","K","temperature of engine coolant in K", 
            (buffer)=>{return buffer.readUInt16LE(bo)+273.15}
        ).default='propulsion.{id}.coolantTemperature'

        this.addMetadatum("alternatorVoltage","V","voltage of alternator", 
            (buffer)=>{return buffer.readUInt16LE(bo)/1000}
        ).default='propulsion.{id}.alternatorVoltage'

        this.addMetadatum("runtime","s","Total running time for engine (Engine Hours in seconds)", 
            (buffer)=>{return buffer.readUInt16LE(bo)*60}
        ).default='propulsion.{id}.runTime'

        this.addMetadatum("rate","m3/s","Fuel rate  of consumption (cubic meters per second)", 
            (buffer)=>{return buffer.readUInt16LE(bo)/10000}
        ).default='propulsion.{id}.fuel.rate'
            
        this.addMetadatum("pressure","Pa","Fuel pressure", 
            (buffer)=>{return buffer.readUInt16LE(bo)/100}
        ).default='propulsion.{id}.pressure'

        this.addMetadatum("level","ratio","Level of fluid in tank 0-100%", 
            (buffer)=>{return buffer.readUInt16LE(bo)/100}
        ).default='tanks.petrol.currentLevel'
    }

    initGATTConnection(){ 
        return new Promise((resolve,reject )=>{ this.deviceConnect().then(async ()=>{ 
            if (!this.gattServer) { 
                this.gattServer = await this.device.gatt() 
                this.sdpService = await this.gattServer.getPrimaryService("00000000-0000-1000-8000-ec55f9f5b963") 
                this.sdpCharacteristic = await this.sdpService.getCharacteristic("00000001-0000-1000-8000-ec55f9f5b963") 
                this.dataService = await this.gattServer.getPrimaryService("00000100-0000-1000-8000-ec55f9f5b963") 
                this.dataCharacteristics = {
                    rpm: await this.dataService.getCharacteristic("00000102-0000-1000-8000-ec55f9f5b963"),
                    coolant: await this.dataService.getCharacteristic("00000103-0000-1000-8000-ec55f9f5b963"),
                    alternatorVoltage: await this.dataService.getCharacteristic("00000104-0000-1000-8000-ec55f9f5b963"),
                    runtime: await this.dataService.getCharacteristic("00000106-0000-1000-8000-ec55f9f5b963"),
                    rate: await this.dataService.getCharacteristic("00000107-0000-1000-8000-ec55f9f5b963"),
                    level: await this.dataService.getCharacteristic("00000108-0000-1000-8000-ec55f9f5b963"),
                    pressure: await this.dataService.getCharacteristic("0000010a-0000-1000-8000-ec55f9f5b963")
                }
            } 
                resolve(this)
             }) .catch((e)=>{ reject(e.message) }) }) 
    }
    async initGATTNotifications() { 
        await this.sdpCharacteristic.writeDataWithoutResponse(Buffer.from([0x0D,0x01]))
        for (const c in this.dataCharacteristics){
            Promise.resolve(this.dataCharacteristics[c].startNotifications().then(()=>{    
                this.dataCharacteristics[c].on('valuechanged', buffer => {
                    this.emitData(c,buffer)
                })
            }))
        }
    }
  
    async stopListening(){
        super.stopListening()
        for (const c in this.dataCharacteristics){
            if (this.dataCharacteristics[c] && await this.dataCharacteristics[char].isNotifying()) {
                await this.dataCharacteristics[c].stopNotifications()
            }
        }

        if (await this.device.isConnected()){
            await this.device.disconnect()
        }
    }
}
module.exports=MercurySmartcraft