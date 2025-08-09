
class VictronIdentifier{
    static identify( md ){
        if (md.length>=5 && md[0]==0x10){
            switch (md[4]) {
                case 0x1: return require("../VictronSolarCharger")
                case 0x2: return require("../VictronBatteryMonitor")
                case 0x3: return require("../VictronInverter")
                case 0x4: return require("../VictronDCDCConverter")
                case 0x5: return require("../VictronSmartLithium")
                case 0x6: return require("../VictronInverterRS")
                case 0x7: return require("../VictronGXDevice")
                case 0x8: return require("../VictronACCharger")
                case 0x9: return require("../VictronSmartBatteryProtect")
                case 0xA: return require("../VictronLynxSmartBMS")
                case 0xC: return require("../VictronVEBus")
                case 0xD: return require("../VictronDCEnergyMeter");
                case 0xF: return require("../VictronOrionXS")
                default: return null
            }
        }
    }
}
module.exports=VictronIdentifier