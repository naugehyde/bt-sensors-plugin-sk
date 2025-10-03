# AI-Assisted Development Guide for Bluetooth Battery Sensors

This guide documents the AI-assisted development process used to create Bluetooth battery sensor implementations for the SignalK bt-sensors-plugin-sk. Follow this process to add support for new Bluetooth battery devices.

## Overview

This plugin architecture allows adding new Bluetooth battery sensors by creating sensor class files that inherit from [`BTSensor.js`](BTSensor.js:1). Each sensor class handles device-specific Bluetooth communication and data parsing, then maps the data to SignalK paths.

## Prerequisites

Before starting, gather the following information about your Bluetooth battery:

### 1. Device Documentation
- Manufacturer's name and device model
- Bluetooth specifications (BLE services, characteristics, UUIDs)
- Data packet format and protocol documentation
- Available metrics (voltage, current, SOC, temperature, etc.)

### 2. Development Tools
- Access to the physical device for testing
- Bluetooth scanning tools (`bluetoothctl`, nRF Connect app, etc.)
- Sample data packets (advertising data, characteristic reads)

### 3. Technical Details
- Service UUIDs the device advertises
- Characteristic UUIDs for reading data
- Data encoding format (byte order, scaling factors, units)
- Any CRC/checksum algorithms used
- Whether device uses advertising data or GATT connection

## Step-by-Step AI-Assisted Development Process

### Step 1: Analyze Existing Similar Implementations

**Prompt to AI:**
```
I want to add support for a [DEVICE_NAME] Bluetooth battery to the bt-sensors-plugin-sk.
Please review the sensor_classes directory and identify existing battery sensor 
implementations that are similar. Show me the key patterns used for:
- Device identification (matchManufacturerData or identify methods)
- Bluetooth service/characteristic UUIDs
- Data packet parsing
- SignalK path mapping
- GATT vs advertising data approaches

Focus on these example files:
- sensor_classes/VictronSmartLithium.js
- sensor_classes/JBDBMS.js
- sensor_classes/RenogyBattery.js
```

**What AI should examine:**
- [`VictronSmartLithium.js`](sensor_classes/VictronSmartLithium.js:1) - Advertising data approach with encryption
- [`JBDBMS.js`](sensor_classes/JBDBMS.js:1) - GATT connection with command/response protocol
- [`RenogyBattery.js`](sensor_classes/RenogyBattery.js:1) - GATT with Modbus-style registers
- [`BTSensor.js`](BTSensor.js:1) - Base class showing required methods

### Step 2: Determine Communication Method

**Prompt to AI:**
```
My device [DOES/DOES NOT] require a GATT connection. It provides data via:
- [X] Advertising packets (manufacturer data or service data)
- [ ] GATT characteristic notifications
- [ ] GATT characteristic reads (polling)

Here's the Bluetooth scan data I captured:
[Paste output from bluetoothctl or nRF Connect]

Which approach should I use: advertising-based like VictronSmartLithium, 
or GATT-based like JBDBMS or RenogyBattery?
```

### Step 3: Create Initial Sensor Class File

**Prompt to AI:**
```
Create a new sensor class file for [DEVICE_NAME] based on the following specifications:

Device: [DEVICE_NAME]
Manufacturer: [MANUFACTURER]
Communication method: [Advertising/GATT]

[IF ADVERTISING:]
Manufacturer ID: [0xXXXX]
The device advertises data in manufacturer data with this format:
[Describe byte layout]

[IF GATT:]
Service UUID: [UUID]
Characteristics:
- Read: [UUID] - [description]
- Notify: [UUID] - [description]
- Write: [UUID] - [description if applicable]

The device provides these metrics:
- Voltage (range: X-Y V)
- Current (range: -X to +Y A)
- State of Charge (0-100%)
- Temperature (range: X-Y °C)
- [Other metrics...]

Please create sensor_classes/[DeviceName].js following the pattern used in
[VictronSmartLithium.js/JBDBMS.js/RenogyBattery.js], including:
1. Class definition extending BTSensor
2. Static Domain property set to BTSensor.SensorDomains.electrical
3. Static identify() method for device identification
4. Static ImageFile property
5. initSchema() method with metadata
6. Data parsing methods
7. SignalK path defaults
```

**Expected AI actions:**
- Creates new file in `sensor_classes/`
- Implements basic class structure
- Sets up UUID constants (if GATT)
- Defines device identification logic
- Creates default SignalK path mappings

### Step 4: Implement Device Identification

**For Advertising-based Devices:**

**Prompt to AI:**
```
I have Bluetooth advertising data from [DEVICE_NAME]:
Manufacturer Data: [paste hex dump, e.g., "AB CD 01 02 03 04..."]
or
Service Data (UUID [UUID]): [paste hex dump]

The manufacturer ID should be: [0xXXXX]

Please implement the static identify(device) method to correctly identify this device.
Use the pattern from VictronSensor.js which checks manufacturer ID and additional
identifying bytes if needed.
```

**For GATT Devices:**

**Prompt to AI:**
```
My GATT device advertises the service UUID: [UUID]

Please implement the static identify(device) method that:
1. Checks if the device advertises this service UUID
2. Returns the class if matched, null otherwise

Use this pattern:
static async identify(device){
    const serviceUUIDs = await BTSensor.getDeviceProp(device, 'UUIDs')
    if (serviceUUIDs && serviceUUIDs.includes('[UUID]'))
        return this
    return null
}
```

### Step 5: Implement Data Parsing (Advertising Method)

**Prompt to AI:**
```
The [DEVICE_NAME] sends data in manufacturer data packets with this format:

Byte 0-1: Manufacturer ID (0xXXXX, little-endian)
Byte 2-3: Voltage (0.01V units, unsigned 16-bit LE)
Byte 4-5: Current (0.01A units, signed 16-bit LE, positive=charging)
Byte 6: State of Charge (%, unsigned 8-bit, 0-100)
Byte 7-8: Temperature (0.1°C units, signed 16-bit LE)
[Continue for all fields...]

Sample packet: [provide actual hex dump, e.g., "CD AB 10 0D E8 03 64 5A 01"]

Please implement the propertiesChanged() method that:
1. Calls super.propertiesChanged(props) first
2. Extracts manufacturer data
3. Parses the buffer using the read functions defined in initSchema()
4. Calls emitValuesFrom(buffer) to emit all values

Also update initSchema() with the correct read functions for each path using:
.read = (buffer) => { return buffer.readUInt16LE(2) / 100 } // for voltage at byte 2
```

**Common Buffer Reading Methods:**
- `buffer.readUInt16LE(offset)` - Unsigned 16-bit little-endian
- `buffer.readInt16LE(offset)` - Signed 16-bit little-endian
- `buffer.readUInt8(offset)` - Unsigned 8-bit
- `buffer.readInt8(offset)` - Signed 8-bit
- `buffer.readUInt32LE(offset)` - Unsigned 32-bit little-endian
- Use `BE` suffix for big-endian variants

### Step 6: Implement GATT Communication (GATT Method)

**Prompt to AI:**
```
My GATT device uses this protocol:
Service UUID: [UUID]
Notify Characteristic: [UUID] - Sends battery data
Write Characteristic: [UUID] - Accepts commands
Read Characteristic: [UUID] - Returns data on request

Command format: [describe, e.g., "0xDD 0xA5 CMD 0x00 0xFF CHECKSUM 0x77"]
Response format: [describe structure]

Please implement:
1. initSchema() that connects to the device and sets up characteristics
2. initGATTConnection() override if needed
3. initGATTNotifications() or initGATTInterval() depending on polling vs notifications
4. emitGATT() method that requests data and parses responses
5. Helper methods like sendReadFunctionRequest() if needed

Follow the pattern from JBDBMS.js which uses command/response protocol.
```

**For devices that need polling:**

**Prompt to AI:**
```
Add GATT parameters to support polling:
- In initSchema(), call this.addGATTParameter() for pollFreq
- Set hasGATT() to return true
- Set usingGATT() to return this.useGATT
- Implement initGATTInterval() to poll at specified frequency
- Implement emitGATT() to read and emit all values
```

### Step 7: Define SignalK Path Mappings

**Prompt to AI:**
```
Please implement proper SignalK path defaults in initSchema() for this battery.
Map the parsed values to these SignalK paths:

Use addDefaultPath() for standard paths:
- Voltage → electrical.batteries.voltage
- Current → electrical.batteries.current  
- SOC → electrical.batteries.capacity.stateOfCharge
- Temperature → electrical.batteries.temperature
- Remaining capacity → electrical.batteries.capacity.remaining
- Cycles → electrical.batteries.cycles

Use addMetadatum() for device-specific paths:
- Cell voltages → electrical.batteries.{batteryID}.cell[N].voltage
- Protection status → electrical.batteries.{batteryID}.protectionStatus
- [Other custom metrics]

Add parameter for battery ID:
this.addDefaultParam("batteryID").default="house"

Ensure all paths use proper template variables like {batteryID} where appropriate.
```

**SignalK Path Reference:**
```
electrical.batteries.{id}.voltage          // V
electrical.batteries.{id}.current          // A (positive = charging)
electrical.batteries.{id}.temperature      // K (Kelvin)
electrical.batteries.{id}.capacity.stateOfCharge      // ratio (0-1)
electrical.batteries.{id}.capacity.remaining          // C (coulombs/amp-hours)
electrical.batteries.{id}.capacity.actual             // C (total capacity)
electrical.batteries.{id}.cycles                      // count
electrical.batteries.{id}.lifetimeDischarge           // C
electrical.batteries.{id}.lifetimeRecharge            // C
```

### Step 8: Add Device Image and Description

**Prompt to AI:**
```
I have an image for [DEVICE_NAME] saved as: public/images/[DeviceName].webp

Please update the sensor class to include:
1. static ImageFile = "[DeviceName].webp"
2. static Description = "[Brief description of device]"
3. static Manufacturer = "[Manufacturer Name]"

Follow the pattern from other sensor classes.
```

### Step 9: Register the Sensor Class

**Prompt to AI:**
```
Please help me register the new [DeviceName] sensor class in the plugin:
1. Check classLoader.js to see the pattern for importing and registering classes
2. Add the appropriate require() statement
3. Add it to the class map
4. Ensure it's in the correct order for identification

Show me the exact changes needed to classLoader.js.
```

### Step 10: Test with Real Device

**Prompt to AI:**
```
I'm testing with the actual [DEVICE_NAME] device. Here's what I'm seeing:

Debug output:
[Paste logs, errors, or unexpected behavior]

Expected values from device display:
- Voltage: [X]V
- Current: [X]A  
- SOC: [X]%
- Temperature: [X]°C

Actual parsed values:
- Voltage: [Y]V
- Current: [Y]A
- SOC: [Y]%  
- Temperature: [Y]°C

Please help debug:
1. Are the byte offsets correct?
2. Is the byte order (endianness) correct?
3. Are scaling factors correct?
4. Are signed vs unsigned interpretations correct?
```

**Common Issues & Fixes:**
- **Values 256x too large/small**: Wrong endianness (LE vs BE)
- **Negative values where shouldn't be**: Using UInt instead of Int
- **Values in wrong range**: Incorrect scaling factor
- **Values always same**: Wrong byte offset or not updating

### Step 11: Add Error Handling

**Prompt to AI:**
```
Please add robust error handling to the [DeviceName] class for:

For advertising-based devices:
1. Check manufacturer data exists before parsing
2. Validate buffer length before reading
3. Handle out-of-range values gracefully
4. Add try-catch in propertiesChanged()

For GATT devices:
1. Add timeouts for response waits
2. Validate checksums if protocol uses them
3. Handle disconnections gracefully
4. Add retry logic for failed reads
5. Implement deactivateGATT() cleanup

Follow the error handling patterns in JBDBMS.js and BTSensor.js.
```

### Step 12: Documentation and Testing

**Prompt to AI:**
```
Please add comprehensive documentation to the [DeviceName] class:

1. Add JSDoc comments for all methods explaining:
   - Parameters and return values
   - Protocol details
   - Data format specifics

2. Add a comment block at the top documenting the data format:
   /*
   [DeviceName] Data Format
   Byte X-Y: [Field] (units, format, range)
   ...
   */

3. Create a _test() usage example showing how to test parsing with sample data

4. Document any device-specific quirks or limitations
```

## Complete Example Workflow

Here's a condensed example conversation for adding an "AcmeBattery BT-100":

```
User: I want to add support for the Acme BT-100 Bluetooth battery. It uses 
advertising data with manufacturer ID 0x1234. Here's a sample packet:
34 12 10 0D E8 03 64 5A 01

AI: [Analyzes structure, creates initial class file]

User: The packet format is:
Bytes 0-1: Manufacturer ID (0x1234)
Bytes 2-3: Voltage in 0.01V (little-endian, so 0x0D10 = 3344 = 33.44V)
Bytes 4-5: Current in 0.01A (signed LE, 0x03E8 = 1000 = 10.00A)
Byte 6: SOC (0x64 = 100 = 100%)
Bytes 7-8: Temp in 0.1°C (signed LE, 0x015A = 346 = 34.6°C)

AI: [Implements propertiesChanged() and read functions with correct parsing]

User: Testing shows voltage correct but current is backwards (negative when charging)

AI: [Fixes current sign interpretation]

User: Perfect! Now add the image reference and register it.

AI: [Updates ImageFile, modifies classLoader.js]
```

## Bluetooth Scanning Commands

### Using bluetoothctl
```bash
# Start scanning
bluetoothctl
scan on

# Wait for device to appear, then:
info [MAC_ADDRESS]

# Look for:
# - ManufacturerData: key [ID] value [hex bytes]
# - ServiceData: key [UUID] value [hex bytes]
# - UUIDs: [list of service UUIDs]
```

### Using hcitool/hcidump
```bash
# Terminal 1: Start scan
sudo hcitool lescan

# Terminal 2: Capture advertising data
sudo hcidump --raw
```

## Testing Your Implementation

### Static Testing (No Device Required)
```javascript
const MyBattery = require('./sensor_classes/MyBattery.js')

// Test with sample packet
const sampleData = "34 12 10 0D E8 03 64 5A 01"
MyBattery._test(sampleData)

// Should output:
// voltage=33.44
// current=10.00
// SOC=1.00
// temperature=307.75
```

### Live Testing Checklist
- [ ] Device correctly identified during scan
- [ ] Connection establishes (if GATT)
- [ ] All metrics parse with correct values
- [ ] Values match device's own display
- [ ] Reconnection works after going out of range
- [ ] SignalK paths appear in data browser
- [ ] Units are correct (Kelvin for temp, etc.)
- [ ] No memory leaks over extended operation

## Common Data Parsing Patterns

### Temperature Conversions
```javascript
// Celsius to Kelvin
.read = (buffer) => { return buffer.readInt16LE(offset) / 10 + 273.15 }

// Handle "not available" values  
.read = (buffer) => { 
    const val = buffer.readInt8(offset)
    return val === 0x7F ? NaN : val + 273.15 
}
```

### Current Direction
```javascript
// Positive = charging, negative = discharging
.read = (buffer) => { return buffer.readInt16LE(offset) / 100 }
```

### State of Charge
```javascript
// Percent to ratio (0-1)
.read = (buffer) => { return buffer.readUInt8(offset) / 100 }
```

### Bit Flags
```javascript
.read = (buffer) => {
    const byte = buffer.readUInt8(offset)
    return {
        charging: (byte & 0x01) !== 0,
        discharging: (byte & 0x02) !== 0,
        balancing: (byte & 0x04) !== 0,
        fault: (byte & 0x80) !== 0
    }
}
```

## Advanced Topics

### Encryption
Some devices (like Victron) encrypt advertising data. If your device uses encryption:

**Prompt to AI:**
```
My device uses AES-CTR encryption with a 128-bit key. The encrypted data starts
at byte 8 of the manufacturer data. The nonce/counter is in bytes 0-7.

Please implement:
1. A decrypt() method using Node.js crypto module
2. Update propertiesChanged() to decrypt before parsing
3. Add encryptionKey parameter to configuration

Follow the pattern from VictronSensor.js.
```

### Multiple Cell Voltages
For batteries with multiple cells:

**Prompt to AI:**
```
The battery has [N] cells. Cell voltages are packed into the data:
- Starting at byte X
- Each cell is 2 bytes, little-endian
- Values are in millivolts (1mV = 0.001V)

Please:
1. Add a loop in initSchema() to create cell voltage paths dynamically
2. Create read functions for each cell
3. Use template {batteryID} in paths like:
   electrical.batteries.{batteryID}.cell[N].voltage
```

### Checksum Validation
For protocols with checksums:

**Prompt to AI:**
```
The protocol includes a checksum at bytes [X-Y]:
- Type: [CRC-16/sum/XOR]
- Calculated over bytes [A-B]
- [Describe algorithm]

Please implement a validateChecksum() function and call it before parsing data.
Reject invalid packets with this.debug() message.

See JBDBMS.js checkSum() function as reference.
```

## Troubleshooting Guide

| Problem | Likely Cause | Solution Prompt |
|---------|-------------|-----------------|
| Device not appearing in scan | UUID filter, not advertising | "Check if identify() method is correct. Show me how to debug device detection." |
| Values are NaN | Wrong byte offsets, invalid data | "Values showing NaN. Help me verify byte offsets and add validation." |
| Connection fails | Wrong service UUID, device busy | "GATT connection failing with error: [error]. What should I check?" |
| Values incorrect magnitude | Wrong scaling factor | "Values are 100x too large. Check my scaling factors." |
| Negative when should be positive | Unsigned vs signed | "Current showing negative when charging. Fix my Int/UInt usage." |
| Updates stop after a while | Memory leak, no cleanup | "Device stops updating after 5 minutes. Check my cleanup in stopListening()." |

## Resources

- [SignalK Specification](http://signalk.org/specification/latest/doc/vesselsBranch.html)
- [Bluetooth GATT Specifications](https://www.bluetooth.com/specifications/specs/)
- [Node.js Buffer Documentation](https://nodejs.org/api/buffer.html)
- Plugin README: [`README.md`](README.md:1)
- Development Guide: [`sensor_classes/DEVELOPMENT.md`](sensor_classes/DEVELOPMENT.md:1)
- Base Sensor Class: [`BTSensor.js`](BTSensor.js:1)

## Summary

The AI-assisted development process follows this pattern:

1. **Research** - Analyze similar implementations
2. **Identify** - Determine communication method (advertising vs GATT)
3. **Create** - Generate skeleton sensor class
4. **Implement** - Add device identification logic
5. **Parse** - Implement data parsing with correct byte operations
6. **Map** - Create SignalK path mappings with defaults
7. **Register** - Add to classLoader.js
8. **Test** - Verify with real hardware
9. **Debug** - Fix scaling, offsets, byte order issues
10. **Refine** - Add error handling and documentation
11. **Complete** - Test thoroughly and contribute back

By providing clear, specific prompts with actual device data (hex dumps, protocol specs, test results), AI can effectively assist in creating robust, maintainable sensor implementations that follow the established patterns in this codebase.

## Key Success Factors

1. **Have real device data** - Actual advertising packets or GATT responses
2. **Know the protocol** - Byte layout, scaling factors, data types
3. **Test iteratively** - Make small changes, test each one
4. **Compare values** - Match against device's own display
5. **Use existing patterns** - Don't reinvent, follow proven implementations
6. **Document thoroughly** - Help the next developer

Good luck adding your Bluetooth battery! 🔋⚡