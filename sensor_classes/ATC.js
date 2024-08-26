const BTSensor = require("../BTSensor");

class ATC extends BTSensor{

    constructor(device){
        super(device)
    }

    connect() {
        const cb = async (propertiesChanged) => {
            this.device.getServiceData().then((data)=>{             
                //TBD Check if the service ID is universal across ATC variants
                const buff=data['0000181a-0000-1000-8000-00805f9b34fb'];
                this.eventEmitter.emit("temp",((buff.readInt16LE(6))/100) + 273.1);
                this.eventEmitter.emit("humidity",buff.readUInt16LE(8)/10000);
                this.eventEmitter.emit("voltage",buff.readUInt16LE(10)/1000);
            })
        }
        cb();
        this.device.helper.on('PropertiesChanged', cb)
    }
}
module.exports=ATC