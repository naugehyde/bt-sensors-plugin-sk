/**
 * Decide where BLE data comes from, mirroring the server's Bluetooth settings:
 *
 * - Server without a BLE API (pre-2.31): scan the local adapter directly,
 *   exactly as previous plugin versions did.
 * - Server manages the local Bluetooth adapter (Server -> Settings ->
 *   Local Bluetooth Adapter is ON): consume the BLE API only. Scanning the
 *   adapter ourselves would race the server's BlueZ discovery and fail with
 *   org.bluez.Error.InProgress.
 * - BLE API present but the server does NOT manage the local adapter:
 *   hybrid -- scan the local adapter ourselves AND listen to the BLE API,
 *   which carries advertisements from remote gateways (e.g. ESP32).
 */
function resolveBleMode(app) {
	if (!app.bleApi)
		return {
			useBleApi: false,
			useLocalAdapter: true,
			reason: "server has no BLE API -- scanning the local Bluetooth adapter directly"
		}
	if (app.bleApi.localBluetoothManaged)
		return {
			useBleApi: true,
			useLocalAdapter: false,
			reason: "server manages the local Bluetooth adapter -- consuming the server BLE API only"
		}
	return {
		useBleApi: true,
		useLocalAdapter: true,
		reason: "server BLE API present, local Bluetooth adapter not server-managed -- scanning locally and listening to the BLE API for gateway devices"
	}
}

module.exports = { resolveBleMode }
