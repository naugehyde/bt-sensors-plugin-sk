/*
  PACKET = Struct(
        # Device state (docs do not explain how to interpret)
        "device_state" / Int8ul,
        # VE.Bus error (docs do not explain how to interpret)
        "vebus_error" / Int8ul,
        # Battery charging Current reading in 0.1A increments
        "battery_current" / Int16sl,
        # Battery voltage reading in 0.01V increments (14 bits)
        # Active AC in state (enum) (2 bits)
        "battery_voltage_and_ac_in_state" / Int16ul,
        # Active AC in power in 1W increments (19 bits, signed)
        # AC out power in 1W increments (19 bits, signed)
        # Alarm (enum but docs say "to be defined") (2 bits)
        "ac_in_and_ac_out_power" / Bytes(5),
        # Battery temperature in 1 degree celcius increments (7 bits)
        # Battery state of charge in 1% increments (7 bits)
        "battery_temperature_and_soc" / Bytes(2),
        GreedyBytes,
    )

    def parse_decrypted(self, decrypted: bytes) -> dict:
        pkt = self.PACKET.parse(decrypted)

        battery_voltage = pkt.battery_voltage_and_ac_in_state & 0x3FFF

        ac_in_state = pkt.battery_voltage_and_ac_in_state >> 14

        ac_in_bytes = int.from_bytes(pkt.ac_in_and_ac_out_power[0:3], "little")
        ac_in_power = ac_in_bytes & 0x03FFFF
        if ac_in_bytes & 0x40000:
            ac_in_power *= -1

        ac_out_bytes = int.from_bytes(pkt.ac_in_and_ac_out_power[2:5], "little") >> 2
        ac_out_power = (ac_out_bytes >> 1) & 0x07FFFF
        if ac_out_bytes & 0b1:
            ac_out_power *= -1

        # per extra-manufacturer-data-2022-12-14.pdf, the actual temp is 40 degrees less
        battery_temperature = (pkt.battery_temperature_and_soc[0] & 0x46) - 40

        # confusingly, soc is split across the byte boundary
        soc = ((pkt.battery_temperature_and_soc[1] & 0x3F) << 1) + (
            pkt.battery_temperature_and_soc[0] >> 7
        )

        return {
            "device_state": OperationMode(pkt.device_state),
            "battery_voltage": battery_voltage / 100,
            "battery_current": pkt.battery_current / 10,
            "ac_in_state": ACInState(ac_in_state),
            "ac_in_power": ac_in_power,
            "ac_out_power": ac_out_power,
            "battery_temperature": battery_temperature,
            "soc": soc if soc < 127 else None,
        }
*/

const VictronDevice = require ("./Victron/VictronDevice.js") 
const VC = require("./Victron/VictronConstants.js")
const int24 = require('int24')

class VictronVEBus extends VictronDevice{

    static async identify(device){
        return await this.identifyMode(device, 0x0C)
    }   

    static {
        this.metadata = new Map(super.getMetadata())

        this.addMetadatum('chargeState','', 'charge state', 
                        (buff)=>{return VC.OperationMode.get(buff.readUInt8(0))})
 
        this.addMetadatum('veBusError','', 'VE bus error',
            (buff)=>{return buff.readUInt8(1)})
        this.addMetadatum('current','A','charger battery current', 
            (buff)=>{return buff.readInt16LE(2)/10})
        this.addMetadatum('voltage','V', 'charger battery voltage',
            (buff)=>{return buff.readInt16LE(4) & 0x3FFF})
        
        this.addMetadatum('acInState','', 'AC in state',
            (buff)=>{return readInt16LE(4)>>14})
        this.addMetadatum('acInPower','W','AC power IN in watts',  (buff)=>{

            var raw = int24.readInt24LE(buff,6)
            if (raw & 0x40000)
                return (raw & 0x03FFFF) * -1
            else
                return raw & 0x03FFFF
        })
        this.addMetadatum('acOutPower','W','AC power OUT in watts',  (buff)=>{
            var raw = int24.readInt24LE(buff,8)
            if (raw & 0b1)
                return ((raw >> 1) & 0x07FFFF) * -1
            else
                return ((raw >> 1) & 0x07FFFF)
        })

        this.addMetadatum('batteryTemperature','K', 'battery temperature', 
            (buff)=>{return ((buff.readInt8(11) & 0x46) - 40)+273.15})    
        

        //        soc = ((pkt.battery_temperature_and_soc[1] & 0x3F) << 1) + (
        // pkt.battery_temperature_and_soc[0] >> 7)
        this.addMetadatum('soc', 'ratio', 'state of charge',
            (buff)=>{
                raw = buff.subarray(11,13)

                return (((raw[1] & 0x3F)<<1)+
                (raw[0]>>7))/100
            }
        )
    }
}
module.exports=VictronVEBus