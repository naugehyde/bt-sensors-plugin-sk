const EventEmitter = require('node:events')

class MissingAdapter {
    constructor(adapterID) {
        this.adapter = adapterID
        this.helper = {
            _propsProxy: new EventEmitter(),
            _prepare: async () => {},
            callMethod: async () => {}
        }
    }
    async isPowered() { return false }
    async isDiscovering() { return true }
    async devices() { return [] }
    async waitDevice(_mac, timeoutMs) {
        return new Promise((_, reject) =>
            setTimeout(() => reject(new Error('No Bluetooth adapter available')), timeoutMs)
        )
    }
    async setPowered() {}
    async stopDiscovery() {}
}

module.exports = MissingAdapter
