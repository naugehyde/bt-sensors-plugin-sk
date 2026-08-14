const EventEmitter = require('node:events')

/**
 * Lightweight Variant-compatible wrapper.
 *
 * BTSensor.valueIfVariant() checks `obj.constructor.name === 'Variant'`
 * and returns obj.value.  We use this class so that valueIfVariant
 * correctly unwraps our data, matching the behavior of the real
 * D-Bus Variant from @jellybrick/dbus-next.
 */
class Variant {
  constructor(value) {
    this.value = value
  }
}

/**
 * Virtual BLE device representing a device discovered via the server's BLE API.
 *
 * Used in BLE API consumer mode where the server's LocalBLEProvider manages
 * the local Bluetooth adapter.  Satisfies the device interface expected by
 * BTSensor for identification and advertisement processing, but does NOT
 * provide GATT methods — GATT goes through app.bleApi.subscribeGATT().
 *
 * Modeled after RemoteDevice.js.
 */
class BLEApiDevice extends EventEmitter {
  constructor(mac, name, initialAdv) {
    super()
    this.mac = mac

    // Plain properties storage
    this._storedProps = {
      Address: mac,
      Name: name || '',
      RSSI: initialAdv?.rssi ?? NaN,
      ManufacturerData: {} // { mfrId: Buffer }
    }

    if (initialAdv?.manufacturer_data) {
      for (const [id, buf] of Object.entries(initialAdv.manufacturer_data)) {
        this._storedProps.ManufacturerData[id] = buf
      }
    }

    // --- helper (mimics node-ble BusHelper) ---
    this.helper = new EventEmitter()
    this.helper.iface = 'org.bluez.Device1'
    this.helper._prepare = () => {}
    this.helper.callMethod = () => {}
    this.helper.removeListeners = (() => {
      this.helper.removeAllListeners()
    }).bind(this.helper)

    // --- _propsProxy (mimics D-Bus Properties interface) ---
    this._propsProxy = {}

    this._propsProxy.GetAll = () => {
      const result = {}
      for (const [k, v] of Object.entries(this._storedProps)) {
        if (k === 'ManufacturerData') {
          const wrapped = {}
          for (const [mfrId, buf] of Object.entries(v)) {
            wrapped[mfrId] = new Variant(buf)
          }
          result[k] = new Variant(wrapped)
        } else {
          result[k] = new Variant(v)
        }
      }
      return result
    }

    this._propsProxy.Get = (_iface, prop) => {
      if (!Object.hasOwn(this._storedProps, prop)) return null

      const v = this._storedProps[prop]
      if (prop === 'ManufacturerData') {
        const wrapped = {}
        for (const [mfrId, buf] of Object.entries(v)) {
          wrapped[mfrId] = new Variant(buf)
        }
        return new Variant(wrapped)
      }
      return new Variant(v)
    }
  }

  /**
   * Update with new advertisement data from the BLE API.
   *
   * @param {Object} adv - { rssi, name, manufacturer_data: { mfrId: Buffer } }
   */
  updateAdvertisement(adv) {
    const props = {}

    if (adv.rssi !== undefined) {
      this._storedProps.RSSI = adv.rssi
      props.RSSI = new Variant(adv.rssi)
    }

    if (adv.name) {
      this._storedProps.Name = adv.name
      props.Name = new Variant(adv.name)
    }

    if (adv.manufacturer_data) {
      for (const [id, buf] of Object.entries(adv.manufacturer_data)) {
        this._storedProps.ManufacturerData[id] = buf
      }
      // BlueZ emits the full accumulated ManufacturerData map on every
      // PropertiesChanged -- mirror that so listeners keep seeing ids
      // from earlier advertisements
      const md = {}
      for (const [id, buf] of Object.entries(this._storedProps.ManufacturerData)) {
        md[id] = new Variant(buf)
      }
      props.ManufacturerData = new Variant(md)
    }

    // Fire the event that BTSensor.initPropertiesChanged listens on
    this.helper.emit('PropertiesChanged', props)
  }

  connect() {}
  disconnect() {}

  async isConnected() {
    return false
  }

  gatt() {
    throw new Error(
      'BLEApiDevice has no local GATT server -- GATT goes through the BLE API (getGATTDescriptor()/needsRawGATT())'
    )
  }

  stopListening() {
    this.removeAllListeners()
    this.helper.removeAllListeners()
  }
}

module.exports = BLEApiDevice
