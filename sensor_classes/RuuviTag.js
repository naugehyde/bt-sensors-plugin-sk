const BTSensor = require("../BTSensor");
class RuuviTag extends BTSensor{
    static manufacturerID = 0x0499
    static async identify(device){
        try{
            if (await this.getManufacturerID(device)==this.manufacturerID)
                return this
        } catch (e){
            console.log(e)
            return null
        }
        return null
    }    
        
    async init(){
        await super.init()
        const md = this.valueIfVariant(this.getManufacturerData(this.constructor.manufacturerID))
        this.mode = md[0]
        if (this['_initModeV'+this.mode])
            this['_initModeV'+this.mode]()
        else    
            throw new Error("Unrecognized Ruuvitag data mode "+md[0])
    } 

/**
 * https://github.com/ruuvi/ruuvi-sensor-protocols/blob/master/dataformat_05.md
 * 
 * Offset	Allowed values	Description
0	5	Data format (8bit)
1-2	-32767 ... 32767	Temperature in 0.005 degrees
3-4	0 ... 40 000	Humidity (16bit unsigned) in 0.0025% (0-163.83% range, though realistically 0-100%)
5-6	0 ... 65534	Pressure (16bit unsigned) in 1 Pa units, with offset of -50 000 Pa
7-8	-32767 ... 32767	Acceleration-X (Most Significant Byte first)
9-10	-32767 ... 32767	Acceleration-Y (Most Significant Byte first)
11-12	-32767 ... 32767	Acceleration-Z (Most Significant Byte first)
13-14	0 ... 2046, 0 ... 30	Power info (11+5bit unsigned), first 11 bits is the battery voltage above 1.6V, in millivolts (1.6V to 3.646V range). Last 5 bits unsigned are the TX power above -40dBm, in 2dBm steps. (-40dBm to +20dBm range)
15	0 ... 254	Movement counter (8 bit unsigned), incremented by motion detection interrupts from accelerometer
16-17	0 ... 65534	Measurement sequence number (16 bit unsigned), each time a measurement is taken, this is incremented by one, used for measurement de-duplication. Depending on the transmit interval, multiple packets with the same measurements can be sent, and there may be measurements that never were sent.
18-23	Any valid mac	48bit MAC address.
 **/
    _initModeV5(){
        this.addMetadatum("temp","K","temperature in Kelvin", 
            (buffer)=>{ return parseFloat((273.15+buffer.readInt16BE(1)*.005).toFixed(3))}
        )
        this.addMetadatum("humidity","ratio","humidity", 
            (buffer)=>{ return parseFloat(((buffer.readUInt16BE(3)*.0025)/100).toFixed(2))}
        )
        this.addMetadatum("pressure","Pa","atmospheric pressure", 
            (buffer)=>{ return buffer.readUInt16BE(5)+50000}
        )
        this.addMetadatum("accX","Mg","acceleration on X-axis", 
            (buffer)=>{ return buffer.readInt16BE(7)}
        )
        this.addMetadatum("accY","Mg","acceleration on Y-axis", 
            (buffer)=>{ return buffer.readInt16BE(9)}
        )
        this.addMetadatum("accZ","Mg","acceleration on Z-axis", 
            (buffer)=>{ return buffer.readInt16BE(11)}
        )
        this.addMetadatum("battV","V","battery voltage", 
            (buffer)=>{ return 1.6+(buffer.readUInt16BE(13)>>5)/1000}
        )
        this.addMetadatum("mc","","movement counter", 
            (buffer)=>{ return buffer.readUInt16BE(13) && 0x1F}
        )
        this.addMetadatum("msc","","measurement sequence counter", 
            (buffer)=>{ return buffer.readUInt16BE(15)}
        )
        
    }

    /**
 * https://github.com/ruuvi/ruuvi-sensor-protocols/blob/master/dataformat_03.md
 * 
 
Offset	Allowed values	Description
0	3	Data format definition (3 = current sensor readings)
1	0 ... 200	Humidity (one lsb is 0.5%, e.g. 128 is 64%) Values above 100% indicate a fault in sensor.
2	-127 ... 127, signed	Temperature (MSB is sign, next 7 bits are decimal value)
3	0 ... 99	Temperature (fraction, 1/100.)
4 - 5	0 ... 65535	Pressure (Most Significant Byte first, value - 50kPa)
6-7	-32767 ... 32767, signed	Acceleration-X (Most Significant Byte first)
8 - 9	-32767 ... 32767, signed	Acceleration-Y (Most Significant Byte first)
10 - 11	-32767 ... 32767, signed	Acceleration-Z (Most Significant Byte first)
12 - 13	0 ... 65535	Battery voltage (millivolts). MSB First
 **/

    _initModeV3(){
        this.addMetadatum("humidity","ratio","humidity", 
            (buffer)=>{ return (buffer.readUInt(1)*.5)/100}
        )
        this.addMetadatum("temp","K","temperature in Kelvin", 
            (buffer)=>{ return (buffer.readInt(2)+(buffer.readInt(3)/100))+273.15}
        )
        this.addMetadatum("pressure","Pa","atmospheric pressure", 
            (buffer)=>{ return buffer.readUInt16BE(4)+50000}
        )
        this.addMetadatum("accX","Mg","acceleration on X-axis", 
            (buffer)=>{ return buffer.readInt16BE(6)}
        )
        this.addMetadatum("accY","Mg","acceleration on Y-axis", 
            (buffer)=>{ return buffer.readInt16BE(8)}
        )
        this.addMetadatum("accZ","Mg","acceleration on Z-axis", 
            (buffer)=>{ return buffer.readInt16BE(10)}
        )
        this.addMetadatum("battV","V","battery voltage", 
            (buffer)=>{ return buffer.readUInt16BE(12)/1000}
        )        
    }
    propertiesChanged(props){
        super.propertiesChanged(props)
        if (props.ManufacturerData)
            this.emitValuesFrom( this.getManufacturerData(this.constructor.manufacturerID) )
    }
}
module.exports=RuuviTag