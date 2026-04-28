# WattCycle / XDZN BMS — Attribution

The protocol implementation in `protocol.js` is a JavaScript port of
[wattcycle_ble](https://github.com/qume/wattcycle_ble) (MIT, © 2025 Luke),
which itself reverse-engineered the protocol from the
`com.gz.wattcycle` Android APK using `jadx`.

## What was ported

- Modbus CRC16 lookup tables (`CRC_HI`, `CRC_LO`)
- Frame format (`HEAD/VER/ADDR/FUNC/.../CRC/TAIL`)
- Parsers for Analog Quantity (DP `0x008C`), Warning Info (DP `0x008D`),
  Product Info (DP `0x0092`)
- Auth handshake (`HiLink` written to characteristic `FFFA`)

## Protocol reference

See the upstream `PROTOCOL.md`:
https://github.com/qume/wattcycle_ble/blob/main/PROTOCOL.md

## Tested devices

The fixtures in `spec/wattcycle_protocol.test.js` are real captured frames
from an **XDZN_001_EF2F** unit (firmware `WT12_20004SW10_L447`, 4S 314Ah
LiFePO4) provided by the upstream project.

## License

This file and `protocol.js` are derivative works of MIT-licensed code.
Original copyright notice retained per the MIT terms:

> MIT License — Copyright (c) 2025 Luke
