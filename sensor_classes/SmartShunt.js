const BTSensor = require("../BTSensor");
/*
/ Assuming 'Int8ul' and 'Int16ul' are available from a library like 'construct-js'
// or you have your own implementation for parsing unsigned integers from bytes

// Assuming the following classes are defined elsewhere
// import { Device, DeviceData } from './base';
// import { BatteryMonitor, BatteryMonitorData } from './battery_monitor';
// import { BatterySense, BatterySenseData } from './battery_sense';
// import { DcEnergyMeter, DcEnergyMeterData } from './dc_energy_meter';
// import { DcDcConverter, DcDcConverterData } from './dcdc_converter';
// import { LynxSmartBMS, LynxSmartBMSData } from './lynx_smart_bms';
// import { SolarCharger, SolarChargerData } from './solar_charger';
// import { VEBus, VEBusData } from './vebus';

// Export the necessary symbols (adjust as needed for your module system)
export {
    AuxMode,
    Device,
    DeviceData,
    BatteryMonitor,
    BatteryMonitorData,
    BatterySense,
    BatterySenseData,
    DcDcConverter,
    DcDcConverterData,
    DcEnergyMeter,
    DcEnergyMeterData,
    LynxSmartBMS,
    LynxSmartBMSData,
    SolarCharger,
    SolarChargerData,
    VEBus,
    VEBusData,
    detectDeviceType, // Expose the function for use
};

// Model parser override map
const MODEL_PARSER_OVERRIDE = {
    0xA3A4: BatterySense,
    0xA3A5: BatterySense,
};

function detectDeviceType(data) {
    const modelId = Int16ul.parse(data.slice(2, 4)); 
    const mode = Int8ul.parse(data.slice(4, 5)); 

    // Model ID-based preferences
    const match = MODEL_PARSER_OVERRIDE[modelId];
    if (match) {
        return match;
    }

    // Defaults based on mode
    switch (mode) {
        case 0x2:  // BatteryMonitor
            return BatteryMonitor;
        case 0xD:  // DcEnergyMeter
            return DcEnergyMeter;
        case 0x4:  // DcDcConverter
            return DcDcConverter;
        case 0xA:  // LynxSmartBMS
            return LynxSmartBMS;
        case 0x1:  // SolarCharger
            return SolarCharger;
        case 0xC:  // VE.Bus
            return VEBus;
        // Add cases for other modes as needed
        default:
            return null; // Or handle unrecognized modes appropriately
    }
}
*/
/*
import { AES, Counter } from "crypto-js"; // Assuming you're using 'crypto-js' for crypto functions

// Enums
const OperationMode = {
    OFF: 0,
    LOW_POWER: 1,
    FAULT: 2,
    BULK: 3,
    ABSORPTION: 4,
    FLOAT: 5,
    STORAGE: 6,
    EQUALIZE_MANUAL: 7,
    INVERTING: 9,
    POWER_SUPPLY: 11,
    STARTING_UP: 245,
    REPEATED_ABSORPTION:   
 246,
    RECONDITION: 247,
    BATTERY_SAFE: 248,
    EXTERNAL_CONTROL: 252,
};

const ChargerError = {
    // ... (rest of the ChargerError enum)
};

const OffReason = {
    // ... (rest of the OffReason enum)
};

const AlarmReason = {
    // ... (rest of the AlarmReason enum)
};

const ACInState = {
    // ... (rest of the ACInState enum)
};

const MODEL_ID_MAPPING = {
    // ... (rest of the MODEL_ID_MAPPING)
};

// Classes

class DeviceData {
    constructor(model_id, data) {
        this._model_id = model_id;
        this._data = data;
    }

    get_model_name() {
        return MODEL_ID_MAPPING[this._model_id] || `<Unknown device: ${this._model_id}>`;
    }
}

class Device {
    static data_type = DeviceData;

    // Define the packet structure
    static PARSER = {
        prefix: { size: 2, type: "GreedyBytes" }, // Assuming you have a way to handle 'GreedyBytes'
        model_id: "Int16ul",                      // Assuming you have a way to handle unsigned 16-bit ints
        readout_type: "Int8sl",                   // Assuming you have a way to handle signed 8-bit ints
        iv: "Int16ul",
        encrypted_data: "GreedyBytes",
    };

    constructor(advertisement_key) {
        this.advertisement_key = advertisement_key;
    }

    get_model_id(data) {
        // Replace with your parsing logic based on the structure
        const parsedData = this.parsePacket(data); 
        return parsedData.model_id;
    }

    decrypt(data) {
        const container = this.parsePacket(data);

        const advertisement_key = CryptoJS.enc.Hex.parse(this.advertisement_key); // Convert hex string to WordArray

        // The first data byte is a key check byte
        if (container.encrypted_data[0] !== advertisement_key.words[0] & 0xFF) {
            throw new Error("Incorrect advertisement key"); // Or a custom AdvertisementKeyMismatchError
        }

        const ivWords = [container.iv & 0xFFFF, 0]; // Convert IV to WordArray (little-endian)
        const ctr = Counter.create({ words: ivWords });

        const cipher = AES.createEncryptor(advertisement_key, { iv: ctr, mode: CryptoJS.mode.CTR });
        const paddedData = this.padData(container.encrypted_data.slice(1)); // Pad data (implementation needed)
        const decrypted = cipher.process(paddedData);

        return decrypted; // You might need to convert this to bytes depending on your usage
    }

    parse(data) {
        const decrypted = this.decrypt(data);
        const parsed = this.parse_decrypted(decrypted);
        const model = this.get_model_id(data);
        return new this.constructor.data_type(model, parsed);
    }

    // Abstract method to be implemented by subclasses
    parse_decrypted(decrypted) {
        throw new Error("parse_decrypted method must be implemented by subclass");
    }

    // Replace this with your actual packet parsing logic based on your 'Struct' implementation
    parsePacket(data) {
        // ... (Your parsing logic here)
    }

    // Implement padding logic (replace with your actual padding method)
    padData(data) {
        // ... (Your padding logic here)
    }
}

// Helper function
function kelvin_to_celsius(temp_in_kelvin) {
    return Math.round((temp_in_kelvin - 273.15) * 100) / 100;
}
*/

/*

// Assuming 'Struct' and 'GreedyBytes' are replaced with suitable JavaScript libraries/functions
// Also assuming 'Device' and 'DeviceData' are classes defined elsewhere, or you can remove the inheritance

class BatteryMonitor { // extends Device {
    // Assuming 'BatteryMonitorData' is a class defined elsewhere
    static data_type = BatteryMonitorData;

    // Define the packet structure
    static PACKET = {
        remaining_mins: 'Int16ul',
        voltage: 'Int16ul',
        alarm: 'Int16ul',
        aux: 'Int16ul',
        current: 'Int24sl',
        consumed_ah: 'Int16ul',
        soc: 'Int16ul',
        // 'GreedyBytes' - Handle extra bytes appropriately in your parsing logic
    };

    parse_decrypted(decrypted) {
        // 'Struct.parse' - Replace with your parsing logic based on the structure
        const pkt = this.parsePacket(decrypted); 

        const aux_mode = pkt.current & 0b11; // Assuming 'AuxMode' is an enum defined elsewhere

        const parsed = {
            remaining_mins: pkt.remaining_mins,
            aux_mode: aux_mode,
            current: (pkt.current >> 2) / 1000,
            voltage: pkt.voltage / 100,
            consumed_ah: pkt.consumed_ah / 10,
            soc: ((pkt.soc & 0x3FFF) >> 4) / 10,
            alarm:   
 pkt.alarm,
        };

        if (aux_mode === AuxMode.STARTER_VOLTAGE) {
            // 'Int16sl.parse' - Replace with appropriate parsing logic
            // Convert 'pkt.aux' to a 2-byte array (little-endian) and parse as a signed 16-bit integer
            const auxBytes = new Uint8Array([pkt.aux & 0xFF, (pkt.aux >> 8) & 0xFF]);
            const auxValue = new DataView(auxBytes.buffer).getInt16(0, true); // true for little-endian
            parsed.starter_voltage = auxValue / 100; 
        } else if (aux_mode === AuxMode.MIDPOINT_VOLTAGE) {
            parsed.midpoint_voltage = pkt.aux / 100;
        } else if (aux_mode === AuxMode.TEMPERATURE) {
            parsed.temperature_kelvin = pkt.aux / 100;
        }

        return parsed;
    }

    // Replace this with your actual packet parsing logic based on your 'Struct' implementation
    parsePacket(decrypted) {
        // ... (Your parsing logic here)
    }
}
Use code with caution.

Key points and assumptions:

Struct and GreedyBytes: You'll need to replace Struct.parse and GreedyBytes with equivalent JavaScript functionality from libraries you're using or custom implementations.
Int Types: JavaScript doesn't have built-in unsigned integer types. You might need to use libraries like DataView or bitwise operations to handle unsigned values correctly, especially for Int16ul, Int24sl.
Byte Manipulation: The line Int16sl.parse((pkt.aux).to_bytes(2, "little")) requires converting an integer to a byte array. I've provided a basic implementation using Uint8Array and DataView, but you might need adjustments depending on your data format.
Enums: I assumed AuxMode is an enum defined elsewhere. Make sure you have that defined in your JavaScript code.
Device and DeviceData: If you're not using inheritance from Device, you can remove that part. Otherwise, ensure you have those classes defined.
Remember: This conversion is based on assumptions about your existing JavaScript environment and how you're handling byte structures. You might need to adapt it further based on your specific implementation details.

Let me know if you have any questions or need help with specific parts of the conversion!
*/

class SmartShunt extends BTSensor{
    constructor(device){
        super(device)
    }
    static async identify(device){
        try{
            const name = await device.getNameSafe() 
            const alias = await device.getAliasSafe()
            if ((name == 'SmartShunt HQ2204C2GHD' || alias == 'SmartShunt HQ2204C2GHD')
             && !(await device.isPaired()) ){
                return null
            }
        } catch (e){
            console.log(e)
            return null
        }
        return null
    }

    static metadata = new Map()
    .set('current',{unit:'A', description: 'house battery amperage'})
    .set('power',{unit:'W', description: 'house battery wattage'})
    .set('voltage',{unit:'V', description: 'house battery voltage'})
    .set('starterVoltage',{unit:'V', description: 'starter battery voltage'})
    .set('consumed',{unit:'', description: 'amp-hours consumed'})
    .set('soc',{unit:'', description: 'state of charge'})    
    .set('ttg',{unit:'s', description: 'time to go'})    
connect() {
        //TBD: Implement AES-Ctr decryption of ManufacturerData per https://github.com/keshavdv/victron-ble
        const cb = async (propertiesChanged) => {

            this.device.getManufacturerData().then((data)=>{
                //TBD get shunt data and emit
                this.emit("voltage", 14.0);

            }
            )
        }
        cb();
        device.helper.on('PropertiesChanged', cb)
        return this
    }
    
}
module.exports=SmartShunt