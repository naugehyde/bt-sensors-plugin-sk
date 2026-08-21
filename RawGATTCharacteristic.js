const EventEmitter = require('events')

/**
 * Presents a server BLE-API GATT connection as the small slice of the node-ble
 * characteristic interface that sensor classes actually use.
 *
 * Raw-GATT sensors (JikongBMS, JBDBMS, the Renogy family) were written against
 * node-ble: they hold a characteristic in `this.rxChar`, call
 * `writeValueWithoutResponse()` on it, and listen for 'valuechanged'. In server
 * BLE-API mode there is no such object -- `app.bleApi.connectGATT()` returns a
 * connection with service/characteristic UUIDs passed per call -- so without a
 * shim `this.rxChar` stays undefined: commands throw before they are sent, and
 * inbound notifications are dropped by the `if (this.rxChar ...)` guards.
 *
 * write-without-response is not optional for these boards. A JK-BMS or Daly-BMS
 * rejects write-with-response on its command characteristic with a GATT "Write
 * not permitted", which is why the legacy path calls
 * `writeValueWithoutResponse`. `BLEGattConnection.write()` takes a
 * `withResponse` flag, so that distinction is preserved here rather than
 * flattened to the default.
 */
class RawGATTCharacteristic extends EventEmitter {
  constructor(conn, serviceUuid, charUuid) {
    super()
    this._conn = conn
    this._service = serviceUuid
    this._uuid = charUuid
  }

  get uuid() {
    return this._uuid
  }

  async writeValue(buffer) {
    return this._conn.write(this._service, this._uuid, buffer, true)
  }

  async writeValueWithoutResponse(buffer) {
    return this._conn.write(this._service, this._uuid, buffer, false)
  }

  async readValue() {
    return this._conn.read(this._service, this._uuid)
  }

  /* Notifications are started by the sensor's initRawGATTConnection(), which
   * routes them here; these keep the node-ble shape for callers that expect it. */
  async startNotifications() {}

  async stopNotifications() {
    return this._conn.stopNotifications(this._service, this._uuid)
  }
}

module.exports = RawGATTCharacteristic
