// This is a generated file! Please edit source .ksy file and use kaitai-struct-compiler to rebuild

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['kaitai-struct/KaitaiStream'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('kaitai-struct/KaitaiStream'));
  } else {
    root.BthomeServiceData = factory(root.KaitaiStream);
  }
}(typeof self !== 'undefined' ? self : this, function (KaitaiStream) {
/**
 * BLE advertising in the BTHome v2 format
 * @see {@link https://bthome.io/format/|Source}
 */

var BthomeServiceData = (function() {
  BthomeServiceData.BthomeObjectId = Object.freeze({
    MISC_PACKET_ID: 0,
    SENSOR_BATTERY: 1,
    SENSOR_TEMPERATURE_0_01: 2,
    SENSOR_HUMIDITY_0_01: 3,
    SENSOR_PRESSURE_0_01: 4,
    SENSOR_ILLUMINANCE_0_01: 5,
    SENSOR_MASS_KG_0_01: 6,
    SENSOR_MASS_LB_0_01: 7,
    SENSOR_DEWPOINT_0_01: 8,
    SENSOR_COUNT: 9,
    SENSOR_ENERGY_0_001: 10,
    SENSOR_POWER_0_01: 11,
    SENSOR_VOLTAGE_0_001: 12,
    SENSOR_PM2_5: 13,
    SENSOR_PM10: 14,
    BINARY_GENERIC_BOOLEAN: 15,
    BINARY_POWER: 16,
    BINARY_OPENING: 17,
    SENSOR_CO2: 18,
    SENSOR_TVOC: 19,
    SENSOR_MOISTURE_0_01: 20,
    BINARY_BATTERY: 21,
    BINARY_BATTERY_CHARGING: 22,
    BINARY_CARBON_MONOXIDE: 23,
    BINARY_COLD: 24,
    BINARY_CONNECTIVITY: 25,
    BINARY_DOOR: 26,
    BINARY_GARAGE_DOOR: 27,
    BINARY_GAS: 28,
    BINARY_HEAT: 29,
    BINARY_LIGHT: 30,
    BINARY_LOCK: 31,
    BINARY_MOISTURE: 32,
    BINARY_MOTION: 33,
    BINARY_MOVING: 34,
    BINARY_OCCUPANCY: 35,
    BINARY_PLUG: 36,
    BINARY_PRESENCE: 37,
    BINARY_PROBLEM: 38,
    BINARY_RUNNING: 39,
    BINARY_SAFETY: 40,
    BINARY_SMOKE: 41,
    BINARY_SOUND: 42,
    BINARY_TAMPER: 43,
    BINARY_VIBRATION: 44,
    BINARY_WINDOW: 45,
    SENSOR_HUMIDITY: 46,
    SENSOR_MOISTURE: 47,
    EVENT_BUTTON: 58,
    EVENT_DIMMER: 60,
    SENSOR_COUNT_UINT16: 61,
    SENSOR_COUNT_UINT32: 62,
    SENSOR_ROTATION_0_1: 63,
    SENSOR_DISTANCE_MM: 64,
    SENSOR_DISTANCE_M_0_1: 65,
    SENSOR_DURATION_0_001: 66,
    SENSOR_CURRENT_0_001: 67,
    SENSOR_SPEED_0_01: 68,
    SENSOR_TEMPERATURE_0_1: 69,
    SENSOR_UV_INDEX_0_1: 70,
    SENSOR_VOLUME_0_1: 71,
    SENSOR_VOLUME: 72,
    SENSOR_VOLUME_FLOW_RATE_0_001: 73,
    SENSOR_VOLTAGE_0_1: 74,
    SENSOR_GAS: 75,
    SENSOR_GAS_UINT32: 76,
    SENSOR_ENERGY_0_001_UINT32: 77,
    SENSOR_VOLUME_0_001: 78,
    SENSOR_WATER: 79,
    SENSOR_TIMESTAMP: 80,
    SENSOR_ACCELERATION: 81,
    SENSOR_GYROSCOPE: 82,
    SENSOR_TEXT: 83,
    SENSOR_RAW: 84,
    SENSOR_VOLUME_STORAGE: 85,
    DEVICE_TYPE: 240,
    DEVICE_FW_VERSION_UINT32: 241,
    DEVICE_FW_VERSION_UINT24: 242,

    0: "MISC_PACKET_ID",
    1: "SENSOR_BATTERY",
    2: "SENSOR_TEMPERATURE_0_01",
    3: "SENSOR_HUMIDITY_0_01",
    4: "SENSOR_PRESSURE_0_01",
    5: "SENSOR_ILLUMINANCE_0_01",
    6: "SENSOR_MASS_KG_0_01",
    7: "SENSOR_MASS_LB_0_01",
    8: "SENSOR_DEWPOINT_0_01",
    9: "SENSOR_COUNT",
    10: "SENSOR_ENERGY_0_001",
    11: "SENSOR_POWER_0_01",
    12: "SENSOR_VOLTAGE_0_001",
    13: "SENSOR_PM2_5",
    14: "SENSOR_PM10",
    15: "BINARY_GENERIC_BOOLEAN",
    16: "BINARY_POWER",
    17: "BINARY_OPENING",
    18: "SENSOR_CO2",
    19: "SENSOR_TVOC",
    20: "SENSOR_MOISTURE_0_01",
    21: "BINARY_BATTERY",
    22: "BINARY_BATTERY_CHARGING",
    23: "BINARY_CARBON_MONOXIDE",
    24: "BINARY_COLD",
    25: "BINARY_CONNECTIVITY",
    26: "BINARY_DOOR",
    27: "BINARY_GARAGE_DOOR",
    28: "BINARY_GAS",
    29: "BINARY_HEAT",
    30: "BINARY_LIGHT",
    31: "BINARY_LOCK",
    32: "BINARY_MOISTURE",
    33: "BINARY_MOTION",
    34: "BINARY_MOVING",
    35: "BINARY_OCCUPANCY",
    36: "BINARY_PLUG",
    37: "BINARY_PRESENCE",
    38: "BINARY_PROBLEM",
    39: "BINARY_RUNNING",
    40: "BINARY_SAFETY",
    41: "BINARY_SMOKE",
    42: "BINARY_SOUND",
    43: "BINARY_TAMPER",
    44: "BINARY_VIBRATION",
    45: "BINARY_WINDOW",
    46: "SENSOR_HUMIDITY",
    47: "SENSOR_MOISTURE",
    58: "EVENT_BUTTON",
    60: "EVENT_DIMMER",
    61: "SENSOR_COUNT_UINT16",
    62: "SENSOR_COUNT_UINT32",
    63: "SENSOR_ROTATION_0_1",
    64: "SENSOR_DISTANCE_MM",
    65: "SENSOR_DISTANCE_M_0_1",
    66: "SENSOR_DURATION_0_001",
    67: "SENSOR_CURRENT_0_001",
    68: "SENSOR_SPEED_0_01",
    69: "SENSOR_TEMPERATURE_0_1",
    70: "SENSOR_UV_INDEX_0_1",
    71: "SENSOR_VOLUME_0_1",
    72: "SENSOR_VOLUME",
    73: "SENSOR_VOLUME_FLOW_RATE_0_001",
    74: "SENSOR_VOLTAGE_0_1",
    75: "SENSOR_GAS",
    76: "SENSOR_GAS_UINT32",
    77: "SENSOR_ENERGY_0_001_UINT32",
    78: "SENSOR_VOLUME_0_001",
    79: "SENSOR_WATER",
    80: "SENSOR_TIMESTAMP",
    81: "SENSOR_ACCELERATION",
    82: "SENSOR_GYROSCOPE",
    83: "SENSOR_TEXT",
    84: "SENSOR_RAW",
    85: "SENSOR_VOLUME_STORAGE",
    240: "DEVICE_TYPE",
    241: "DEVICE_FW_VERSION_UINT32",
    242: "DEVICE_FW_VERSION_UINT24",
  });

  BthomeServiceData.ButtonEventType = Object.freeze({
    NONE: 0,
    PRESS: 1,
    DOUBLE_PRESS: 2,
    TRIPLE_PRESS: 3,
    LONG_PRESS: 4,
    LONG_DOUBLE_PRESS: 5,
    LONG_TRIPLE_PRESS: 6,
    HOLD_PRESS: 128,

    0: "NONE",
    1: "PRESS",
    2: "DOUBLE_PRESS",
    3: "TRIPLE_PRESS",
    4: "LONG_PRESS",
    5: "LONG_DOUBLE_PRESS",
    6: "LONG_TRIPLE_PRESS",
    128: "HOLD_PRESS",
  });

  BthomeServiceData.DimmerEventType = Object.freeze({
    NONE: 0,
    ROTATE_LEFT: 1,
    ROTATE_RIGHT: 2,

    0: "NONE",
    1: "ROTATE_LEFT",
    2: "ROTATE_RIGHT",
  });

  function BthomeServiceData(_io, _parent, _root) {
    this._io = _io;
    this._parent = _parent;
    this._root = _root || this;

    this._read();
  }
  BthomeServiceData.prototype._read = function() {
    this.deviceInformation = new BthomeDeviceInformation(this._io, this, this._root);
    if (this.deviceInformation.macIncluded) {
      this.macReversed = this._io.readBytes(6);
    }
    if ( ((this.deviceInformation.bthomeVersion == 2) && (this.deviceInformation.encryption == false)) ) {
      this.measurement = [];
      var i = 0;
      while (!this._io.isEof()) {
        this.measurement.push(new BthomeMeasurement(this._io, this, this._root));
        i++;
      }
    }
    if ( ((this.deviceInformation.bthomeVersion == 2) && (this.deviceInformation.encryption == true)) ) {
      this.ciphertext = this._io.readBytes((((this._io.size - this._io.pos) - 4) - 4));
    }
    if ( ((this.deviceInformation.bthomeVersion == 2) && (this.deviceInformation.encryption == true)) ) {
      this.counter = this._io.readU4be();
    }
    if ( ((this.deviceInformation.bthomeVersion == 2) && (this.deviceInformation.encryption == true)) ) {
      this.mic = this._io.readU4be();
    }
  }

  var BthomeSensorEnergy0001 = BthomeServiceData.BthomeSensorEnergy0001 = (function() {
    function BthomeSensorEnergy0001(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorEnergy0001.prototype._read = function() {
      this.value = new U3(this._io, this, this._root);
    }
    Object.defineProperty(BthomeSensorEnergy0001.prototype, 'energy', {
      get: function() {
        if (this._m_energy !== undefined)
          return this._m_energy;
        this._m_energy = (this.value.value * 0.001);
        return this._m_energy;
      }
    });
    Object.defineProperty(BthomeSensorEnergy0001.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "kWh";
        return this._m_unit;
      }
    });

    return BthomeSensorEnergy0001;
  })();

  var BthomeSensorCountUint32 = BthomeServiceData.BthomeSensorCountUint32 = (function() {
    function BthomeSensorCountUint32(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorCountUint32.prototype._read = function() {
      this.count = this._io.readU4le();
    }

    return BthomeSensorCountUint32;
  })();

  var BthomeSensorBattery = BthomeServiceData.BthomeSensorBattery = (function() {
    function BthomeSensorBattery(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorBattery.prototype._read = function() {
      this.battery = this._io.readU1();
    }
    Object.defineProperty(BthomeSensorBattery.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "%";
        return this._m_unit;
      }
    });

    return BthomeSensorBattery;
  })();

  var BthomeSensorCo2 = BthomeServiceData.BthomeSensorCo2 = (function() {
    function BthomeSensorCo2(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorCo2.prototype._read = function() {
      this.co2 = this._io.readU2le();
    }
    Object.defineProperty(BthomeSensorCo2.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "ppm";
        return this._m_unit;
      }
    });

    return BthomeSensorCo2;
  })();

  var BthomeSensorVoltage0001 = BthomeServiceData.BthomeSensorVoltage0001 = (function() {
    function BthomeSensorVoltage0001(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorVoltage0001.prototype._read = function() {
      this.value = this._io.readU2le();
    }
    Object.defineProperty(BthomeSensorVoltage0001.prototype, 'voltage', {
      get: function() {
        if (this._m_voltage !== undefined)
          return this._m_voltage;
        this._m_voltage = (this.value * 0.001);
        return this._m_voltage;
      }
    });
    Object.defineProperty(BthomeSensorVoltage0001.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "V";
        return this._m_unit;
      }
    });

    return BthomeSensorVoltage0001;
  })();

  var BthomeDeviceInformation = BthomeServiceData.BthomeDeviceInformation = (function() {
    function BthomeDeviceInformation(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeDeviceInformation.prototype._read = function() {
      this.encryption = this._io.readBitsIntLe(1) != 0;
      this.macIncluded = this._io.readBitsIntLe(1) != 0;
      this.triggerBased = this._io.readBitsIntLe(1) != 0;
      this.reservedForFutureUse = this._io.readBitsIntLe(2);
      this.bthomeVersion = this._io.readBitsIntLe(3);
    }

    return BthomeDeviceInformation;
  })();

  var BthomeBinaryWindow = BthomeServiceData.BthomeBinaryWindow = (function() {
    function BthomeBinaryWindow(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryWindow.prototype._read = function() {
      this.window = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryWindow;
  })();

  var BthomeSensorCurrent0001 = BthomeServiceData.BthomeSensorCurrent0001 = (function() {
    function BthomeSensorCurrent0001(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorCurrent0001.prototype._read = function() {
      this.value = this._io.readU2le();
    }
    Object.defineProperty(BthomeSensorCurrent0001.prototype, 'current', {
      get: function() {
        if (this._m_current !== undefined)
          return this._m_current;
        this._m_current = (this.value * 0.001);
        return this._m_current;
      }
    });
    Object.defineProperty(BthomeSensorCurrent0001.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "A";
        return this._m_unit;
      }
    });

    return BthomeSensorCurrent0001;
  })();

  var BthomeSensorVolume01 = BthomeServiceData.BthomeSensorVolume01 = (function() {
    function BthomeSensorVolume01(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorVolume01.prototype._read = function() {
      this.value = this._io.readU2le();
    }
    Object.defineProperty(BthomeSensorVolume01.prototype, 'volume', {
      get: function() {
        if (this._m_volume !== undefined)
          return this._m_volume;
        this._m_volume = (this.value * 0.1);
        return this._m_volume;
      }
    });
    Object.defineProperty(BthomeSensorVolume01.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "L";
        return this._m_unit;
      }
    });

    return BthomeSensorVolume01;
  })();

  var BthomeBinaryConnectivity = BthomeServiceData.BthomeBinaryConnectivity = (function() {
    function BthomeBinaryConnectivity(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryConnectivity.prototype._read = function() {
      this.connectivity = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryConnectivity;
  })();

  var BthomeSensorPm10 = BthomeServiceData.BthomeSensorPm10 = (function() {
    function BthomeSensorPm10(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorPm10.prototype._read = function() {
      this.pm10 = this._io.readU2le();
    }
    Object.defineProperty(BthomeSensorPm10.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "\xb5g/m\xb3";
        return this._m_unit;
      }
    });

    return BthomeSensorPm10;
  })();

  var BthomeBinarySound = BthomeServiceData.BthomeBinarySound = (function() {
    function BthomeBinarySound(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinarySound.prototype._read = function() {
      this.sound = new Bool8(this._io, this, this._root);
    }

    return BthomeBinarySound;
  })();

  var BthomeSensorAcceleration = BthomeServiceData.BthomeSensorAcceleration = (function() {
    function BthomeSensorAcceleration(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorAcceleration.prototype._read = function() {
      this.value = this._io.readU2le();
    }
    Object.defineProperty(BthomeSensorAcceleration.prototype, 'acceleration', {
      get: function() {
        if (this._m_acceleration !== undefined)
          return this._m_acceleration;
        this._m_acceleration = (this.value * 0.001);
        return this._m_acceleration;
      }
    });
    Object.defineProperty(BthomeSensorAcceleration.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "m/s\xb2";
        return this._m_unit;
      }
    });

    return BthomeSensorAcceleration;
  })();

  var BthomeEventDimmer = BthomeServiceData.BthomeEventDimmer = (function() {
    function BthomeEventDimmer(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeEventDimmer.prototype._read = function() {
      this.event = this._io.readU1();
      this.steps = this._io.readU1();
    }

    return BthomeEventDimmer;
  })();

  var BthomeDeviceType = BthomeServiceData.BthomeDeviceType = (function() {
    function BthomeDeviceType(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeDeviceType.prototype._read = function() {
      this.deviceTypeId = this._io.readU2le();
    }

    return BthomeDeviceType;
  })();

  var BthomeSensorGasUint32 = BthomeServiceData.BthomeSensorGasUint32 = (function() {
    function BthomeSensorGasUint32(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorGasUint32.prototype._read = function() {
      this.value = this._io.readU4le();
    }
    Object.defineProperty(BthomeSensorGasUint32.prototype, 'gas', {
      get: function() {
        if (this._m_gas !== undefined)
          return this._m_gas;
        this._m_gas = (this.value * 0.001);
        return this._m_gas;
      }
    });
    Object.defineProperty(BthomeSensorGasUint32.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "m\xb3";
        return this._m_unit;
      }
    });

    return BthomeSensorGasUint32;
  })();

  var BthomeSensorPm25 = BthomeServiceData.BthomeSensorPm25 = (function() {
    function BthomeSensorPm25(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorPm25.prototype._read = function() {
      this.pm25 = this._io.readU2le();
    }
    Object.defineProperty(BthomeSensorPm25.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "\xb5g/m\xb3";
        return this._m_unit;
      }
    });

    return BthomeSensorPm25;
  })();

  var BthomeSensorVolume = BthomeServiceData.BthomeSensorVolume = (function() {
    function BthomeSensorVolume(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorVolume.prototype._read = function() {
      this.volume = this._io.readU2le();
    }
    Object.defineProperty(BthomeSensorVolume.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "mL";
        return this._m_unit;
      }
    });

    return BthomeSensorVolume;
  })();

  var BthomeSensorTimestamp = BthomeServiceData.BthomeSensorTimestamp = (function() {
    function BthomeSensorTimestamp(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorTimestamp.prototype._read = function() {
      this.value = this._io.readU4le();
    }

    return BthomeSensorTimestamp;
  })();

  var BthomeBinaryMoving = BthomeServiceData.BthomeBinaryMoving = (function() {
    function BthomeBinaryMoving(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryMoving.prototype._read = function() {
      this.moving = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryMoving;
  })();

  var BthomeDeviceFwVersionUint24 = BthomeServiceData.BthomeDeviceFwVersionUint24 = (function() {
    function BthomeDeviceFwVersionUint24(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeDeviceFwVersionUint24.prototype._read = function() {
      this.fwVersionPatch = this._io.readU1();
      this.fwVersionMinor = this._io.readU1();
      this.fwVersionMajor = this._io.readU1();
    }

    return BthomeDeviceFwVersionUint24;
  })();

  var BthomeMiscPacketId = BthomeServiceData.BthomeMiscPacketId = (function() {
    function BthomeMiscPacketId(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeMiscPacketId.prototype._read = function() {
      this.packetId = this._io.readU1();
    }

    return BthomeMiscPacketId;
  })();

  var BthomeSensorTemperature01 = BthomeServiceData.BthomeSensor01 = (function() {
    function BthomeSensorTemperature01(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorTemperature01.prototype._read = function() {
      this.value = this._io.readS2le();
    }
    Object.defineProperty(BthomeSensorTemperature01.prototype, 'temperature', {
      get: function() {
        if (this._m_temperature !== undefined)
          return this._m_temperature;
        this._m_temperature = (this.value * 0.1);
        return this._m_temperature;
      }
    });
    Object.defineProperty(BthomeSensorTemperature01.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "\xb0C";
        return this._m_unit;
      }
    });

    return BthomeSensorTemperature01;
  })();

  var BthomeBinaryVibration = BthomeServiceData.BthomeBinaryVibration = (function() {
    function BthomeBinaryVibration(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryVibration.prototype._read = function() {
      this.vibration = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryVibration;
  })();

  var BthomeBinaryBattery = BthomeServiceData.BthomeBinaryBattery = (function() {
    function BthomeBinaryBattery(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryBattery.prototype._read = function() {
      this.battery = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryBattery;
  })();

  var BthomeBinaryPower = BthomeServiceData.BthomeBinaryPower = (function() {
    function BthomeBinaryPower(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryPower.prototype._read = function() {
      this.power = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryPower;
  })();

  var BthomeSensorEnergy0001Uint32 = BthomeServiceData.BthomeSensorEnergy0001Uint32 = (function() {
    function BthomeSensorEnergy0001Uint32(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorEnergy0001Uint32.prototype._read = function() {
      this.value = this._io.readU4le();
    }
    Object.defineProperty(BthomeSensorEnergy0001Uint32.prototype, 'energy', {
      get: function() {
        if (this._m_energy !== undefined)
          return this._m_energy;
        this._m_energy = (this.value * 0.001);
        return this._m_energy;
      }
    });
    Object.defineProperty(BthomeSensorEnergy0001Uint32.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "kWh";
        return this._m_unit;
      }
    });

    return BthomeSensorEnergy0001Uint32;
  })();

  var BthomeBinaryOpening = BthomeServiceData.BthomeBinaryOpening = (function() {
    function BthomeBinaryOpening(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryOpening.prototype._read = function() {
      this.opening = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryOpening;
  })();

  var BthomeSensorPressure001 = BthomeServiceData.BthomeSensorPressure001 = (function() {
    function BthomeSensorPressure001(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorPressure001.prototype._read = function() {
      this.value = new U3(this._io, this, this._root);
    }
    Object.defineProperty(BthomeSensorPressure001.prototype, 'pressure', {
      get: function() {
        if (this._m_pressure !== undefined)
          return this._m_pressure;
        this._m_pressure = (this.value.value * 0.01);
        return this._m_pressure;
      }
    });
    Object.defineProperty(BthomeSensorPressure001.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "hPa";
        return this._m_unit;
      }
    });

    return BthomeSensorPressure001;
  })();

  var BthomeEventButton = BthomeServiceData.BthomeEventButton = (function() {
    function BthomeEventButton(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeEventButton.prototype._read = function() {
      this.event = this._io.readU1();
    }

    return BthomeEventButton;
  })();

  var BthomeSensorCountUint16 = BthomeServiceData.BthomeSensorCountUint16 = (function() {
    function BthomeSensorCountUint16(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorCountUint16.prototype._read = function() {
      this.count = this._io.readU2le();
    }

    return BthomeSensorCountUint16;
  })();

  /**
   * Data with unknown object ID are parsed as a byte array until the end
   */

  var BthomeUnknown = BthomeServiceData.BthomeUnknown = (function() {
    function BthomeUnknown(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeUnknown.prototype._read = function() {
      this.unknown = this._io.readBytesFull();
    }

    return BthomeUnknown;
  })();

  var BthomeSensorTvoc = BthomeServiceData.BthomeSensorTvoc = (function() {
    function BthomeSensorTvoc(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorTvoc.prototype._read = function() {
      this.tvoc = this._io.readU2le();
    }
    Object.defineProperty(BthomeSensorTvoc.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "\xb5g/m\xb3";
        return this._m_unit;
      }
    });

    return BthomeSensorTvoc;
  })();

  var BthomeSensorVolumeStorage = BthomeServiceData.BthomeSensorVolumeStorage = (function() {
    function BthomeSensorVolumeStorage(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorVolumeStorage.prototype._read = function() {
      this.value = this._io.readU4le();
    }
    Object.defineProperty(BthomeSensorVolumeStorage.prototype, 'volumeStorage', {
      get: function() {
        if (this._m_volumeStorage !== undefined)
          return this._m_volumeStorage;
        this._m_volumeStorage = (this.value * 0.001);
        return this._m_volumeStorage;
      }
    });
    Object.defineProperty(BthomeSensorVolumeStorage.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "L";
        return this._m_unit;
      }
    });

    return BthomeSensorVolumeStorage;
  })();

  var BthomeSensorDistanceMm = BthomeServiceData.BthomeSensorDistanceMm = (function() {
    function BthomeSensorDistanceMm(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorDistanceMm.prototype._read = function() {
      this.distance = this._io.readU2le();
    }
    Object.defineProperty(BthomeSensorDistanceMm.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "mm";
        return this._m_unit;
      }
    });

    return BthomeSensorDistanceMm;
  })();

  var BthomeBinaryPresence = BthomeServiceData.BthomeBinaryPresence = (function() {
    function BthomeBinaryPresence(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryPresence.prototype._read = function() {
      this.presence = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryPresence;
  })();

  var BthomeBinaryMoisture = BthomeServiceData.BthomeBinaryMoisture = (function() {
    function BthomeBinaryMoisture(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryMoisture.prototype._read = function() {
      this.moisture = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryMoisture;
  })();

  var BthomeSensorGas = BthomeServiceData.BthomeSensorGas = (function() {
    function BthomeSensorGas(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorGas.prototype._read = function() {
      this.value = new U3(this._io, this, this._root);
    }
    Object.defineProperty(BthomeSensorGas.prototype, 'gas', {
      get: function() {
        if (this._m_gas !== undefined)
          return this._m_gas;
        this._m_gas = (this.value.value * 0.001);
        return this._m_gas;
      }
    });
    Object.defineProperty(BthomeSensorGas.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "m\xb3";
        return this._m_unit;
      }
    });

    return BthomeSensorGas;
  })();

  var BthomeSensorIlluminance001 = BthomeServiceData.BthomeSensorIlluminance001 = (function() {
    function BthomeSensorIlluminance001(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorIlluminance001.prototype._read = function() {
      this.value = new U3(this._io, this, this._root);
    }
    Object.defineProperty(BthomeSensorIlluminance001.prototype, 'illuminance', {
      get: function() {
        if (this._m_illuminance !== undefined)
          return this._m_illuminance;
        this._m_illuminance = (this.value.value * 0.01);
        return this._m_illuminance;
      }
    });
    Object.defineProperty(BthomeSensorIlluminance001.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "lux";
        return this._m_unit;
      }
    });

    return BthomeSensorIlluminance001;
  })();

  var BthomeDeviceFwVersionUint32 = BthomeServiceData.BthomeDeviceFwVersionUint32 = (function() {
    function BthomeDeviceFwVersionUint32(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeDeviceFwVersionUint32.prototype._read = function() {
      this.fwVersionBuild = this._io.readU1();
      this.fwVersionPatch = this._io.readU1();
      this.fwVersionMinor = this._io.readU1();
      this.fwVersionMajor = this._io.readU1();
    }

    return BthomeDeviceFwVersionUint32;
  })();

  var BthomeSensorMassLb001 = BthomeServiceData.BthomeSensorMassLb001 = (function() {
    function BthomeSensorMassLb001(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorMassLb001.prototype._read = function() {
      this.value = this._io.readU2le();
    }
    Object.defineProperty(BthomeSensorMassLb001.prototype, 'mass', {
      get: function() {
        if (this._m_mass !== undefined)
          return this._m_mass;
        this._m_mass = (this.value * 0.01);
        return this._m_mass;
      }
    });
    Object.defineProperty(BthomeSensorMassLb001.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "lb";
        return this._m_unit;
      }
    });

    return BthomeSensorMassLb001;
  })();

  var BthomeSensorTemperature001 = BthomeServiceData.BthomeSensorTemperature001 = (function() {
    function BthomeSensorTemperature001(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorTemperature001.prototype._read = function() {
      this.value = this._io.readS2le();
    }
    Object.defineProperty(BthomeSensorTemperature001.prototype, 'temperature', {
      get: function() {
        if (this._m_temperature !== undefined)
          return this._m_temperature;
        this._m_temperature = (this.value * 0.01);
        return this._m_temperature;
      }
    });
    Object.defineProperty(BthomeSensorTemperature001.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "\xb0C";
        return this._m_unit;
      }
    });

    return BthomeSensorTemperature001;
  })();

  var BthomeBinaryCold = BthomeServiceData.BthomeBinaryCold = (function() {
    function BthomeBinaryCold(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryCold.prototype._read = function() {
      this.cold = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryCold;
  })();

  var Bool8 = BthomeServiceData.Bool8 = (function() {
    function Bool8(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    Bool8.prototype._read = function() {
      this.intValue = this._io.readU1();
    }
    Object.defineProperty(Bool8.prototype, 'value', {
      get: function() {
        if (this._m_value !== undefined)
          return this._m_value;
        this._m_value = ((this.intValue & 1) == 1 ? true : false);
        return this._m_value;
      }
    });

    return Bool8;
  })();

  var BthomeBinaryHeat = BthomeServiceData.BthomeBinaryHeat = (function() {
    function BthomeBinaryHeat(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryHeat.prototype._read = function() {
      this.heat = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryHeat;
  })();

  var BthomeBinaryDoor = BthomeServiceData.BthomeBinaryDoor = (function() {
    function BthomeBinaryDoor(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryDoor.prototype._read = function() {
      this.door = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryDoor;
  })();

  var BthomeBinaryLock = BthomeServiceData.BthomeBinaryLock = (function() {
    function BthomeBinaryLock(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryLock.prototype._read = function() {
      this.lock = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryLock;
  })();

  var U3 = BthomeServiceData.U3 = (function() {
    function U3(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    U3.prototype._read = function() {
      this.lowByte = this._io.readU1();
      this.middleByte = this._io.readU1();
      this.highByte = this._io.readU1();
    }
    Object.defineProperty(U3.prototype, 'value', {
      get: function() {
        if (this._m_value !== undefined)
          return this._m_value;
        this._m_value = ((this.lowByte | (this.middleByte << 8)) | (this.highByte << 16));
        return this._m_value;
      }
    });

    return U3;
  })();

  var BthomeBinaryGarageDoor = BthomeServiceData.BthomeBinaryGarageDoor = (function() {
    function BthomeBinaryGarageDoor(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryGarageDoor.prototype._read = function() {
      this.garageDoor = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryGarageDoor;
  })();

  var BthomeSensorMassKg001 = BthomeServiceData.BthomeSensorMassKg001 = (function() {
    function BthomeSensorMassKg001(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorMassKg001.prototype._read = function() {
      this.value = this._io.readU2le();
    }
    Object.defineProperty(BthomeSensorMassKg001.prototype, 'mass', {
      get: function() {
        if (this._m_mass !== undefined)
          return this._m_mass;
        this._m_mass = (this.value * 0.01);
        return this._m_mass;
      }
    });
    Object.defineProperty(BthomeSensorMassKg001.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "kg";
        return this._m_unit;
      }
    });

    return BthomeSensorMassKg001;
  })();

  var BthomeSensorWater = BthomeServiceData.BthomeSensorWater = (function() {
    function BthomeSensorWater(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorWater.prototype._read = function() {
      this.value = this._io.readU4le();
    }
    Object.defineProperty(BthomeSensorWater.prototype, 'water', {
      get: function() {
        if (this._m_water !== undefined)
          return this._m_water;
        this._m_water = (this.value * 0.001);
        return this._m_water;
      }
    });
    Object.defineProperty(BthomeSensorWater.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "L";
        return this._m_unit;
      }
    });

    return BthomeSensorWater;
  })();

  var BthomeSensorSpeed001 = BthomeServiceData.BthomeSensorSpeed001 = (function() {
    function BthomeSensorSpeed001(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorSpeed001.prototype._read = function() {
      this.value = this._io.readU2le();
    }
    Object.defineProperty(BthomeSensorSpeed001.prototype, 'speed', {
      get: function() {
        if (this._m_speed !== undefined)
          return this._m_speed;
        this._m_speed = (this.value * 0.01);
        return this._m_speed;
      }
    });
    Object.defineProperty(BthomeSensorSpeed001.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "m/s";
        return this._m_unit;
      }
    });

    return BthomeSensorSpeed001;
  })();

  var BthomeSensorRaw = BthomeServiceData.BthomeSensorRaw = (function() {
    function BthomeSensorRaw(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorRaw.prototype._read = function() {
      this.lenValue = this._io.readU1();
      this.value = this._io.readBytes(this.lenValue);
    }

    return BthomeSensorRaw;
  })();

  var BthomeSensorDewpoint001 = BthomeServiceData.BthomeSensorDewpoint001 = (function() {
    function BthomeSensorDewpoint001(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorDewpoint001.prototype._read = function() {
      this.value = this._io.readS2le();
    }
    Object.defineProperty(BthomeSensorDewpoint001.prototype, 'dewPoint', {
      get: function() {
        if (this._m_dewPoint !== undefined)
          return this._m_dewPoint;
        this._m_dewPoint = (this.value * 0.01);
        return this._m_dewPoint;
      }
    });
    Object.defineProperty(BthomeSensorDewpoint001.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "\xb0C";
        return this._m_unit;
      }
    });

    return BthomeSensorDewpoint001;
  })();

  var BthomeBinaryOccupancy = BthomeServiceData.BthomeBinaryOccupancy = (function() {
    function BthomeBinaryOccupancy(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryOccupancy.prototype._read = function() {
      this.occupancy = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryOccupancy;
  })();

  var BthomeSensorCount = BthomeServiceData.BthomeSensorCount = (function() {
    function BthomeSensorCount(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorCount.prototype._read = function() {
      this.count = this._io.readU1();
    }

    return BthomeSensorCount;
  })();

  var BthomeMeasurement = BthomeServiceData.BthomeMeasurement = (function() {
    function BthomeMeasurement(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeMeasurement.prototype._read = function() {
      this.objectId = this._io.readU1();
      switch (this.objectId) {
      case BthomeServiceData.BthomeObjectId.SENSOR_MASS_LB_0_01:
        this.data = new BthomeSensorMassLb001(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_MOVING:
        this.data = new BthomeBinaryMoving(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_MOISTURE:
        this.data = new BthomeBinaryMoisture(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_HUMIDITY_0_01:
        this.data = new BthomeSensorHumidity001(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_DISTANCE_MM:
        this.data = new BthomeSensorDistanceMm(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_UV_INDEX_0_1:
        this.data = new BthomeSensorUvIndex01(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_MOISTURE_0_01:
        this.data = new BthomeSensorMoisture001(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_GAS:
        this.data = new BthomeSensorGas(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_MOTION:
        this.data = new BthomeBinaryMotion(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_ENERGY_0_001:
        this.data = new BthomeSensorEnergy0001(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_TEMPERATURE_0_01:
        this.data = new BthomeSensorTemperature001(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_OPENING:
        this.data = new BthomeBinaryOpening(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_DEWPOINT_0_01:
        this.data = new BthomeSensorDewpoint001(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_SMOKE:
        this.data = new BthomeBinarySmoke(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_VOLUME_STORAGE:
        this.data = new BthomeSensorVolumeStorage(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_CO2:
        this.data = new BthomeSensorCo2(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_SOUND:
        this.data = new BthomeBinarySound(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.MISC_PACKET_ID:
        this.data = new BthomeMiscPacketId(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_VOLUME_FLOW_RATE_0_001:
        this.data = new BthomeSensorVolumeFlowRate0001(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_VOLUME_0_001:
        this.data = new BthomeSensorVolume0001(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_OCCUPANCY:
        this.data = new BthomeBinaryOccupancy(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_DOOR:
        this.data = new BthomeBinaryDoor(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_VOLUME:
        this.data = new BthomeSensorVolume(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_GENERIC_BOOLEAN:
        this.data = new BthomeBinaryGenericBoolean(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_POWER_0_01:
        this.data = new BthomeSensorPower001(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_LIGHT:
        this.data = new BthomeBinaryLight(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_WINDOW:
        this.data = new BthomeBinaryWindow(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_COUNT_UINT32:
        this.data = new BthomeSensorCountUint32(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_CURRENT_0_001:
        this.data = new BthomeSensorCurrent0001(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_MASS_KG_0_01:
        this.data = new BthomeSensorMassKg001(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_PRESENCE:
        this.data = new BthomeBinaryPresence(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_GAS:
        this.data = new BthomeBinaryGas(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_GARAGE_DOOR:
        this.data = new BthomeBinaryGarageDoor(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_CONNECTIVITY:
        this.data = new BthomeBinaryConnectivity(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_PROBLEM:
        this.data = new BthomeBinaryProblem(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_RAW:
        this.data = new BthomeSensorRaw(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_DISTANCE_M_0_1:
        this.data = new BthomeSensorDistanceM01(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_RUNNING:
        this.data = new BthomeBinaryRunning(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.EVENT_BUTTON:
        this.data = new BthomeEventButton(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_TAMPER:
        this.data = new BthomeBinaryTamper(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.DEVICE_FW_VERSION_UINT32:
        this.data = new BthomeDeviceFwVersionUint32(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_VOLTAGE_0_001:
        this.data = new BthomeSensorVoltage0001(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_TIMESTAMP:
        this.data = new BthomeSensorTimestamp(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_PLUG:
        this.data = new BthomeBinaryPlug(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_BATTERY_CHARGING:
        this.data = new BthomeBinaryBatteryCharging(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_TVOC:
        this.data = new BthomeSensorTvoc(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_DURATION_0_001:
        this.data = new BthomeSensorDuration0001(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_LOCK:
        this.data = new BthomeBinaryLock(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_BATTERY:
        this.data = new BthomeSensorBattery(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_COLD:
        this.data = new BthomeBinaryCold(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_PRESSURE_0_01:
        this.data = new BthomeSensorPressure001(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_VOLUME_0_1:
        this.data = new BthomeSensorVolume01(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_VOLTAGE_0_1:
        this.data = new BthomeSensorVoltage01(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_ILLUMINANCE_0_01:
        this.data = new BthomeSensorIlluminance001(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_ACCELERATION:
        this.data = new BthomeSensorAcceleration(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_TEMPERATURE_0_1:
        this.data = new BthomeSensorTemperature01(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.DEVICE_TYPE:
        this.data = new BthomeDeviceType(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.DEVICE_FW_VERSION_UINT24:
        this.data = new BthomeDeviceFwVersionUint24(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_BATTERY:
        this.data = new BthomeBinaryBattery(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_COUNT_UINT16:
        this.data = new BthomeSensorCountUint16(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_GAS_UINT32:
        this.data = new BthomeSensorGasUint32(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_POWER:
        this.data = new BthomeBinaryPower(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_COUNT:
        this.data = new BthomeSensorCount(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_WATER:
        this.data = new BthomeSensorWater(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_HUMIDITY:
        this.data = new BthomeSensorHumidity(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_CARBON_MONOXIDE:
        this.data = new BthomeBinaryCarbonMonoxide(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_HEAT:
        this.data = new BthomeBinaryHeat(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_PM10:
        this.data = new BthomeSensorPm10(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_ROTATION_0_1:
        this.data = new BthomeSensorRotation01(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_SPEED_0_01:
        this.data = new BthomeSensorSpeed001(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_TEXT:
        this.data = new BthomeSensorText(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.EVENT_DIMMER:
        this.data = new BthomeEventDimmer(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_GYROSCOPE:
        this.data = new BthomeSensorGyroscope(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_ENERGY_0_001_UINT32:
        this.data = new BthomeSensorEnergy0001Uint32(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_SAFETY:
        this.data = new BthomeBinarySafety(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.BINARY_VIBRATION:
        this.data = new BthomeBinaryVibration(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_PM2_5:
        this.data = new BthomeSensorPm25(this._io, this, this._root);
        break;
      case BthomeServiceData.BthomeObjectId.SENSOR_MOISTURE:
        this.data = new BthomeSensorMoisture(this._io, this, this._root);
        break;
      default:
        this.data = new BthomeUnknown(this._io, this, this._root);
        break;
      }
    }

    return BthomeMeasurement;
  })();

  var BthomeSensorMoisture = BthomeServiceData.BthomeSensorMoisture = (function() {
    function BthomeSensorMoisture(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorMoisture.prototype._read = function() {
      this.moisture = this._io.readU1();
    }
    Object.defineProperty(BthomeSensorMoisture.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "%";
        return this._m_unit;
      }
    });

    return BthomeSensorMoisture;
  })();

  var BthomeBinaryRunning = BthomeServiceData.BthomeBinaryRunning = (function() {
    function BthomeBinaryRunning(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryRunning.prototype._read = function() {
      this.running = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryRunning;
  })();

  var BthomeBinaryPlug = BthomeServiceData.BthomeBinaryPlug = (function() {
    function BthomeBinaryPlug(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryPlug.prototype._read = function() {
      this.plug = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryPlug;
  })();

  var BthomeSensorPower001 = BthomeServiceData.BthomeSensorPower001 = (function() {
    function BthomeSensorPower001(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorPower001.prototype._read = function() {
      this.value = new U3(this._io, this, this._root);
    }
    Object.defineProperty(BthomeSensorPower001.prototype, 'power', {
      get: function() {
        if (this._m_power !== undefined)
          return this._m_power;
        this._m_power = (this.value.value * 0.01);
        return this._m_power;
      }
    });
    Object.defineProperty(BthomeSensorPower001.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "W";
        return this._m_unit;
      }
    });

    return BthomeSensorPower001;
  })();

  var BthomeBinaryMotion = BthomeServiceData.BthomeBinaryMotion = (function() {
    function BthomeBinaryMotion(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryMotion.prototype._read = function() {
      this.motion = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryMotion;
  })();

  var BthomeBinaryTamper = BthomeServiceData.BthomeBinaryTamper = (function() {
    function BthomeBinaryTamper(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryTamper.prototype._read = function() {
      this.tamper = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryTamper;
  })();

  var BthomeBinaryBatteryCharging = BthomeServiceData.BthomeBinaryBatteryCharging = (function() {
    function BthomeBinaryBatteryCharging(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryBatteryCharging.prototype._read = function() {
      this.batteryCharging = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryBatteryCharging;
  })();

  var BthomeSensorVolume0001 = BthomeServiceData.BthomeSensorVolume0001 = (function() {
    function BthomeSensorVolume0001(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorVolume0001.prototype._read = function() {
      this.value = this._io.readU4le();
    }
    Object.defineProperty(BthomeSensorVolume0001.prototype, 'volume', {
      get: function() {
        if (this._m_volume !== undefined)
          return this._m_volume;
        this._m_volume = (this.value * 0.001);
        return this._m_volume;
      }
    });
    Object.defineProperty(BthomeSensorVolume0001.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "L";
        return this._m_unit;
      }
    });

    return BthomeSensorVolume0001;
  })();

  var BthomeSensorDistanceM01 = BthomeServiceData.BthomeSensorDistanceM01 = (function() {
    function BthomeSensorDistanceM01(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorDistanceM01.prototype._read = function() {
      this.value = this._io.readS2le();
    }
    Object.defineProperty(BthomeSensorDistanceM01.prototype, 'distance', {
      get: function() {
        if (this._m_distance !== undefined)
          return this._m_distance;
        this._m_distance = (this.value * 0.1);
        return this._m_distance;
      }
    });
    Object.defineProperty(BthomeSensorDistanceM01.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "m";
        return this._m_unit;
      }
    });

    return BthomeSensorDistanceM01;
  })();

  var BthomeSensorHumidity = BthomeServiceData.BthomeSensorHumidity = (function() {
    function BthomeSensorHumidity(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorHumidity.prototype._read = function() {
      this.humidity = this._io.readU1();
    }
    Object.defineProperty(BthomeSensorHumidity.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "%";
        return this._m_unit;
      }
    });

    return BthomeSensorHumidity;
  })();

  var BthomeBinaryCarbonMonoxide = BthomeServiceData.BthomeBinaryCarbonMonoxide = (function() {
    function BthomeBinaryCarbonMonoxide(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryCarbonMonoxide.prototype._read = function() {
      this.carbonMonoxide = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryCarbonMonoxide;
  })();

  var BthomeSensorText = BthomeServiceData.BthomeSensorText = (function() {
    function BthomeSensorText(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorText.prototype._read = function() {
      this.lenValue = this._io.readU1();
      this.value = KaitaiStream.bytesToStr(this._io.readBytes(this.lenValue), "UTF-8");
    }

    return BthomeSensorText;
  })();

  var BthomeBinaryLight = BthomeServiceData.BthomeBinaryLight = (function() {
    function BthomeBinaryLight(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryLight.prototype._read = function() {
      this.light = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryLight;
  })();

  var BthomeBinarySafety = BthomeServiceData.BthomeBinarySafety = (function() {
    function BthomeBinarySafety(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinarySafety.prototype._read = function() {
      this.safety = new Bool8(this._io, this, this._root);
    }

    return BthomeBinarySafety;
  })();

  var BthomeSensorHumidity001 = BthomeServiceData.BthomeSensorHumidity001 = (function() {
    function BthomeSensorHumidity001(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorHumidity001.prototype._read = function() {
      this.value = this._io.readU2le();
    }
    Object.defineProperty(BthomeSensorHumidity001.prototype, 'humidity', {
      get: function() {
        if (this._m_humidity !== undefined)
          return this._m_humidity;
        this._m_humidity = (this.value * 0.01);
        return this._m_humidity;
      }
    });
    Object.defineProperty(BthomeSensorHumidity001.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "%";
        return this._m_unit;
      }
    });

    return BthomeSensorHumidity001;
  })();

  var BthomeSensorMoisture001 = BthomeServiceData.BthomeSensorMoisture001 = (function() {
    function BthomeSensorMoisture001(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorMoisture001.prototype._read = function() {
      this.value = this._io.readU2le();
    }
    Object.defineProperty(BthomeSensorMoisture001.prototype, 'moisture', {
      get: function() {
        if (this._m_moisture !== undefined)
          return this._m_moisture;
        this._m_moisture = (this.value * 0.01);
        return this._m_moisture;
      }
    });
    Object.defineProperty(BthomeSensorMoisture001.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "%";
        return this._m_unit;
      }
    });

    return BthomeSensorMoisture001;
  })();

  var BthomeSensorVolumeFlowRate0001 = BthomeServiceData.BthomeSensorVolumeFlowRate0001 = (function() {
    function BthomeSensorVolumeFlowRate0001(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorVolumeFlowRate0001.prototype._read = function() {
      this.value = this._io.readU2le();
    }
    Object.defineProperty(BthomeSensorVolumeFlowRate0001.prototype, 'volumeFlowRate', {
      get: function() {
        if (this._m_volumeFlowRate !== undefined)
          return this._m_volumeFlowRate;
        this._m_volumeFlowRate = (this.value * 0.001);
        return this._m_volumeFlowRate;
      }
    });
    Object.defineProperty(BthomeSensorVolumeFlowRate0001.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "m\xb3/hr";
        return this._m_unit;
      }
    });

    return BthomeSensorVolumeFlowRate0001;
  })();

  var BthomeBinarySmoke = BthomeServiceData.BthomeBinarySmoke = (function() {
    function BthomeBinarySmoke(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinarySmoke.prototype._read = function() {
      this.smoke = new Bool8(this._io, this, this._root);
    }

    return BthomeBinarySmoke;
  })();

  var BthomeSensorUvIndex01 = BthomeServiceData.BthomeSensorUvIndex01 = (function() {
    function BthomeSensorUvIndex01(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorUvIndex01.prototype._read = function() {
      this.value = this._io.readU1();
    }
    Object.defineProperty(BthomeSensorUvIndex01.prototype, 'uvIndex', {
      get: function() {
        if (this._m_uvIndex !== undefined)
          return this._m_uvIndex;
        this._m_uvIndex = (this.value * 0.1);
        return this._m_uvIndex;
      }
    });

    return BthomeSensorUvIndex01;
  })();

  var BthomeBinaryProblem = BthomeServiceData.BthomeBinaryProblem = (function() {
    function BthomeBinaryProblem(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryProblem.prototype._read = function() {
      this.problem = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryProblem;
  })();

  var BthomeSensorVoltage01 = BthomeServiceData.BthomeSensorVoltage01 = (function() {
    function BthomeSensorVoltage01(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorVoltage01.prototype._read = function() {
      this.value = this._io.readU2le();
    }
    Object.defineProperty(BthomeSensorVoltage01.prototype, 'voltage', {
      get: function() {
        if (this._m_voltage !== undefined)
          return this._m_voltage;
        this._m_voltage = (this.value * 0.1);
        return this._m_voltage;
      }
    });
    Object.defineProperty(BthomeSensorVoltage01.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "V";
        return this._m_unit;
      }
    });

    return BthomeSensorVoltage01;
  })();

  var BthomeSensorRotation01 = BthomeServiceData.BthomeSensorRotation01 = (function() {
    function BthomeSensorRotation01(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorRotation01.prototype._read = function() {
      this.value = this._io.readS2le();
    }
    Object.defineProperty(BthomeSensorRotation01.prototype, 'rotation', {
      get: function() {
        if (this._m_rotation !== undefined)
          return this._m_rotation;
        this._m_rotation = (this.value * 0.1);
        return this._m_rotation;
      }
    });
    Object.defineProperty(BthomeSensorRotation01.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "\xb0";
        return this._m_unit;
      }
    });

    return BthomeSensorRotation01;
  })();

  var BthomeBinaryGas = BthomeServiceData.BthomeBinaryGas = (function() {
    function BthomeBinaryGas(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryGas.prototype._read = function() {
      this.gas = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryGas;
  })();

  var BthomeSensorGyroscope = BthomeServiceData.BthomeSensorGyroscope = (function() {
    function BthomeSensorGyroscope(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorGyroscope.prototype._read = function() {
      this.value = this._io.readU2le();
    }
    Object.defineProperty(BthomeSensorGyroscope.prototype, 'gyroscope', {
      get: function() {
        if (this._m_gyroscope !== undefined)
          return this._m_gyroscope;
        this._m_gyroscope = (this.value * 0.001);
        return this._m_gyroscope;
      }
    });
    Object.defineProperty(BthomeSensorGyroscope.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "\xb0/s";
        return this._m_unit;
      }
    });

    return BthomeSensorGyroscope;
  })();

  var BthomeSensorDuration0001 = BthomeServiceData.BthomeSensorDuration0001 = (function() {
    function BthomeSensorDuration0001(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeSensorDuration0001.prototype._read = function() {
      this.value = new U3(this._io, this, this._root);
    }
    Object.defineProperty(BthomeSensorDuration0001.prototype, 'duration', {
      get: function() {
        if (this._m_duration !== undefined)
          return this._m_duration;
        this._m_duration = (this.value.value * 0.001);
        return this._m_duration;
      }
    });
    Object.defineProperty(BthomeSensorDuration0001.prototype, 'unit', {
      get: function() {
        if (this._m_unit !== undefined)
          return this._m_unit;
        this._m_unit = "s";
        return this._m_unit;
      }
    });

    return BthomeSensorDuration0001;
  })();

  var BthomeBinaryGenericBoolean = BthomeServiceData.BthomeBinaryGenericBoolean = (function() {
    function BthomeBinaryGenericBoolean(_io, _parent, _root) {
      this._io = _io;
      this._parent = _parent;
      this._root = _root || this;

      this._read();
    }
    BthomeBinaryGenericBoolean.prototype._read = function() {
      this.genericBoolean = new Bool8(this._io, this, this._root);
    }

    return BthomeBinaryGenericBoolean;
  })();

  return BthomeServiceData;
})();
return BthomeServiceData;
}));

