const test = require('node:test')
const assert = require('node:assert')
const RawGATTCharacteristic = require('../RawGATTCharacteristic.js')

/* A stand-in for the server's BLEGattConnection that records how write() was
 * called, which is the whole point: these boards reject write-with-response. */
function fakeConn() {
  const calls = []
  return {
    calls,
    async write(service, char, data, withResponse) {
      calls.push({ service, char, data, withResponse })
    },
    async read() { return Buffer.alloc(0) },
    async stopNotifications() {},
  }
}

test('writeValueWithoutResponse asks for write-without-response', async () => {
  const conn = fakeConn()
  const c = new RawGATTCharacteristic(conn, 'svc', 'chr')
  await c.writeValueWithoutResponse(Buffer.from([0xaa, 0x55]))

  assert.strictEqual(conn.calls.length, 1)
  const call = conn.calls[0]
  assert.strictEqual(call.service, 'svc')
  assert.strictEqual(call.char, 'chr')
  assert.deepStrictEqual(call.data, Buffer.from([0xaa, 0x55]))
  // The assertion that matters: JK-BMS and Daly-BMS answer a
  // write-with-response on their command characteristic with GATT
  // "Write not permitted".
  assert.strictEqual(call.withResponse, false)
})

test('writeValue still asks for write-with-response', async () => {
  const conn = fakeConn()
  const c = new RawGATTCharacteristic(conn, 'svc', 'chr')
  await c.writeValue(Buffer.from([0x01]))
  assert.strictEqual(conn.calls[0].withResponse, true)
})

test('write mode maps from the node-ble options form', async () => {
  const conn = fakeConn()
  const c = new RawGATTCharacteristic(conn, 'svc', 'chr')
  // node-ble spells without-response as type 'command'.
  await c.writeValue(Buffer.from([1]), { type: 'command' })
  assert.strictEqual(conn.calls[0].withResponse, false)
  await c.writeValue(Buffer.from([1]), { type: 'request' })
  assert.strictEqual(conn.calls[1].withResponse, true)
  // Bare offset form, as RenogySensor uses.
  await c.writeValue(Buffer.from([1]), 0)
  assert.strictEqual(conn.calls[2].withResponse, true)
})

test('writeValueWithResponse exists and asks for a response', async () => {
  const conn = fakeConn()
  const c = new RawGATTCharacteristic(conn, 'svc', 'chr')
  await c.writeValueWithResponse(Buffer.from([1]))
  assert.strictEqual(conn.calls[0].withResponse, true)
})

/* The BLE API writes whole values. Silently dropping a non-zero offset would
 * write a command frame to the wrong place. */
test('a non-zero offset is rejected rather than ignored', async () => {
  const conn = fakeConn()
  const c = new RawGATTCharacteristic(conn, 'svc', 'chr')
  await assert.rejects(() => c.writeValueWithoutResponse(Buffer.from([1]), 4), /offset/)
  assert.strictEqual(conn.calls.length, 0)
})

test('a non-buffer value is rejected, as node-ble does', async () => {
  const conn = fakeConn()
  const c = new RawGATTCharacteristic(conn, 'svc', 'chr')
  await assert.rejects(() => c.writeValue('nope'), /buffer/i)
  assert.strictEqual(conn.calls.length, 0)
})

test('getUUID matches the node-ble async accessor', async () => {
  const c = new RawGATTCharacteristic(fakeConn(), 'svc', 'chr')
  assert.strictEqual(await c.getUUID(), 'chr')
  assert.strictEqual(c.uuid, 'chr')
})

test('notifications reach valuechanged listeners', async () => {
  const conn = fakeConn()
  const c = new RawGATTCharacteristic(conn, 'svc', 'chr')
  const seen = []
  c.on('valuechanged', (d) => seen.push(d))
  c.emit('valuechanged', Buffer.from([0x11]))
  assert.deepStrictEqual(seen, [Buffer.from([0x11])])
})

/* The bug this fixes: initRawGATTConnection() left rxChar undefined, so the
 * notification handler's `if (this.rxChar ...)` guard dropped every frame and
 * sendReadFunctionRequest() threw before a command was ever sent. */
test('JikongBMS raw GATT init wires rxChar to the connection', async () => {
  const JikongBMS = require('../sensor_classes/JikongBMS.js')
  const sensor = Object.create(JikongBMS.prototype)
  const conn = fakeConn()
  conn.startNotifications = async () => {}
  conn.onDisconnect = () => {}
  sensor.setConnected = () => {}

  await JikongBMS.prototype.initRawGATTConnection.call(sensor, conn)

  assert.ok(sensor.rxChar, 'rxChar must exist after raw GATT init')
  assert.strictEqual(sensor.rxChar.uuid, JikongBMS.RX_CHAR_UUID)
  await sensor.rxChar.writeValueWithoutResponse(Buffer.from([0x01]))
  assert.strictEqual(conn.calls[0].withResponse, false)
})

test('JBDBMS raw GATT init wires rxChar and txChar to their own characteristics', async () => {
  const JBDBMS = require('../sensor_classes/JBDBMS.js')
  const sensor = Object.create(JBDBMS.prototype)
  const conn = fakeConn()
  conn.startNotifications = async () => {}
  conn.onDisconnect = () => {}
  sensor.setConnected = () => {}

  await JBDBMS.prototype.initRawGATTConnection.call(sensor, conn)

  // JBD splits the directions: notify on ff01, commands out on ff02.
  assert.strictEqual(sensor.rxChar.uuid, JBDBMS.NOTIFY_CHAR_UUID)
  assert.strictEqual(sensor.txChar.uuid, JBDBMS.WRITE_CHAR_UUID)
  await sensor.txChar.writeValueWithoutResponse(Buffer.from([0xdd]))
  assert.strictEqual(conn.calls[0].char, JBDBMS.WRITE_CHAR_UUID)
  assert.strictEqual(conn.calls[0].withResponse, false)
})

/* deactivateGATT() released the connection but left the characteristic shims
 * in place, so a reconnect built new ones while the old objects kept any
 * listeners still attached and could still write to a reclaimed connection. */
test('deactivateGATT clears the characteristic shims', async () => {
  const BTSensor = require('../BTSensor.js')
  const sensor = Object.create(BTSensor.prototype)
  const conn = fakeConn()

  sensor._rawConn = conn
  sensor.rxChar = new RawGATTCharacteristic(conn, 'svc', 'rx')
  sensor.txChar = new RawGATTCharacteristic(conn, 'svc', 'tx')
  sensor.rxChar.on('valuechanged', () => {})
  sensor.debug = () => {}
  sensor.setConnected = () => {}
  sensor.getMacAddress = () => 'AA:BB:CC:DD:EE:FF'
  sensor._app = { bleApi: { releaseGATTDevice: async () => {} } }

  await BTSensor.prototype.deactivateGATT.call(sensor)

  assert.strictEqual(sensor._rawConn, null)
  assert.strictEqual(sensor.rxChar, null, 'rxChar must not outlive the connection')
  assert.strictEqual(sensor.txChar, null, 'txChar must not outlive the connection')
})
