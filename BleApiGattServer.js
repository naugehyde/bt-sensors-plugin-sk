const EventEmitter = require('node:events')

class BleApiGattCharacteristic extends EventEmitter {
  constructor(service, charUuid) {
    super()
    this._service = service
    this._uuid = charUuid
    this._notifying = false
    this.helper = new EventEmitter()
    this.helper.removeListeners = () => { this.helper.removeAllListeners() }
  }

  get uuid() {
    return this._uuid
  }

  async readValue() {
    const conn = this._service._server._device._gattConnection
    return conn.read(this._service._uuid, this._uuid)
  }

  async writeValue(buffer, options) {
    const conn = this._service._server._device._gattConnection
    const withResponse = options?.type !== 'command'
    return conn.write(this._service._uuid, this._uuid, buffer, withResponse)
  }

  async writeValueWithoutResponse(buffer) {
    const conn = this._service._server._device._gattConnection
    return conn.write(this._service._uuid, this._uuid, buffer, false)
  }

  async startNotifications() {
    const conn = this._service._server._device._gattConnection
    await conn.startNotifications(
      this._service._uuid,
      this._uuid,
      (data) => {
        this.emit('valuechanged', data)
      }
    )
    this._notifying = true
  }

  async stopNotifications() {
    if (!this._notifying) return
    const conn = this._service._server._device._gattConnection
    await conn.stopNotifications(this._service._uuid, this._uuid)
    this._notifying = false
  }

  isNotifying() {
    return this._notifying
  }
}

class BleApiGattService {
  constructor(server, serviceUuid) {
    this._server = server
    this._uuid = serviceUuid
    this._characteristics = new Map()
    this._discoveredCharUuids = null
    this.helper = new EventEmitter()
    this.helper.removeListeners = () => { this.helper.removeAllListeners() }
  }

  async getCharacteristic(charUuid) {
    if (!this._characteristics.has(charUuid)) {
      this._characteristics.set(
        charUuid,
        new BleApiGattCharacteristic(this, charUuid)
      )
    }
    return this._characteristics.get(charUuid)
  }

  async characteristics() {
    if (!this._discoveredCharUuids) {
      const services = await this._server._discoverServices()
      const svc = services.find((s) => s.uuid === this._uuid)
      this._discoveredCharUuids = svc
        ? svc.characteristics.map((c) => c.uuid)
        : []
    }
    return this._discoveredCharUuids
  }
}

class BleApiGattServer {
  constructor(device) {
    this._device = device
    this._services = new Map()
    this._discoveredServiceUuids = null
    this._discoveredServices = null
    this.helper = new EventEmitter()
    this.helper.removeListeners = () => { this.helper.removeAllListeners() }
  }

  async getPrimaryService(serviceUuid) {
    if (!this._services.has(serviceUuid)) {
      this._services.set(serviceUuid, new BleApiGattService(this, serviceUuid))
    }
    return this._services.get(serviceUuid)
  }

  async services() {
    if (!this._discoveredServiceUuids) {
      const svcs = await this._discoverServices()
      this._discoveredServiceUuids = svcs.map((s) => s.uuid)
    }
    return this._discoveredServiceUuids
  }

  async _discoverServices() {
    if (!this._discoveredServices) {
      const conn = this._device._gattConnection
      this._discoveredServices = conn
        ? await conn.discoverServices()
        : []
    }
    return this._discoveredServices
  }
}

module.exports = BleApiGattServer
