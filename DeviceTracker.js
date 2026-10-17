/**
 * Decides which unconfigured Bluetooth addresses become sensors, and when they stop being one.
 *
 * Most BLE devices advertise from random addresses: non-resolvable ones change on every
 * advertising event, resolvable private ones rotate every ~15 minutes. In a busy marina
 * BlueZ reports hundreds of new addresses an hour. Turning every one into a sensor -- a
 * D-Bus proxy with its own signal subscriptions -- and never dropping it grows the sensor
 * list, the memory, and the work done on every BlueZ signal without bound.
 *
 * So an address is PROMOTED to a sensor only after BlueZ has kept reporting it for
 * promoteAfterMs (a one-off random address is gone from BlueZ's cache within its
 * TemporaryTimeout, 30 s by default), and an unconfigured sensor is EXPIRED once BlueZ
 * has not reported it for expireAfterMs. maxUnconfigured caps what is left.
 * Configured devices are never this tracker's business.
 */
class DeviceTracker {
  constructor({ promoteAfterMs = 60000, expireAfterMs = 300000, maxUnconfigured = 200 } = {}) {
    this.promoteAfterMs = promoteAfterMs
    this.expireAfterMs = expireAfterMs
    this.maxUnconfigured = maxUnconfigured
    this.seen = new Map() // mac -> {first, last}
  }

  /**
   * One scan's worth of addresses.
   * @param {string[]} macs        every address BlueZ currently reports
   * @param {number} now           ms
   * @param {(mac:string)=>boolean} isConfigured
   * @param {Iterable<string>} unconfiguredSensors  macs that are unconfigured sensors now
   * @returns {{promote:string[], expire:string[]}}
   */
  scan(macs, now, isConfigured, unconfiguredSensors) {
    const present = new Set(macs)
    for (const mac of present) {
      const s = this.seen.get(mac)
      if (s) s.last = now
      else this.seen.set(mac, { first: now, last: now })
    }

    const current = new Set(unconfiguredSensors)
    const expire = []
    for (const mac of current) {
      if (isConfigured(mac)) continue
      const s = this.seen.get(mac)
      if (!present.has(mac) && (!s || now - s.last > this.expireAfterMs)) expire.push(mac)
    }
    const kept = [...current].filter((m) => !expire.includes(m) && !isConfigured(m))
    if (kept.length > this.maxUnconfigured) {
      kept.sort((a, b) => (this.seen.get(a)?.last ?? 0) - (this.seen.get(b)?.last ?? 0))
      expire.push(...kept.slice(0, kept.length - this.maxUnconfigured))
    }

    const promote = []
    let room = this.maxUnconfigured - Math.min(kept.length, this.maxUnconfigured)
    for (const mac of present) {
      if (room <= 0) break
      if (isConfigured(mac) || current.has(mac)) continue
      const s = this.seen.get(mac)
      if (now - s.first >= this.promoteAfterMs) {
        promote.push(mac)
        room--
      }
    }

    // Remember only what BlueZ reports now, and the sensors whose expiry is being timed: an
    // address that drops out and comes back starts its promotion clock again.
    for (const mac of this.seen.keys()) {
      if (!present.has(mac) && !current.has(mac)) this.seen.delete(mac)
    }
    for (const mac of expire) this.seen.delete(mac)
    return { promote, expire }
  }
}

module.exports = DeviceTracker
