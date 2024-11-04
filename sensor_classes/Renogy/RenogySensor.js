const BTSensor = require("../../BTSensor.js");
const VC = require('./RenogyConstants.js');
class RenogySensor extends BTSensor{

    static ALIAS_PREFIX = 'BT-TH'
    static TX_SERVICE = "0000ffd0-0000-1000-8000-00805f9b34fb"
    static RX_SERVICE = "0000fff0-0000-1000-8000-00805f9b34fb"  
    static NOTIFY_CHAR_UUID = "0000fff1-0000-1000-8000-00805f9b34fb"
    static WRITE_CHAR_UUID  = "0000ffd1-0000-1000-8000-00805f9b34fb"

    constructor(device,config,gattConfig){
        super(device,config,gattConfig)
    }
    
    static async identify(device){
       
        const regex = new RegExp(String.raw`${this.ALIAS_PREFIX}-[A-Fa-f0-9]{8}$`);
        const name = await this.getDeviceProp(device,"Name")
       
        if (!(name && name.trim().match(regex))){
            return null
        }
        return this
        
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

    async initGATTConnection() {
        await this.device.connect()
        this.debug(`${this.getName()} connected.`)

        this.gattServer = await this.device.gatt()
        this.txService= await this.gattServer.getPrimaryService(this.constructor.TX_SERVICE)
        this.rxService= await this.gattServer.getPrimaryService(this.constructor.RX_SERVICE)
        this.readChar = await this.rxService.getCharacteristic(this.constructor.NOTIFY_CHAR_UUID)
        this.writeChar = await this.txService.getCharacteristic(this.constructor.WRITE_CHAR_UUID)
        await this.readChar.startNotifications()

        return this
            
    }

}
module.exports=RenogySensor