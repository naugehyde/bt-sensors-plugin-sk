const BTSensor = require("../BTSensor");
class UNKNOWN extends BTSensor{

    constructor(device, params){
        super(device, params)
    }
    static identify(device){
        return null
    }
    getName(){
        return "Unknown device"
    }

    async connect() {
        return super.connect()
    }
     disconnect() {
        return super.disconnect()
    }
}
module.exports=UNKNOWN