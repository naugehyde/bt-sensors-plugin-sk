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
