/*
"""Parser for Gmopeka_iot BLE advertisements.

Thanks to https://github.com/spbrogan/mopeka_pro_check for
help decoding the advertisements.

MIT License applies.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from bluetooth_data_tools import short_address
from bluetooth_sensor_state_data import BluetoothData
from home_assistant_bluetooth import BluetoothServiceInfo
from sensor_state_data import (
    BinarySensorDeviceClass,
    SensorDeviceClass,
    SensorLibrary,
    Units,
)

from .models import MediumType

_LOGGER = logging.getLogger(__name__)


# converting sensor value to height
MOPEKA_TANK_LEVEL_COEFFICIENTS = {
    MediumType.PROPANE: (0.573045, -0.002822, -0.00000535),
    MediumType.AIR: (0.153096, 0.000327, -0.000000294),
    MediumType.FRESH_WATER: (0.600592, 0.003124, -0.00001368),
    MediumType.WASTE_WATER: (0.600592, 0.003124, -0.00001368),
    MediumType.LIVE_WELL: (0.600592, 0.003124, -0.00001368),
    MediumType.BLACK_WATER: (0.600592, 0.003124, -0.00001368),
    MediumType.RAW_WATER: (0.600592, 0.003124, -0.00001368),
    MediumType.GASOLINE: (0.7373417462, -0.001978229885, 0.00000202162),
    MediumType.DIESEL: (0.7373417462, -0.001978229885, 0.00000202162),
    MediumType.LNG: (0.7373417462, -0.001978229885, 0.00000202162),
    MediumType.OIL: (0.7373417462, -0.001978229885, 0.00000202162),
    MediumType.HYDRAULIC_OIL: (0.7373417462, -0.001978229885, 0.00000202162),
}

MOPEKA_MANUFACTURER = 89
MOKPEKA_PRO_SERVICE_UUID = "0000fee5-0000-1000-8000-00805f9b34fb"


@dataclass
class MopekaDevice:
    model: str
    name: str
    adv_length: int


DEVICE_TYPES = {
    0x3: MopekaDevice("M1017", "Pro Check", 10),
    0x4: MopekaDevice("Pro-200", "Pro-200", 10),
    0x5: MopekaDevice("Pro H20", "Pro Check H2O", 10),
    0x6: MopekaDevice("M1017", "Lippert BottleCheck", 10),
    0x8: MopekaDevice("M1015", "Pro Plus", 10),
    0x9: MopekaDevice("M1015", "Pro Plus with Cellular", 10),
    0xA: MopekaDevice("TD40/TD200", "TD40/TD200", 10),
    0xB: MopekaDevice("TD40/TD200", "TD40/TD200 with Cellular", 10),
    0xC: MopekaDevice("M1017", "Pro Check Universal", 10),
}


def hex(data: bytes) -> str:
    """Return a string object containing two hexadecimal digits for each byte in the instance."""
    return "b'{}'".format("".join(f"\\x{b:02x}" for b in data))  # noqa: E231


def battery_to_voltage(battery: int) -> float:
    """Convert battery value to voltage"""
    return battery / 32.0


def battery_to_percentage(battery: int) -> float:
    """Convert battery value to percentage."""
    return round(max(0, min(100, (((battery / 32.0) - 2.2) / 0.65) * 100)), 1)


def temp_to_celsius(temp: int) -> int:
    """Convert temperature value to celsius."""
    return temp - 40


def tank_level_to_mm(tank_level: int) -> int:
    """Convert tank level value to mm."""
    return tank_level * 10


def tank_level_and_temp_to_mm(
    tank_level: int, temp: int, medium: MediumType = MediumType.PROPANE
) -> int:
    """Get the tank level in mm for a given fluid type."""
    coefs = MOPEKA_TANK_LEVEL_COEFFICIENTS[medium]
    return int(tank_level * (coefs[0] + (coefs[1] * temp) + (coefs[2] * (temp**2))))


class MopekaIOTBluetoothDeviceData(BluetoothData):
    """Data for Mopeka IOT BLE sensors."""

    def __init__(self, medium_type: MediumType = MediumType.PROPANE) -> None:
        super().__init__()
        self._medium_type = medium_type

    def _start_update(self, service_info: BluetoothServiceInfo) -> None:
        """Update from BLE advertisement data."""
        _LOGGER.debug(
            "Parsing Mopeka IOT BLE advertisement data: %s, MediumType is: %s",
            service_info,
            self._medium_type,
        )
        manufacturer_data = service_info.manufacturer_data
        service_uuids = service_info.service_uuids
        address = service_info.address
        if (
            MOPEKA_MANUFACTURER not in manufacturer_data
            or MOKPEKA_PRO_SERVICE_UUID not in service_uuids
        ):
            _LOGGER.debug("Not a Mopeka IOT BLE advertisement: %s", service_info)
            return
        data = manufacturer_data[MOPEKA_MANUFACTURER]
        model_num = data[0]
        if not (device_type := DEVICE_TYPES.get(model_num)):
            _LOGGER.debug("Unsupported Mopeka IOT BLE advertisement: %s", service_info)
            return
        adv_length = device_type.adv_length
        if len(data) != adv_length:
            return

        self.set_device_manufacturer("Mopeka IOT")
        self.set_device_type(device_type.model)
        self.set_device_name(f"{device_type.name} {short_address(address)}")
        battery = data[1]
        battery_voltage = battery_to_voltage(battery)
        battery_percentage = battery_to_percentage(battery)
        button_pressed = bool(data[2] & 0x80 > 0)
        temp = data[2] & 0x7F
        temp_celsius = temp_to_celsius(temp)
        tank_level = ((int(data[4]) << 8) + data[3]) & 0x3FFF
        tank_level_mm = tank_level_and_temp_to_mm(tank_level, temp, self._medium_type)
        reading_quality = data[4] >> 6
        accelerometer_x = data[8]
        accelerometer_y = data[9]

        self.update_predefined_sensor(SensorLibrary.TEMPERATURE__CELSIUS, temp_celsius)
        self.update_predefined_sensor(
            SensorLibrary.BATTERY__PERCENTAGE, battery_percentage
        )
        self.update_predefined_sensor(
            SensorLibrary.VOLTAGE__ELECTRIC_POTENTIAL_VOLT,
            battery_voltage,
            name="Battery Voltage",
            key="battery_voltage",
        )
        self.update_predefined_binary_sensor(
            BinarySensorDeviceClass.OCCUPANCY,
            button_pressed,
            key="button_pressed",
            name="Button pressed",
        )
        self.update_sensor(
            "tank_level",
            Units.LENGTH_MILLIMETERS,
            tank_level_mm if reading_quality >= 1 else None,
            SensorDeviceClass.DISTANCE,
            "Tank Level",
        )
        self.update_sensor(
            "accelerometer_x",
            None,
            accelerometer_x,
            None,
            "Position X",
        )
        self.update_sensor(
            "accelerometer_y",
            None,
            accelerometer_y,
            None,
            "Position Y",
        )
        self.update_sensor(
            "reading_quality_raw",
            None,
            reading_quality,
            None,
            "Reading quality raw",
        )
        self.update_sensor(
            "reading_quality",
            Units.PERCENTAGE,
            round(reading_quality / 3 * 100),
            None,
            "Reading quality",
        )
        # Reading stars = (3-reading_quality) * "★" + (reading_quality * "⭐")
*/

class MopekaDevice{
    constructor (ID, name, lengthOfAd = 10){
        this.ID=ID
        this.name=name
        this.lengthOfAd=lengthOfAd
    }
}
MopekaDevices = new Map()
MopekaDevices.set()
    .set (0x0, new MopekaDevice("XXXX","Unknown Mopeka device"))
    .set (0x3, new MopekaDevice("M1017", "Pro Check"))
    .set (0x4, new MopekaDevice("Pro-200", "Pro-200"))
    .set (0x5, new MopekaDevice("Pro H20", "Pro Check H2O"))
    .set (0x6, new MopekaDevice("M1017", "Lippert BottleCheck"))
    .set (0x8, new MopekaDevice("M1015", "Pro Plus"))
    .set (0x9, new MopekaDevice("M1015", "Pro Plus with Cellular"))
    .set (0xA, new MopekaDevice("TD40/TD200", "TD40/TD200"))
    .set (0xB, new MopekaDevice("TD40/TD200", "TD40/TD200 with Cellular"))
    .set (0xC, new MopekaDevice("M1017", "Pro Check Universal"))

    const Media={
        PROPANE: {coefficients: [0.573045, -0.002822, -0.00000535]},
        AIR: {coefficients: [0.153096, 0.000327, -0.000000294]},
        FRESH_WATER: {coefficients: [0.600592, 0.003124, -0.00001368]},
        WASTE_WATER: {coefficients: [0.600592, 0.003124, -0.00001368]},
        LIVE_WELL: {coefficients: [0.600592, 0.003124, -0.00001368]},
        BLACK_WATER: {coefficients: [0.600592, 0.003124, -0.00001368]},
        RAW_WATER: {coefficients: [0.600592, 0.003124, -0.00001368]},
        GASOLINE: {coefficients: [0.7373417462, -0.001978229885, 0.00000202162]},
        DIESEL: {coefficients: [0.7373417462, -0.001978229885, 0.00000202162]},
        LNG: {coefficients: [0.7373417462, -0.001978229885, 0.00000202162]},
        OIL: {coefficients: [0.7373417462, -0.001978229885, 0.00000202162]},
        HYDRAULIC_OIL: {coefficients: [0.7373417462, -0.001978229885, 0.00000202162]}
    }
    
    
const BTSensor = require("../BTSensor");
class MopekaTankSensor extends BTSensor{
    static serviceID = "0000fee5-0000-1000-8000-00805f9b34fb"
    static serviceID16 = 0xFEE5

    static manufacturerID = 0x0059
    static async identify(device){
        if (await this.getManufacturerID(device)==this.manufacturerID ){
            const uuids = await this.getDeviceProp(device, 'UUIDs')
            if (uuids && uuids.length>0 && uuids.includes(this.serviceID)) 
                return this
            else
                return null
        } else
            return null
    }    
        
    async init(){
        await super.init()
        const md = this.valueIfVariant(this.getManufacturerData(this.constructor.manufacturerID))
        this.modelID = md[0]
        this.initMetadata()
    } 

    getMedium(){
        return Media[this?.medium??'PROPANE']
    }
    getTankHeight(){
        return this?.tankHeight??304.8 //Assume a foot
    }

    _tankLevel( rawLevel ){
        const coefs= this.getMedium().coefficients
        return rawLevel * (coefs[0] + (coefs[1] * (this.temp-233.15)) + (coefs[2] * ((this.temp-233.15)^2)))
    }
    
    initMetadata(){
        var md = this.addMetadatum("medium","","type of liquid in tank")
        md.isParam=true
        md.enum=Object.keys(Media)

        md = this.addMetadatum("tankHeight","mm","height of tank (in mm)")
        md.isParam=true
        
        this.addMetadatum("battVolt","V","sensor battery in volts", 
            ((buffer)=>{ 
                this.battVolt = (buffer.readUInt8(1)/32) 
                return this.battVolt
            }).bind(this)
        )
        this.addMetadatum("battStrength","ratio","sensor battery strength", 
            (buffer)=>{ return Math.max(0, Math.min(1, (((this.battVolt) - 2.2) / 0.65))) }
        )
        this.addMetadatum("temp","K","temperature", 
            ((buffer)=>{ 
                this.temp = parseFloat(((buffer.readUInt8(2)&0x7F)+233.15).toFixed(2))
                return this.temp
            }).bind(this)
        )
        this.addMetadatum("tankLevel","ratio","tank level", 
            (buffer)=>{ return (this._tankLevel(((buffer.readUInt16LE(3))&0x3FFF)))/this.getTankHeight()}
        )
        this.addMetadatum("readingQuality","","quality of read", 
            (buffer)=>{ return buffer.readUInt8(4)>>6}
        )
        this.addMetadatum("accX","Mg","acceleration on X-axis", 
            (buffer)=>{ return buffer.readUInt8(8)}
        )
        this.addMetadatum("accY","Mg","acceleration on Y-axis", 
            (buffer)=>{ return buffer.readUInt8(9)}
        )        
    }

    propertiesChanged(props){
        super.propertiesChanged(props)
        if (props.ManufacturerData)
            this.emitValuesFrom( this.getManufacturerData(this.constructor.manufacturerID) )
    }

    getName(){
        if (this.name)
            return this.name

        const _name = MopekaDevices.get(this?.modelID??0x0).name
        return _name?_name:MopekaDevices.get(0x0).name
        
    }
}
module.exports=MopekaTankSensor