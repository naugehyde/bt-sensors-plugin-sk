const Mixin = require('../../Mixin')
 class Eddystone extends Mixin  {
    static ServiceUUID= "0000feaa-0000-1000-8000-00805f9b34fb"

    initSchema(){

        this.addMetadatum("eddystone.voltage","v","sensor voltage as reported by Eddystone protocol",
            (array)=>{ return array.readUInt16BE(2)/1000}
        )
            .default="sensors.{macAndName}.eddystone.voltage"

        this.addMetadatum("eddystone.temperature","K","sensor temperature as reported by Eddystone protocol",
            (array)=>{ return 273.15+(array.readInt16BE(5)/1000)} 
        )
            .examples=["sensors.{macAndName}.eddystone.temperature"]

        this.addMetadatum("eddystone.advertCount","","number of advertisements sent by device",
            (array)=>{ return array.readUIntBE(7,3) }
        )
            .examples=["sensors.{macAndName}.eddystone.advertisements"]

        this.addMetadatum("eddystone.timePowered","s","times since powered up (in seconds)",
            (array)=>{ return array.readUIntBE(11,3)/10 }
        )
            .examples=["sensors.{macAndName}.eddystone.timePowered"]

        this.addMetadatum("eddystone.url","","Eddystone URL",
            (array)=>{ return array.toString('utf8',3) }
        )
            .examples=["sensors.{macAndName}.eddystone.url"]

        this.addMetadatum("eddystone.txPower","db","signal strength at one meter (db)",
            (array)=>{ return array.readInt8(1) }
        )
            .default="sensors.{macAndName}.eddystone.txPower"

        if (this._paths["eddystone.txPower"])
            this._eddystoneTxPowerPath=this.preparePath(this._paths["eddystone.txPower"])

    }

    propertiesChanged(props){
        if (Object.hasOwn(props,"ServiceData")) {
            const sd = this.valueIfVariant(props.ServiceData)[Eddystone.Eddystone_ServiceUUID]

            if (sd) {
                const buff=sd.value;
                if (buff && buff.length>0 && buff[0]==0x20) {

                    this.emitData("eddystone.voltage", buff)
                    this.emitData("eddystone.temperature",buff)
                    this.emitData("eddystone.advertCount",buff)
                    this.emitData("eddystone.timePowered",buff)
                } else
                
                if (buff && buff.length>0 && buff[0]==0x10) {
                this.emitData("eddystone.url", buff)
                this.emitData("eddystone.txPower", buff)
                }
            }
        }

    }
}
module.exports=Eddystone