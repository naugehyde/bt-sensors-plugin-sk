const BTSensor = require("../BTSensor");
class UNKNOWN extends BTSensor{

    constructor(device, params){
        super(device, params)
    }


    static identify(device){
        return null
    }
    getMetadata() { 
        return new Map()
    }
    async getName(){
        return "Unknown device"
    }
    async connect() {
        return this
    }
}
module.exports=UNKNOWN