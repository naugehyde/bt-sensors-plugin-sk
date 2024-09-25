const { throws } = require("assert");
const BTSensor = require("../BTSensor");

const crypto = require('crypto');

const DEVICE_TYPES = new Map([
    [0x0C3C, { name: "Alarm Clock", model: "CGC1" }],
    [0x0576, { name: "3-in-1 Alarm Clock", model: "CGD1" }],
    [0x066F, { name: "Temperature/Humidity Sensor", model: "CGDK2" }],
    [0x0347, { name: "Temperature/Humidity Sensor", model: "CGG1" }],
    [0x0B48, { name: "Temperature/Humidity Sensor", model: "CGG1-ENCRYPTED" }],
    [0x03D6, { name: "Door/Window Sensor", model: "CGH1" }],
    [0x0A83, { name: "Motion/Light Sensor", model: "CGPR1" }],
    [0x03BC, { name: "Grow Care Garden", model: "GCLS002" }],
    [0x0098, { name: "Plant Sensor", model: "HHCCJCY01" }],
    [0x015D, { name: "Smart Flower Pot", model: "HHCCPOT002" }],
    [0x02DF, { name: "Formaldehyde Sensor", model: "JQJCY01YM" }],
    [0x0997, { name: "Smoke Detector", model: "JTYJGD03MI" }],
    [0x1568, { name: "Switch (single button)", model: "K9B-1BTN" }],
    [0x1569, { name: "Switch (double button)", model: "K9B-2BTN" }],
    [0x0DFD, { name: "Switch (triple button)", model: "K9B-3BTN" }],
    [0x1C10, { name: "Switch (single button)", model: "K9BB-1BTN" }],
    [0x1889, { name: "Door/Window Sensor", model: "MS1BB(MI)" }],
    [0x2AEB, { name: "Motion Sensor", model: "HS1BB(MI)" }],
    [0x3F0F, { name: "Flood and Rain Sensor", model: "RS1BB(MI)" }],
    [0x01AA, { name: "Temperature/Humidity Sensor", model: "LYWSDCGQ" }],
    [0x045B, { name: "Temperature/Humidity Sensor", model: "LYWSD02" }],
    [0x16E4, { name: "Temperature/Humidity Sensor", model: "LYWSD02MMC" }],
    [0x2542, { name: "Temperature/Humidity Sensor", model: "LYWSD02MMC" }],
    [0x055B, { name: "Temperature/Humidity Sensor", model: "LYWSD03MMC" }],
    [0x2832, { name: "Temperature/Humidity Sensor", model: "MJWSD05MMC" }],
    [0x098B, { name: "Door/Window Sensor", model: "MCCGQ02HL" }],
    [0x06D3, { name: "Alarm Clock", model: "MHO-C303" }],
    [0x0387, { name: "Temperature/Humidity Sensor", model: "MHO-C401" }],
    [0x07F6, { name: "Nightlight", model: "MJYD02YL" }],
    [0x04E9, { name: "Door Lock", model: "MJZNMSQ01YD" }],
    [0x00DB, { name: "Baby Thermometer", model: "MMC-T201-1" }],
    [0x0391, { name: "Body Thermometer", model: "MMC-W505" }],
    [0x03DD, { name: "Nightlight", model: "MUE4094RT" }],
    [0x0489, { name: "Smart Toothbrush", model: "M1S-T500" }],
    [0x0806, { name: "Smart Toothbrush", model: "T700" }],
    [0x1790, { name: "Smart Toothbrush", model: "T700" }],
    [0x0A8D, { name: "Motion Sensor", model: "RTCGQ02LM" }],
    [0x3531, { name: "Motion Sensor", model: "XMPIRO2SXS" }],
    [0x4C60, { name: "Motion Sensor", model: "XMPIRO2GSXS" }],
    [0x4683, { name: "Occupancy Sensor", model: "XMOSB01XS" }],
    [0x0863, { name: "Flood Detector", model: "SJWS01LM" }],
    [0x045C, { name: "Smart Kettle", model: "V-SK152" }],
    [0x040A, { name: "Mosquito Repellent", model: "WX08ZM" }],
    [0x04E1, { name: "Magic Cube", model: "XMMF01JQD" }],
    [0x1203, { name: "Thermometer", model: "XMWSDJ04MMC" }],
    [0x1949, { name: "Switch (double button)", model: "XMWXKG01YL" }],
    [0x2387, { name: "Button", model: "XMWXKG01LM" }],
    [0x098C, { name: "Door Lock", model: "XMZNMST02YD" }],
    [0x0784, { name: "Door Lock", model: "XMZNMS04LM" }],
    [0x0E39, { name: "Door Lock", model: "XMZNMS08LM" }],
    [0x07BF, { name: "Wireless Switch", model: "YLAI003" }],
    [0x38BB, { name: "Wireless Switch", model: "PTX_YK1_QMIMB" }],
    [0x0153, { name: "Remote Control", model: "YLYK01YL" }],
    [0x068E, { name: "Fan Remote Control", model: "YLYK01YL-FANCL" }],
    [0x04E6, { name: "Ventilator Fan Remote Control", model: "YLYK01YL-VENFAN" }],
    [0x03BF, { name: "Bathroom Heater Remote", model: "YLYB01YL-BHFRC" }],
    [0x03B6, { name: "Dimmer Switch", model: "YLKG07YL/YLKG08YL" }],
    [0x0083, { name: "Smart Kettle", model: "YM-K1501" }],
    [0x0113, { name: "Smart Kettle", model: "YM-K1501EU" }],
    [0x069E, { name: "Door Lock", model: "ZNMS16LM" }],
    [0x069F, { name: "Door Lock", model: "ZNMS17LM" }],
    [0x0380, { name: "Door Lock", model: "DSL-C08" }],
    [0x11C2, { name: "Door Lock", model: "Lockin-SV40" }],
    [0x0DE7, { name: "Odor Eliminator", model: "SU001-T" }]
  ]);

class XiaomiMiBeacon extends BTSensor{

    constructor(device,params){
        super(device,params)
        this.pollFreq = params?.pollFreq
        this.bindKey = params?.bindKey
    }
    static SERVICE_MIBEACON = "0000fe95-0000-1000-8000-00805f9b34fb"

    static async identify(device){
        try{
            const sd = await device.getProp('ServiceData')
            if (sd == null || sd.length==0) return null
            const keys = Object.keys(sd)
            if (keys[0]==this.SERVICE_MIBEACON) return this
        } catch (e){
            console.log(e)
            return null
        }
        return null
    }
    static {
        this.metadata = new Map(super.getMetadata())
        var  md = this.addMetadatum("pollFreq", "s", "polling frequency in seconds")
        md.isParam=true

        //3985f4ebc032f276cc316f1f6ecea085
        //8a1dadfa832fef54e9c1d190

        md = this.addMetadatum("bindKey", "", "bindkey for decryption")
        md.isParam=true
        this.addMetadatum('temp','K', 'temperature',
            (buff,offset)=>{return ((buff.readInt16LE(offset))/100) + 273.1})
        this.addMetadatum('humidity','ratio', 'humidity',
            (buff,offset)=>{return ((buff.readUInt8(offset))/100)})
        this.addMetadatum('voltage', 'V',  'sensor battery voltage',
            (buff,offset)=>{return ((buff.readUInt16LE(offset))/1000)})
       
    }

    #emitValues(buffer){
        this.emitData("temp", buffer, 0)
        this.emitData("humidity", buffer,2)
        this.emitData("voltage",buffer,3);
    }
    async #connect(){
        await this.device.connect()
        const gattServer = await this.device.gatt()
        const gattService = await gattServer.getPrimaryService("ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6")
        this.gattCharacteristic = await gattService.getCharacteristic("ebe0ccc1-7a0a-4b0c-8a1a-6ff2997da3a6")
    }
/*
 def _decrypt_mibeacon_legacy(
        self, data: bytes, i: int, xiaomi_mac: bytes
    ) -> bytes | None:
        """decrypt MiBeacon v2/v3 encrypted advertisements"""
        # check for minimum length of encrypted advertisement
        if len(data) < i + 7:
            _LOGGER.debug("Invalid data length (for decryption), adv: %s", data.hex())
            return None

        if not self.bindkey:
            self.bindkey_verified = False
            _LOGGER.debug("Encryption key not set and adv is encrypted")
            return None

        if len(self.bindkey) != 16:
            self.bindkey_verified = False
            _LOGGER.error("Encryption key should be 12 bytes (24 characters) long")
            return None

        nonce = b"".join([data[0:5], data[-4:-1], xiaomi_mac[::-1][:-1]])
        encrypted_payload = data[i:-4]
        # cryptography can't decrypt a message without authentication
        # so we have to use Cryptodome
        associated_data = b"\x11"
        cipher = AES.new(self.bindkey, AES.MODE_CCM, nonce=nonce, mac_len=4)
        cipher.update(associated_data)

        assert cipher is not None  # nosec
        # decrypt the data
        # note that V2/V3 encryption will often pass the decryption process with a
        # wrong encryption key, resulting in useless data, and we won't be able
        # to verify this, as V2/V3 encryption does not use a tag to verify
        # the decrypted data. This will be filtered as wrong data length
        # during the conversion of the payload to sensor data.
        try:
            decrypted_payload = cipher.decrypt(encrypted_payload)
        except ValueError as error:
            self.bindkey_verified = False
            _LOGGER.warning("Decryption failed: %s", error)
            _LOGGER.debug("nonce: %s", nonce.hex())
            _LOGGER.debug("encrypted payload: %s", encrypted_payload.hex())
            return None
        if decrypted_payload is None:
            self.bindkey_verified = False
            _LOGGER.warning(
                "Decryption failed for %s, decrypted payload is None",
                to_mac(xiaomi_mac),
            )
            return None
        self.bindkey_verified = True
        return decrypted_payload

*/
    decryptV2and3(data){
        const encryptedPayload = data.subarray(-4);
        const xiaomi_mac = data.subarray(5,11)
        const nonce = Buffer.concat([data.subarray(0, 5), data.subarray(-4,-1), xiaomi_mac.subarray(-1)]);
        const cipher = crypto.createDecipheriv('aes-128-ccm', Buffer.from(this.bindKey,"hex"), nonce, { authTagLength: 4});
        cipher.setAAD(Buffer.from('11', 'hex'), { plaintextLength: encryptedPayload.length });
        
        return cipher.update(encryptedPayload)
    }
    decryptV4and5(data){
        const encryptedPayload = data.subarray(11,-7);
        const xiaomi_mac = data.subarray(5,11)
        const nonce = Buffer.concat([xiaomi_mac, data.subarray(2, 5), data.subarray(-7,-4)]);
        const cipher = crypto.createDecipheriv('aes-128-ccm', Buffer.from(this.bindKey,"hex"), nonce, { authTagLength: 4});
        cipher.setAAD(Buffer.from('11', 'hex'), { plaintextLength: encryptedPayload.length });
        cipher.setAuthTag(data.subarray(-4))    
        return cipher.update(encryptedPayload)
    }

    async #connectEncrypted(){
        this.cb=async()=>{
            if (!this.isEncrypted)
                throw new Error(`${this.getName()} is unencrypted.`)

            const data = await this.device.getProp("ServiceData")
            var dec
            if (this.encryptionVersion >= 4) {
                dec = this.decryptV4and5(data[this.constructor.SERVICE_MIBEACON].value)
            } else {
                if(this.encryptionVersion>=2){
                    dec=this.decryptV2and3(data)
                }
            }

            switch(dec[0]){
            case 0x04:    
                console.log("temp")
                this.emit("temp",(dec.readInt16LE(3)/10)+273.15)  
                break        
            case 0x06:
                console.log("humidity")
                this.emit("humidity",(dec.readInt16LE(3)/10))          
                break
            default:
                console.log("wait wha?"+ dec[0])
            }
        }
        await this.cb()
        this.device.helper.on("PropertiesChanged",async (props)=>{
            await this.cb()
        })
    }
    async init(){
        super.init()
        const sd = await this.device.getProp('ServiceData')
        if (!sd) throw Error("Unable to get Service data")
        const data = sd[this.constructor.SERVICE_MIBEACON].value
        const frameControl = data[0] + (data[1] << 8)
        this.deviceID = data[2] + (data[3] << 8)
        this.isEncrypted = (frameControl >> 3) & 1
        this.encryptionVersion = frameControl >> 12 
    }   

    getName(){
        const dt = DEVICE_TYPES.get(this.deviceID)
        return `Xiaomi ${dt.name} ${dt.model}`
    }
   
    #setupEmission(){
   
        if (this.pollFreq){
            this.device.disconnect().then(()=>{
                this.intervalID = setInterval( async () => {            
                    try{
                        await this.#connect()
                        const buffer = await this.gattCharacteristic.readValue()
                        this.#emitValues(buffer)
                    }
                    catch{(error)
                        throw new Error(`unable to get values for device LYWSD03MMC:${error.message}`)
                    }
                    try { await this.device.disconnect() }
                    catch{(error)
                        console.log("Error disconnecting from LYWSD03MMC: "+error.message)
                    }
                    }, this.pollFreq*1000)
                })
            }
        else {
           this.gattCharacteristic.startNotifications().then(()=>{    
                this.gattCharacteristic.on('valuechanged', buffer => {
                    this.#emitValues(buffer)
                })
            })
        }
    }
    async connect() {
        if (this.bindKey)
            this.#connectEncrypted()
        else{
            await this.#connect()
            this.gattCharacteristic.readValue().then((buffer)=>{
                this.#emitValues(buffer)
                this.#setupEmission()
            })
        }
        return this
    }
    async #disconnectGattCharacteristic(){
        if (this.gattCharacteristic  && await this.gattCharacteristic.isNotifying()) {
            await this.gattCharacteristic.stopNotifications()
            this.gattCharacteristic=null
        }
    }
    async disconnect(){
        super.disconnect()
        await this.#disconnectGattCharacteristic()
        if (this.cb){
            this.device.helper.removeListener("PropertiesChanged",this.cb)
        }
        if (this.intervalID){
            clearInterval(this.intervalID)
        }
        if (await this.device.isConnected()){
               await this.device.disconnect()
        }
    }
}
module.exports=XiaomiMiBeacon