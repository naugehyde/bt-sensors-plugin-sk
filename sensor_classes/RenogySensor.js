const BTSensor = require("../../BTSensor.js");
const VC = require('./RenogyConstants.js');
const crc16Modbus = require('./CRC')

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
    
    static async identify(device, mode){
        const regex = new RegExp(String.raw`${this.ALIAS_PREFIX}-[A-Fa-f0-9]{8}$`);
        const name = await this.getDeviceProp(device,"Name")
        if (!(name || name.match(regex))){
            return null
        }
        device.connect().then(async ()=>{
            this.debug(`${this.getName()} connected.`)
           
                const gattServer = await device.gatt()
                const gattService= await this.gattServer.getPrimaryService(this.TX_SERVICE)
                const writeChar = await this.gattService.getCharacteristic(this.WRITE_CHAR_UUID)
                await writeChar.writeValue(Buffer.from([0xFF,0xFF]), { offset: 0, type: 'request' })
            

        
        })

            var hasDataPacket=false
            device.helper.on("PropertiesChanged",
                 (props)=> {
                    if (Object.hasOwn(props,'ManufacturerData')){
                        md = props['ManufacturerData'].value
                        hasDataPacket=md[0x2e1].value[0]==0x10
                    }
            })        
            while (!hasDataPacket) {
                await sleep(500)
            }

        
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