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

test('plugin.stop releases the server-side BLE registration', () => {
	//the server's unRegister() closes GATT claims and drops the provider
	//entry; skipping it leaks the registration across plugin restarts
	const fs = require('node:fs')
	const path = require('node:path')
	const src = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8')
	const stopBody = src.slice(src.indexOf('plugin.stop ='))
	assert.match(stopBody, /app\.bleApi\?\.unRegister/,
		'plugin.stop() must call app.bleApi.unRegister(plugin.id)')
})
