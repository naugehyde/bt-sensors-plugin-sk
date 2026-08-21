const EventEmitter = require('events')

/**
 * Presents a server BLE-API GATT connection as the slice of the node-ble
 * characteristic interface that sensor classes actually use.
 *
 * Raw-GATT sensors (JikongBMS, JBDBMS, the Renogy family) were written against
 * node-ble: they hold a characteristic in `this.rxChar`/`this.txChar`, call
 * `writeValueWithoutResponse()` on it, and listen for 'valuechanged'. In server
 * BLE-API mode there is no such object -- `app.bleApi.connectGATT()` returns a
 * connection with service/characteristic UUIDs passed per call -- so without a
 * shim the characteristic is undefined: commands throw before they are sent,
 * and inbound notifications are dropped by the `if (this.rxChar ...)` guards.
 *
 * write-without-response is not optional for these boards. A JK-BMS or Daly-BMS
 * rejects write-with-response on its command characteristic with a GATT "Write
 * not permitted", which is why the legacy path calls
 * `writeValueWithoutResponse`. `BLEGattConnection.write()` takes a
 * `withResponse` flag, so that distinction is preserved here rather than
 * flattened to the default.
 *
 * The method shapes mirror @naugehyde/node-ble's GattCharacteristic so callers
 * do not have to know which mode they are in.
 */
class RawGATTCharacteristic extends EventEmitter {
  constructor(conn, serviceUuid, charUuid) {
    super()
    this._conn = conn
    this._service = serviceUuid
    this._uuid = charUuid
  }

  /* node-ble exposes the UUID through an async getUUID(); some call sites read
   * a plain .uuid instead, so provide both. */
  get uuid() {
    return this._uuid
  }

  async getUUID() {
    return this._uuid
  }

  /**
   * @param {Buffer} value
   * @param {number|Object} [optionsOrOffset] - offset, or {offset, type}.
   *   type 'command' means without-response, anything else with-response,
   *   matching node-ble's 'command' vs 'reliable'/'request'.
   */
  async writeValue(value, optionsOrOffset = {}) {
    // node-ble rejects non-buffers here; do the same so a bad caller fails at
    // the call site rather than somewhere inside the transport.
    if (!Buffer.isBuffer(value)) {
      throw new Error('Only buffers can be wrote')
    }
    const options =
      typeof optionsOrOffset === 'number' ? { offset: optionsOrOffset } : optionsOrOffset
    const { offset = 0, type = 'reliable' } = options || {}
    // The BLE API writes whole values; a non-zero offset would silently write
    // to the wrong place, so say so rather than corrupt a command frame.
    if (offset !== 0) {
      throw new Error(
        `RawGATTCharacteristic: offset ${offset} not supported over the server BLE API`
      )
    }
    return this._conn.write(this._service, this._uuid, value, type !== 'command')
  }

  async writeValueWithoutResponse(value, offset = 0) {
    return this.writeValue(value, { offset, type: 'command' })
  }

  async writeValueWithResponse(value, offset = 0) {
    return this.writeValue(value, { offset, type: 'request' })
  }

  async readValue() {
    return this._conn.read(this._service, this._uuid)
  }

  /* Notifications are started by the sensor's initRawGATTConnection(), which
   * routes them into this emitter; this keeps the node-ble shape for callers
   * that start them through the characteristic. */
  async startNotifications() {}

  async stopNotifications() {
    return this._conn.stopNotifications(this._service, this._uuid)
  }
}

module.exports = RawGATTCharacteristic
