const EventEmitter = require('node:events')

// Mimics dbus-next Variant so BTSensor.valueIfVariant() unwraps correctly
// and sensor classes (e.g. VictronSensor) can access .value
class Variant {
  constructor(signature, value) {
    this.signature = signature
    this.value = value
  }
}

class BleApiDeviceHelper extends EventEmitter {
  constructor(device) {
    super()
    this._device = device
  }

  _prepare() {
    // no-op: no D-Bus to prepare
  }

  async callMethod(method) {
    if (method === 'Connect') {
      await this._device._connectGATT()
    } else if (method === 'Disconnect') {
      await this._device._disconnectGATT()
    }
  }

  removeListeners() {
    this.removeAllListeners()
  }
}

class BleApiDevice extends EventEmitter {
  constructor(mac, app, pluginId) {
    super()
    this._mac = mac.toUpperCase()
    this._app = app
    this._pluginId = pluginId
    this._name = null
    this._rssi = NaN
    this._manufacturerData = null
    this._serviceData = null
    this._uuids = []
    this._connectable = false
    this._gattConnection = null
    this._gattServer = null

    this.helper = new BleApiDeviceHelper(this)

    // _propsProxy mimics the D-Bus org.freedesktop.DBus.Properties interface.
    // GetAll() returns {propName: Variant(value)} — BTSensor.getDeviceProps()
    // unwraps via rawProps[propKey].value
    this._propsProxy = {
      GetAll: () => {
        return {
          Address: new Variant('s', this._mac),
          Name: new Variant('s', this._name),
          RSSI: new Variant('n', this._rssi),
          ManufacturerData: new Variant('a{qv}', this._manufacturerData),
          ServiceData: new Variant('a{sv}', this._serviceData),
          UUIDs: new Variant('as', this._uuids),
          Paired: new Variant('b', false),
          Connected: new Variant('b', this._gattConnection?.connected ?? false)
        }
      },
      Get: (iface, prop) => {
        const all = this._propsProxy.GetAll()
        return all[prop] ?? null
      }
    }
  }

  updateFromAdvertisement(adv) {
    if (adv.name) this._name = adv.name
    this._rssi = adv.rssi
    if (adv.connectable !== undefined) this._connectable = adv.connectable
    if (adv.serviceUuids) this._uuids = adv.serviceUuids

    // Build props matching D-Bus PropertiesChanged format:
    //   RSSI: Variant('n', number)
    //   ManufacturerData: Variant('a{qv}', {companyId: Variant('ay', Buffer)})
    //   ServiceData: Variant('a{sv}', {uuid: Variant('ay', Buffer)})
    // This ensures BTSensor.valueIfVariant() and sensor classes work identically
    const props = {}
    props.RSSI = new Variant('n', adv.rssi)

    if (adv.manufacturerData) {
      const md = {}
      for (const [companyId, hexString] of Object.entries(adv.manufacturerData)) {
        const numericId = parseInt(companyId)
        md[numericId] = new Variant('ay', Buffer.from(hexString, 'hex'))
      }
      this._manufacturerData = md
      props.ManufacturerData = new Variant('a{qv}', md)
    }

    if (adv.serviceData) {
      const sd = {}
      for (const [uuid, hexString] of Object.entries(adv.serviceData)) {
        sd[uuid] = new Variant('ay', Buffer.from(hexString, 'hex'))
      }
      this._serviceData = sd
      props.ServiceData = new Variant('a{sv}', sd)
    }

    this.helper.emit('PropertiesChanged', props)
  }

  async _connectGATT() {
    if (this._gattConnection && this._gattConnection.connected) return

    this._gattConnection = await this._app.bleApi.connectGATT(
      this._mac,
      this._pluginId
    )

    this._gattConnection.onDisconnect(() => {
      this.helper.emit('PropertiesChanged', {
        Connected: new Variant('b', false)
      })
      this.emit('disconnect', { connected: false })
    })

    this.helper.emit('PropertiesChanged', {
      Connected: new Variant('b', true)
    })
    this.emit('connect', { connected: true })
  }

  async _disconnectGATT() {
    if (this._gattConnection) {
      await this._gattConnection.disconnect()
      this._gattConnection = null
    }
  }

  async gatt() {
    if (!this._gattServer) {
      const BleApiGattServer = require('./BleApiGattServer')
      this._gattServer = new BleApiGattServer(this)
    }
    return this._gattServer
  }

  async connect() {
    await this._connectGATT()
  }

  async disconnect() {
    await this._disconnectGATT()
  }

  isConnected() {
    return this._gattConnection?.connected ?? false
  }

  removeAllListeners(event) {
    super.removeAllListeners(event)
    return this
  }

  stopListening() {
    this.removeAllListeners()
    this.helper.removeListeners()
  }
}

module.exports = BleApiDevice
