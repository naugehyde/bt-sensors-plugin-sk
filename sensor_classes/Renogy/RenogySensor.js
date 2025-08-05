/*
ported from https://github.com/cyrils/renogy-bt
*/
const BTSensor = require("../../BTSensor.js");
const VC = require('./RenogyConstants.js');
const crc16Modbus = require('./CRC.js')
class RenogySensor extends BTSensor{
    static Domain=BTSensor.SensorDomains.electrical
    static ALIAS_PREFIX = 'BT-TH'
    static TX_SERVICE = "0000ffd0-0000-1000-8000-00805f9b34fb"
    static RX_SERVICE = "0000fff0-0000-1000-8000-00805f9b34fb"  
    static NOTIFY_CHAR_UUID = "0000fff1-0000-1000-8000-00805f9b34fb"
    static WRITE_CHAR_UUID  = "0000ffd1-0000-1000-8000-00805f9b34fb"
    static READ_FUNC = 3
    static WRITE_FUNC = 6
    static Manufacturer = "Renogy USA"
    constructor(device,config,gattConfig){
        super(device,config,gattConfig)
    }
    static async getReadWriteCharacteristics(device){
        const gattServer = await device.gatt()
        const txService= await gattServer.getPrimaryService(this.TX_SERVICE)
        const rxService= await gattServer.getPrimaryService(this.RX_SERVICE)
        const rxChar = await rxService.getCharacteristic(this.NOTIFY_CHAR_UUID)
        const txChar = await txService.getCharacteristic(this.WRITE_CHAR_UUID)
        return {read: rxChar, write: txChar}
    }

    static async sendReadFunctionRequest(writeCharacteristic, deviceID, writeReq, words){
        var b = Buffer.alloc(8)
        b.writeUInt8(deviceID,0)
        b.writeUInt8(this.READ_FUNC,1)
        b.writeUInt16BE(writeReq,2)
        b.writeUInt16BE(words,4) 
        b.writeUInt16BE(crc16Modbus(b.subarray(0,6)),6)          
        
        await writeCharacteristic.writeValueWithResponse(b,  0)
    
    }
    static identify(device){
        return null
    }

    async initSchema(){
        await super.initSchema()
       
        this.addParameter(
            "deviceID",
            {
                title: 'ID of device'
            }
        ) 
    }

    getModelName(){
        return this?.modelID??`${this.constructor.name} Unknown model` 
    }

    getName(){
        return `Renogy ${this.getModelName()}`
    }
    propertiesChanged(props){
        super.propertiesChanged(props)
    }

    getAllEmitterFunctions(){
        return []
    }

    getDeviceID()
    {
        return this?.deviceID??0xFF
    }

    async sendReadFunctionRequest(writeReq, words){
        this.constructor.sendReadFunctionRequest(
            this.writeChar, this.getDeviceID(), writeReq, words) 
    }

    initGATTInterval(){
        this.intervalID = setInterval(()=>{
            this.emitGATT()
        }, 1000*(this?.pollFreq??60) )
    }
    emitGATT(){
         this.getAllEmitterFunctions().forEach(async (emitter)=>
            await emitter()
        )
    }
    
    async initGATTNotifications(){
 
    }

    async initGATTConnection() {   
        await this.deviceConnect()      
        const rw = await this.constructor.getReadWriteCharacteristics(this.device)

        this.readChar = rw.read    
        this.writeChar = rw.write
        await this.readChar.startNotifications()
     
    }

    usingGATT(){
        return true
    }
    hasGATT(){
        return true
    }

    async stopListening(){
        super.stopListening()
    
        if (this.readChar)
            await this.readChar.stopNotifications()
        
        if (await this.device.isConnected()){
            await this.device.disconnect()
            this.debug(`Disconnected from ${ this.getName()}`)
        }
    }

}
module.exports=RenogySensor