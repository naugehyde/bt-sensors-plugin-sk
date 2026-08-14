const { test } = require('node:test')
const assert = require('node:assert')
const { resolveBleMode } = require('../bleMode.js')

test('server without BLE API: legacy local scan only', () => {
	const mode = resolveBleMode({})
	assert.strictEqual(mode.useBleApi, false)
	assert.strictEqual(mode.useLocalAdapter, true)
	assert.match(mode.reason, /no BLE API/)
})

test('server manages the local adapter: BLE API only', () => {
	const mode = resolveBleMode({ bleApi: { localBluetoothManaged: true } })
	assert.strictEqual(mode.useBleApi, true)
	assert.strictEqual(mode.useLocalAdapter, false)
	assert.match(mode.reason, /manages the local Bluetooth adapter/)
})

test('BLE API present, adapter not server-managed: hybrid', () => {
	const mode = resolveBleMode({ bleApi: { localBluetoothManaged: false } })
	assert.strictEqual(mode.useBleApi, true)
	assert.strictEqual(mode.useLocalAdapter, true)
	assert.match(mode.reason, /scanning locally and listening/)
})

test('localBluetoothManaged is read as a live value, not cached', () => {
	//the plugin polls this getter to notice server settings changes
	let managed = true
	const app = { bleApi: { get localBluetoothManaged() { return managed } } }
	assert.strictEqual(resolveBleMode(app).useLocalAdapter, false)
	managed = false
	assert.strictEqual(resolveBleMode(app).useLocalAdapter, true)
})
