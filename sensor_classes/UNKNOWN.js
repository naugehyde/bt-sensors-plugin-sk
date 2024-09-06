const BTSensor = require("../BTSensor");
class UNKNOWN extends BTSensor{

    constructor(device){
        super(device)
    }


    static identify(device){
        return null
    }
    getMetadata() { 
        return new Map()
    }
    connect() {
    }
}
module.exports=UNKNOWN