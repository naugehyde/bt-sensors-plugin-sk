const  VC = require( './VictronConstants.js');
const Images = require('./VictronImages.js')

const BTSensor = require("../../BTSensor.js");
const crypto = require('node:crypto');
const VictronIdentifier = require('./VictronIdentifier.js');

  class VictronSensor extends BTSensor{
    static Domain = BTSensor.SensorDomains.electrical
    static ManufacturerID = 0x2e1
    constructor(device,config,gattConfig){
        super(device,config,gattConfig)
        
        if (device&&device.modelID)
            this.modelID=device.modelID        
    }

    
    static async getDataPacket(device, md, timeout=60000) {
        if (md && md[this.ManufacturerID]?.value[0]==0x10)
            return md[this.ManufacturerID].value

        device.helper._prepare()

        return new Promise((resolve, reject) => {
            const timeoutID = setTimeout(() => {
                device.helper.removeListeners()
                reject(new Error("Timeout waiting for Victron Manufacturer Data"))
            }, timeout);
            
            device.helper.on("PropertiesChanged",
            (props)=> {
                if (Object.hasOwn(props,'ManufacturerData')){
                    const md = props['ManufacturerData'].value
                    if(md[this.ManufacturerID].value[0]==0x10) {
                        device.helper.removeListeners()
                        clearTimeout(timeoutID);
                        resolve(md[this.ManufacturerID].value)
                    }
                }
            })        
        })
    }
    
    static async identify(device){

        var md = await this.getDeviceProp(device,'ManufacturerData')
        if (md==undefined || !Object.hasOwn(md,this.ManufacturerID)) 
            return null
        const data=await this.getDataPacket(device,md)
        if (data) {
            // from data, not md: getDataPacket() may have waited for a 0x10
            // record, in which case md still holds the one that caused the wait
            device.modelID=data.readUInt16LE(2)
            return VictronIdentifier.identify(data)
        } 
        return null
    }

    offReasonText(value){
        let reasons=[];
        VC.OffReasons.forEach((v,k)=>{
            if (k&value)
                reasons.push(v);
        })
        return reasons.join("|");
    }

    alarmReasonText(value){
        let reasons=[];
        VC.AlarmReason.forEach((v,k)=>{
            if (k&value)
                reasons.push(v);
        })
        return reasons.join("|");
    }
    emitAlarm(tag="alarm", alarm){
        if (alarm > 0) {
            this._activeAlarms = (this._activeAlarms || new Set())
            this._activeAlarms.add(tag)
            this.emit(
                 tag,
                { message:this.alarmReasonText(alarm),
                  alarm: `0x${alarm.toString(16).padStart(8,"0")}`,
                  alarmstate: 'alert'})
        }
        const path = this.notificationPathFor(tag)
        if (path) {
            if (alarm > 0)
                this.emitNotification(path, "alert", this.alarmReasonText(alarm))
            else if (this._activeAlarms?.has(tag)) {
                // Only clear if we actually sent an alarm this session; avoids
                // writing null to a notifications path that was never set,
                // which some SignalK UIs display as "undefined: undefined".
                this._activeAlarms.delete(tag)
                this.emitNotification(path, null)
            }
        }
    }

    getOperationMode(buff, offset=0){
        const code = buff.readUInt8(offset)
        if (code === 0xFF) return null
        return {code: code, message: VC.OperationMode.get(code)}
    }

    getChargerError(buff, offset=1){
        const code = buff.readUInt8(offset)
        if (code === 0xFF) return null
        return {code: code, message: VC.ChargerError.get(code)}
    }

   async init(){
        await super.init()
        this.addParameter(
            "encryptionKey",
            {
                title:"Encryption Key",
                isRequired: true
            }
        )
    }
    alarmReason(alarmValue){
        return VC.AlarmReason.get(alarmValue)
    }
    getModelName(){
        const mID = this.getModelID()
        const m = VC.MODEL_ID_MAP[mID]
        if(m) {
            if(typeof m == 'string' || m instanceof String ) {
                return m
            } else {
                return m.name
            }
        }
        return this.constructor.name+` (Model ID: ${mID==-1?"Unknown":mID})`
    }

    decrypt(data){
        if (!this.encryptionKey)
            throw new Error("Unable to decrypt: no encryption key set")

        const encMethod = 'aes-128-ctr';
        const iv = data.readUInt16LE(5); 
        const key = Buffer.from(this.encryptionKey,'hex')
        const ivBuffer = Buffer.alloc(16); // 128 bits = 16 bytes
        
        ivBuffer.writeUInt16LE(iv)
        
        var encData = Buffer.from([...data.slice(8)])
        
        const decipher = crypto.createDecipheriv(encMethod, key, ivBuffer)
        
        const decData=decipher.update(encData)

        return Buffer.from(decData)
        
    }
    getModelID(){
        // Victron devices emit several manufacturer-data records and only the
        // 0x10 one carries the model id. Without this check the first record
        // to arrive wins and a wrong id is cached for the session.
        if (!this.modelID ||this.modelID==-1){
            const md = this.getManufacturerData(this.constructor.ManufacturerID)
            if (md && md.length>3 && md[0]==0x10)
                this.modelID = md.readUInt16LE(2)
        }
        return this.modelID ?? -1
    }

    getName(){
        return `Victron ${this.getModelName()}`
    }
    // Byte 0 of the decrypted payload is device_state for all advertising device types.
    // 0xFF means "unavailable / powering off" per the Victron spec and should be discarded.
    // VictronBatteryMonitor overrides this because its byte 0 is the TTG low byte, not state.
    isDecryptedValid(decData){
        if (decData.length > 0 && decData[0] === 0xFF) {
            this.debug(`Discarding packet from ${this.getDisplayName()}: device state 0xFF (unavailable/powering off)`)
            return false
        }
        return true
    }

    propertiesChanged(props){
        super.propertiesChanged(props)
        if (this.usingGATT()) return
        if (!props.hasOwnProperty("ManufacturerData")) return
        try{
            const md = this.getManufacturerData(this.constructor.ManufacturerID)
            if (md && md.length >= 8 && md[0]==0x10){
                // Byte 7 is a plaintext copy of key[0]. Mismatch means wrong key or
                // corrupted packet — discard before decrypting.
                if (this.encryptionKey) {
                    const key = Buffer.from(this.encryptionKey, 'hex')
                    if (md[7] !== key[0]) {
                        this.debug(`Key mismatch for ${this.getDisplayName()}: check encryption key`)
                        this.emitKeyMismatchNotification()
                        return
                    }
                }
                // Clear key mismatch notification on successful packet
                this.clearKeyMismatchNotification()

                const iv = md.readUInt16LE(5)
                // Drop exact duplicates (BlueZ can deliver the same advertisement twice)
                if (this._lastIV !== undefined) {
                    const delta = (iv - this._lastIV + 0x10000) & 0xFFFF
                    if (delta === 0) return
                }
                this._lastIV = iv
                this.getModelID()   // latch while a 0x10 record is current
                const decData=this.decrypt(md)
                if (!this.isDecryptedValid(decData)) return
                this.emitValuesFrom(decData)
            }
        }
        catch (error) {
            throw new Error(`Unable to read data from ${ this.getDisplayName()}: ${error}` )
        }
    }

    initGATTConnection(){
        throw new Error( "GATT Connection unimplemented for "+this.getDisplayName())
    }

   getImage(){
        const m = VC.MODEL_ID_MAP[this.getModelID()]
        if (m && m.image)
            return m.image
        else
            return Images.generic
   }

   getTextDescription(){
    //return `<img src="https://www.victronenergy.com/_next/image?url=https%3A%2F%2Fwww.victronenergy.com%2Fupload%2Fproducts%2FSmartShunt%2520500_nw.png&w=1080&q=70"" height="150" align=”top” ></img>`


    return `To get the encryption key for your device, follow the instructions <a href=https://communityarchive.victronenergy.com/questions/187303/victron-bluetooth-advertising-protocol.html target="_victron_encrypt">here</a>`
   }

   prepareConfig(config){
        super.prepareConfig(config)
        config.params.modelID=this.getModelID()
        this.encryptionKey=config.params.encryptionKey
    }

    emitKeyMismatchNotification(){
        if (this._keyMismatchNotified) return
        this._keyMismatchNotified = true
        this.clearAllPaths()
        const path = `notifications.sensors.${this.macAndName()}`
        this.emitNotification(path, "alert", `Encryption key mismatch for ${this.getDisplayName()}: verify configuration`)
    }

    clearKeyMismatchNotification(){
        if (!this._keyMismatchNotified) return
        this._keyMismatchNotified = false
        const path = `notifications.sensors.${this.macAndName()}`
        this.emitNotification(path, null)
    }

    // Override super and only clear notification if key matches
    clearNoContact(){
        if (this._keyMismatchNotified) return
        super.clearNoContact()
    }

}
module.exports=VictronSensor