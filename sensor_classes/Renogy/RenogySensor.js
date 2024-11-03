const BTSensor = require("../../BTSensor.js");
const VC = require('./RenogyConstants.js');
const RenogyRoverClient = require('../RenogyRoverClient.js')
const crc16Modbus = require('./CRC.js')

function sleep(x) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(x);
      }, x);
    });
  }
class RenogySensor extends BTSensor{

    static ALIAS_PREFIX = 'BT-TH'
    static TX_SERVICE = "0000ffd0-0000-1000-8000-00805f9b34fb"
    static RX_SERVICE = "0000fff0-0000-1000-8000-00805f9b34fb"  
    static NOTIFY_CHAR_UUID = "0000fff1-0000-1000-8000-00805f9b34fb"
    static WRITE_CHAR_UUID  = "0000ffd1-0000-1000-8000-00805f9b34fb"

    constructor(device,config,gattConfig){
        super(device,config,gattConfig)
    }
    
    static async getModelID(device){
        const regex = new RegExp(String.raw`${this.ALIAS_PREFIX}-[A-Fa-f0-9]{8}$`);
        const name = await this.getDeviceProp(device,"Name")
       
        if (!(name && name.trim().match(regex))){
            return null
        }
        //const p = await this.getDeviceProps(device)
        await device.connect()
           //error new Uint8Array([255, 3, 16, 0, 100, 0, 135, 0, 0, 20, 22, 0, 0, 0, 0, 86, 82, 52, 48, 109, 165])
           //new Uint8Array([255, 3, 16, 32, 32, 82, 78, 71, 45, 67, 84, 82, 76, 45, 82, 86, 82, 52, 48, 55, 36])
           const gattServer = await device.gatt()
                const txService= await gattServer.getPrimaryService(this.TX_SERVICE)
                const rxService= await gattServer.getPrimaryService(this.RX_SERVICE)
                const readChar = await rxService.getCharacteristic(this.NOTIFY_CHAR_UUID)
                const writeChar = await txService.getCharacteristic(this.WRITE_CHAR_UUID)

                //RoverClient
                var b = Buffer.from([0xFF,0x03,0x0,0xc,0x0,0x8])
                var crc = crc16Modbus(b)
            
                await writeChar.writeValue(
                    Buffer.concat([b,Buffer.from([crc.h,crc.l])], b.length+2), 
                    { offset: 0, type: 'request' })
                await readChar.startNotifications()
                readChar.on('valuechanged', buffer => {
                    debugger
                    if (buffer[5]==0x0) return null
                    return buffer.subarray(5,17).toString()
                    
                })
             
                return null
    }

    async init(){
        await super.init()
    }
    
    getModelName(){
        return "" //return VC?.MODEL_ID_MAP[this.model_id]??this.constructor.name+" (Model ID:"+this.model_id+")"
    }

    getName(){
        return `Renogy ${this.getModelName()}`
    }
    propertiesChanged(props){
        super.propertiesChanged(props)
    }

    initGATTConnection(){
        throw new Error( "GATT Connection unimplemented for "+this.getDisplayName())
    }

   

}
module.exports=RenogySensor