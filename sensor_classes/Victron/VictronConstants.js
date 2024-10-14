module.exports = { 

  /*Device State?
  0x00: Off
0x01: Low Power Mode,
0x02: Fault,
0x03: Bulk,
0x04: Absorption,
0x05: Float,
0x06: Storage,
0x07: Equalize,
0x08: Passthru,
0x09: Inverting,
0x0A: Assisting,
0x0B: Power Supply Mode,
0x0C-0xFA: Reserved,
0xFB: Test,
0xFC: Hub-1,
0xFD-0xFE: Reserved,
0xFF: Not Available
  */
    OperationMode: new Map([
    [0, 'OFF'],
    [1, 'LOW_POWER'],
    [2, 'FAULT'],
    [3, 'BULK'],
    [4, 'ABSORPTION'],
    [5, 'FLOAT'],
    [6, 'STORAGE'],
    [7, 'EQUALIZE_MANUAL'],
    [9, 'INVERTING'],
    [11, 'POWER_SUPPLY'],
    [245, 'STARTING_UP'],
    [246, 'REPEATED_ABSORPTION'],
    [247, 'RECONDITION'],
    [248, 'BATTERY_SAFE'],
    [252, 'EXTERNAL_CONTROL']
  ]),
  AlarmReason : new Map([
    [0, "NO ALARM"],
    [1, "LOW_VOLTAGE"],
    [2, "HIGH_VOLTAGE"],
    [4, "LOW_SOC"],
    [8, "LOW_STARTER_VOLTAGE"],
    [16, "HIGH_STARTER_VOLTAGE"],
    [32, "LOW_TEMPERATURE"],
    [64, "HIGH_TEMPERATURE"],
    [128, "MID_VOLTAGE"],
    [256, "OVERLOAD"],
    [512, "DC_RIPPLE"],
    [1024, "LOW_V_AC_OUT"],
    [2048, "HIGH_V_AC_OUT"],
    [4096, "SHORT_CIRCUIT"],
    [8192, "BMS_LOCKOUT"]
  ]),
  MeterType : new Map([
    [-9, 'SOLAR_CHARGER'],
    [-8, 'WIND_CHARGER'],
    [-7, 'SHAFT_GENERATOR'],
    [-6, 'ALTERNATOR'],
    [-5, 'FUEL_CELL'],
    [-4, 'WATER_GENERATOR'],
    [-3, 'DC_DC_CHARGER'],
    [-2, 'AC_CHARGER'],
    [-1, 'GENERIC_SOURCE'],
    [1, 'GENERIC_LOAD'],
    [2, 'ELECTRIC_DRIVE'],
    [3, 'FRIDGE'],
    [4, 'WATER_PUMP'],
    [5, 'BILGE_PUMP'],
    [6, 'DC_SYSTEM'],
    [7, 'INVERTER'],
    [8, 'WATER_HEATER']
  ]),
  MODEL_ID_MAP :{
    0x203: "BMV-700",
    0x204: "BMV-702",
    0x205: "BMV-700H",
    0x0300: "BlueSolar MPPT 70|15",
    0xA040: "BlueSolar MPPT 75|50",
    0xA041: "BlueSolar MPPT 150|35",
    0xA042: "BlueSolar MPPT 75|15",
    0xA043: "BlueSolar MPPT 100|15",
    0xA044: "BlueSolar MPPT 100|30",
    0xA045: "BlueSolar MPPT 100|50",
    0xA046: "BlueSolar MPPT 150|70",
    0xA047: "BlueSolar MPPT 150|100",
    0xA049: "BlueSolar MPPT 100|50 rev2",
    0xA04A: "BlueSolar MPPT 100|30 rev2",
    0xA04B: "BlueSolar MPPT 150|35 rev2",
    0xA04C: "BlueSolar MPPT 75|10",
    0xA04D: "BlueSolar MPPT 150|45",
    0xA04E: "BlueSolar MPPT 150|60",
    0xA04F: "BlueSolar MPPT 150|85",
    0xA050: "SmartSolar MPPT 250|100",
    0xA051: "SmartSolar MPPT 150|100",
    0xA052: "SmartSolar MPPT 150|85",
    0xA053: "SmartSolar MPPT 75|15",
    0xA054: "SmartSolar MPPT 75|10",
    0xA055: "SmartSolar MPPT 100|15",
    0xA056: "SmartSolar MPPT 100|30",
    0xA057: "SmartSolar MPPT 100|50",
    0xA058: "SmartSolar MPPT 150|35",
    0xA059: "SmartSolar MPPT 150|100 rev2",
    0xA05A: "SmartSolar MPPT 150|85 rev2",
    0xA05B: "SmartSolar MPPT 250|70",
    0xA05C: "SmartSolar MPPT 250|85",
    0xA05D: "SmartSolar MPPT 250|60",
    0xA05E: "SmartSolar MPPT 250|45",
    0xA05F: "SmartSolar MPPT 100|20",
    0xA060: "SmartSolar MPPT 100|20 48V",
    0xA061: "SmartSolar MPPT 150|45",
    0xA062: "SmartSolar MPPT 150|60",
    0xA063: "SmartSolar MPPT 150|70",
    0xA064: "SmartSolar MPPT 250|85 rev2",
    0xA065: "SmartSolar MPPT 250|100 rev2",
    0xA066: "BlueSolar MPPT 100|20",
    0xA067: "BlueSolar MPPT 100|20 48V",
    0xA068: "SmartSolar MPPT 250|60 rev2",
    0xA069: "SmartSolar MPPT 250|70 rev2",
    0xA06A: "SmartSolar MPPT 150|45 rev2",
    0xA06B: "SmartSolar MPPT 150|60 rev2",
    0xA06C: "SmartSolar MPPT 150|70 rev2",
    0xA06D: "SmartSolar MPPT 150|85 rev3",
    0xA06E: "SmartSolar MPPT 150|100 rev3",
    0xA06F: "BlueSolar MPPT 150|45 rev2",
    0xA070: "BlueSolar MPPT 150|60 rev2",
    0xA071: "BlueSolar MPPT 150|70 rev2",
    0xA102: "SmartSolar MPPT VE.Can 150/70",
    0xA103: "SmartSolar MPPT VE.Can 150/45",
    0xA104: "SmartSolar MPPT VE.Can 150/60",
    0xA105: "SmartSolar MPPT VE.Can 150/85",
    0xA106: "SmartSolar MPPT VE.Can 150/100",
    0xA107: "SmartSolar MPPT VE.Can 250/45",
    0xA108: "SmartSolar MPPT VE.Can 250/60",
    0xA109: "SmartSolar MPPT VE.Can 250/70",
    0xA10A: "SmartSolar MPPT VE.Can 250/85",
    0xA10B: "SmartSolar MPPT VE.Can 250/100",
    0xA10C: "SmartSolar MPPT VE.Can 150/70 rev2",
    0xA10D: "SmartSolar MPPT VE.Can 150/85 rev2",
    0xA10E: "SmartSolar MPPT VE.Can 150/100 rev2",
    0xA10F: "BlueSolar MPPT VE.Can 150/100",
    0xA112: "BlueSolar MPPT VE.Can 250/70",
    0xA113: "BlueSolar MPPT VE.Can 250/100",
    0xA114: "SmartSolar MPPT VE.Can 250/70 rev2",
    0xA115: "SmartSolar MPPT VE.Can 250/100 rev2",
    0xA116: "SmartSolar MPPT VE.Can 250/85 rev2",
    0xA201: "Phoenix Inverter 12V 250VA 230V",
    0xA202: "Phoenix Inverter 24V 250VA 230V",
    0xA204: "Phoenix Inverter 48V 250VA 230V",
    0xA211: "Phoenix Inverter 12V 375VA 230V",
    0xA212: "Phoenix Inverter 24V 375VA 230V",
    0xA214: "Phoenix Inverter 48V 375VA 230V",
    0xA221: "Phoenix Inverter 12V 500VA 230V",
    0xA222: "Phoenix Inverter 24V 500VA 230V",
    0xA224: "Phoenix Inverter 48V 500VA 230V",
    0xA231: "Phoenix Inverter 12V 250VA 230V",
    0xA232: "Phoenix Inverter 24V 250VA 230V",
    0xA234: "Phoenix Inverter 48V 250VA 230V",
    0xA239: "Phoenix Inverter 12V 250VA 120V",
    0xA23A: "Phoenix Inverter 24V 250VA 120V",
    0xA23C: "Phoenix Inverter 48V 250VA 120V",
    0xA241: "Phoenix Inverter 12V 375VA 230V",
    0xA242: "Phoenix Inverter 24V 375VA 230V",
    0xA244: "Phoenix Inverter 48V 375VA 230V",
    0xA249: "Phoenix Inverter 12V 375VA 120V",
    0xA24A: "Phoenix Inverter 24V 375VA 120V",
    0xA24C: "Phoenix Inverter 48V 375VA 120V",
    0xA251: "Phoenix Inverter 12V 500VA 230V",
    0xA252: "Phoenix Inverter 24V 500VA 230V",
    0xA254: "Phoenix Inverter 48V 500VA 230V",
    0xA259: "Phoenix Inverter 12V 500VA 120V",
    0xA25A: "Phoenix Inverter 24V 500VA 120V",
    0xA25C: "Phoenix Inverter 48V 500VA 120V",
    0xA261: "Phoenix Inverter 12V 800VA 230V",
    0xA262: "Phoenix Inverter 24V 800VA 230V",
    0xA264: "Phoenix Inverter 48V 800VA 230V",
    0xA269: "Phoenix Inverter 12V 800VA 120V",
    0xA26A: "Phoenix Inverter 24V 800VA 120V",
    0xA26C: "Phoenix Inverter 48V 800VA 120V",
    0xA271: "Phoenix Inverter 12V 1200VA 230V",
    0xA272: "Phoenix Inverter 24V 1200VA 230V",
    0xA274: "Phoenix Inverter 48V 1200VA 230V",
    0xA279: "Phoenix Inverter 12V 1200VA 120V",
    0xA27A: "Phoenix Inverter 24V 1200VA 120V",
    0xA27C: "Phoenix Inverter 48V 1200VA 120V",
    0xA281: "Phoenix Inverter 12V 1600VA 230V",
    0xA282: "Phoenix Inverter 24V 1600VA 230V",
    0xA284: "Phoenix Inverter 48V 1600VA 230V",
    0xA291: "Phoenix Inverter 12V 2000VA 230V",
    0xA292: "Phoenix Inverter 24V 2000VA 230V",
    0xA294: "Phoenix Inverter 48V 2000VA 230V",
    0xA2A1: "Phoenix Inverter 12V 3000VA 230V",
    0xA2A2: "Phoenix Inverter 24V 3000VA 230V",
    0xA2A4: "Phoenix Inverter 48V 3000VA 230V",
    0xA340: "Phoenix Smart IP43 Charger 12|50 (1+1)",
    0xA341: "Phoenix Smart IP43 Charger 12|50 (3)",
    0xA342: "Phoenix Smart IP43 Charger 24|25 (1+1)",
    0xA343: "Phoenix Smart IP43 Charger 24|25 (3)",
    0xA344: "Phoenix Smart IP43 Charger 12|30 (1+1)",
    0xA345: "Phoenix Smart IP43 Charger 12|30 (3)",
    0xA346: "Phoenix Smart IP43 Charger 24|16 (1+1)",
    0xA347: "Phoenix Smart IP43 Charger 24|16 (3)",
    0xA381: "BMV-712 Smart",
    0xA382: "BMV-710H Smart",
    0xA383: "BMV-712 Smart Rev2",
    0xA389: "SmartShunt 500A/50mV",
    0xA38A: "SmartShunt 1000A/50mV",
    0xA38B: "SmartShunt 2000A/50mV",
    0xA3A4: "Smart Battery Sense",
    0xA3A5: "Smart Battery Sense",
    0xA3B0: "Smart Battery Protect",
    0xA3C0: "Orion Smart 12V|12V-18A Isolated DC-DC Charger",
    0xA3C8: "Orion Smart 12V|12V-30A Isolated DC-DC Charger",
    0xA3D0: "Orion Smart 12V|12V-30A Non-isolated DC-DC Charger",
    0xA3C1: "Orion Smart 12V|24V-10A Isolated DC-DC Charger",
    0xA3C9: "Orion Smart 12V|24V-15A Isolated DC-DC Charger",
    0xA3D1: "Orion Smart 12V|24V-15A Non-isolated DC-DC Charger",
    0xA3C2: "Orion Smart 24V|12V-20A Isolated DC-DC Charger",
    0xA3CA: "Orion Smart 24V|12V-30A Isolated DC-DC Charger",
    0xA3D2: "Orion Smart 24V|12V-30A Non-isolated DC-DC Charger",
    0xA3C3: "Orion Smart 24V|24V-12A Isolated DC-DC Charger",
    0xA3CB: "Orion Smart 24V|24V-17A Isolated DC-DC Charger",
    0xA3D3: "Orion Smart 24V|24V-17A Non-isolated DC-DC Charger",
    0xA3C4: "Orion Smart 24V|48V-6A Isolated DC-DC Charger",
    0xA3CC: "Orion Smart 24V|48V-8.5A Isolated DC-DC Charger",
    0xA3C5: "Orion Smart 48V|12V-20A Isolated DC-DC Charger",
    0xA3CD: "Orion Smart 48V|12V-30A Isolated DC-DC Charger",
    0xA3C6: "Orion Smart 48V|24V-12A Isolated DC-DC Charger",
    0xA3CE: "Orion Smart 48V|24V-16A Isolated DC-DC Charger",
    0xA3C7: "Orion Smart 48V|48V-6A Isolated DC-DC Charger",
    0xA3CF: "Orion Smart 48V|48V-8.5A Isolated DC-DC Charger",
    0xA3E6: "Lynx Smart BMS 1000",
    0x2780: "Victron Multiplus II 12/3000/120-50 2x120V",
    0xC00A: "Cerbo GX",
    0xC030: "SmartShunt IP65 500A/50mV",
    0xeba0: "Smart Lithium Battery",
    
},
AuxMode:{
    STARTER_VOLTAGE: 0,
    MIDPOINT_VOLTAGE: 1,
    TEMPERATURE: 2,
    DISABLED: 3
 },
ChargerError:new Map()
    .set(0,"NO_ERROR")
    .set(1,"TEMPERATURE_BATTERY_HIGH")
    .set(2,"VOLTAGE_HIGH")
    .set(3,"REMOTE_TEMPERATURE_SENSOR_FAILURE_A")
    .set(4, "REMOTE_TEMPERATURE_SENSOR_FAILURE_B")
    .set(5, "REMOTE_TEMPERATURE_SENSOR_FAILURE_C_NO_RESET")
    .set(6, "REMOTE_BATTERY_VOLTAGE_SENSOR_A_FAILURE")
    .set(7,"REMOTE_BATTERY_VOLTAGE_SENSOR_B_FAILURE")
    .set(8,"REMOTE_BATTERY_VOLTAGE_SENSOR_C_FAILURE")
    .set(11, "HIGH_RIPPLE_VOLTAGE")
    .set(14, "TEMPERATURE_BATTERY_LOW")
    .set(17, "TEMPERATURE_CHARGER_HIGH")
    .set(18, "OVER_CURRENT")
    .set(20, "BULK_TIME_LIMIT_EXCEEDED")
    .set(21, "CURRENT_SENSOR_BROKEN")
    .set(22, "INTERNAL_TEMPERATURE_SENSOR_A_FAILURE")
    .set(23, "INTERNAL_TEMPERATURE_SENSOR_B_FAILURE")
    .set(24, "FAN_FAILURE")
    .set(26, "OVERHEATED_TERMINALS")
    .set(27, "SHORT_CIRCUIT")
    .set(28, "CONVERTER_ISSUE")
    .set(29, "OVER_CHARGE_PROTECTION")
    .set(33, "SOLAR_INPUT_VOLTAGE_TOO_HIGH")
    .set(34, "SOLAR_INPUT_CURRENT_TOO_HIGH")
    .set(35, "INPUT_POWER")
    .set(38, "INPUT_SHUTDOWN_OVER_VOLTAGE")
    .set(39, "INPUT_SHUTDOWN_CURRENT")
    .set(40, "INPUT_SHUTDOWN_FAILURE")
    .set(41, "INVERTER_SHUTDOWN_ISOLATION_41")
    .set(42, "INVERTER_SHUTDOWN_ISOLATION_42")
    .set(43, "INVERTER_SHUTDOWN_GROUND_FAULT")
    .set(50, "INVERTER_OVERLOAD")
    .set(51, "INVERTER_TEMPERATURE_TOO_HIGH")
    .set(52, "INVERTER_PEAK_CURRENT")
    .set(53, "INVERTER_OUPUT_VOLTAGE_A")
    .set(54, "INVERTER_OUPUT_VOLTAGE_B")
    .set(55, "INVERTER_SELF_TEST_A")
    .set(56, "INVERTER_SELF_TEST_B")
    .set(57, "INVERTER_AC_VOLTAGE_ON_OUTPUT")
    .set(58, "INVERTER_SELF_TEST_C")
    .set(65, "LOST_COMMUNICATION")
    .set(66, "INCOMPATIBLE_SYNCHRONISATION")
    .set(67, "BMS_CONNECTION_LOST")
    .set(68, "MISCONFIGURED_NETWORK_A")
    .set(69, "MISCONFIGURED_NETWORK_B")
    .set(70, "MISCONFIGURED_NETWORK_C")
    .set(71, "MISCONFIGURED_NETWORK_D")
    .set(80, "PV_INPUT_SHUTDOWN_80")
    .set(81, "PV_INPUT_SHUTDOWN_81")
    .set(82, "PV_INPUT_SHUTDOWN_82")
    .set(83, "PV_INPUT_SHUTDOWN_83")
    .set(84, "PV_INPUT_SHUTDOWN_84")
    .set(85, "PV_INPUT_SHUTDOWN_85")
    .set(86, "PV_INPUT_SHUTDOWN_86")
    .set(87, "PV_INPUT_SHUTDOWN_87")
    .set(114, "CPU_TEMPERATURE_TOO_HIGH")
    .set(116, "CALIBRATION_LOST")
    .set(117, "INVALID_FIRMWARE")
    .set(119, "SETINGS_LOST")
    .set(121, "TESTER_FAIL")
    .set(200, "INTERNAL_DC_VOLTAGE_A")
    .set(201, "INTERNAL_DC_VOLTAGE_B")
    .set(202, "PV_RESIDUAL_CURRENT_SENSOR SELF_TEST")
    .set(203, "INTERNAL_SUPPLY_VOLTAGE_A")
    .set(205, "INTERNAL_SUPPLY_VOLTAGE_B")
    .set(212, "INTERNAL_SUPPLY_VOLTAGE_C")
    .set(215, "INTERNAL_SUPPLY_VOLTAGE_D")
,
OffReasons : new Map([
    [0x00000000, 'NONE'],
    [0x00000001, 'NO_INPUT_POWER'],
    [0x00000002, 'SWITCHED_OFF_SWITCH'],
    [0x00000004, 'SWITCHED_OFF_REGISTER'],
    [0x00000008, 'REMOTE_INPUT'],
    [0x00000010, 'PROTECTION_ACTIVE'],
    [0x00000020, 'PAY_AS_YOU_GO_OUT_OF_CREDIT'],
    [0x00000040, 'BMS'],
    [0x00000080, 'ENGINE_SHUTDOWN'],
    [0x00000081, 'ENGINE_SHUTDOWN_AND_INPUT_VOLTAGE_LOCKOUT'],
    [0x00000100, 'ANALYSING_INPUT_VOLTAGE']
  ]),
  
}
