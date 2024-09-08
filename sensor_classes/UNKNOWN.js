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
    async connect() {
        return this
    }
}
module.exports=UNKNOWN