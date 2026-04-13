const BleApiDevice = require('./BleApiDevice')

class BleApiDiscovery {
  constructor(app, pluginId) {
    this._app = app
    this._pluginId = pluginId
    this._devices = new Map() // MAC -> BleApiDevice
    this._unsubscribe = null
    this._waiters = [] // {mac, resolve, reject, timeoutId}
  }

  start() {
    this._unsubscribe = this._app.bleApi.onAdvertisement(
      this._pluginId,
      (adv) => this._onAdvertisement(adv)
    )
  }

  stop() {
    if (this._unsubscribe) {
      this._unsubscribe()
      this._unsubscribe = null
    }
    for (const waiter of this._waiters) {
      clearTimeout(waiter.timeoutId)
      waiter.reject(new Error('BLE API discovery stopped'))
    }
    this._waiters = []
  }

  _onAdvertisement(adv) {
    const mac = adv.mac.toUpperCase()

    let device = this._devices.get(mac)
    if (!device) {
      device = new BleApiDevice(mac, this._app, this._pluginId)
      this._devices.set(mac, device)
    }
    device.updateFromAdvertisement(adv)

    // Resolve any pending waitDevice() calls for this MAC
    const pending = this._waiters.filter((w) => w.mac === mac)
    for (const waiter of pending) {
      clearTimeout(waiter.timeoutId)
      waiter.resolve(device)
    }
    this._waiters = this._waiters.filter((w) => w.mac !== mac)
  }

  devices() {
    return Array.from(this._devices.keys())
  }

  waitDevice(mac, timeout) {
    const upperMac = mac.toUpperCase()
    const existing = this._devices.get(upperMac)
    if (existing) {
      return Promise.resolve(existing)
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this._waiters = this._waiters.filter((w) => w !== waiter)
        reject(
          new Error(
            `Device ${mac} not found within ${timeout}ms via BLE API`
          )
        )
      }, timeout)

      const waiter = { mac: upperMac, resolve, reject, timeoutId }
      this._waiters.push(waiter)
    })
  }
}

module.exports = BleApiDiscovery
