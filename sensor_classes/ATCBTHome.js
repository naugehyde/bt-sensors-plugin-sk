const BTHomeServiceData = require("./BTHome/BTHomeServiceData");
const AbstractBTHomeSensor = require("./BTHome/AbstractBTHomeSensor");

/**
 * Xiaomi LYWSD03MMC (and relatives) running pvvx's ATC_MiThermometer firmware
 * with its advertising type set to BTHome.
 *
 * The existing ATC sensor class only understands the two 0x181A layouts
 * (atc1441 and pvvx "Custom"), which it decodes at fixed byte offsets. On
 * BTHome those offsets land on tag bytes rather than values, which silently
 * produces plausible-looking nonsense -- a status advertisement's binary
 * sensor tags read as a temperature, humidity above 100%, and battery reads
 * running past the end of the buffer. This class routes the same devices
 * through the real BTHome parser instead.
 *
 * pvvx has announced that from firmware 6.0 only BTHome v2 will be supported,
 * so this is the path these sensors are moving to, not a special case.
 */
class ATCBTHome extends AbstractBTHomeSensor {
	static Domain = this.SensorDomains.environmental

	static ImageFile = "ATC.jpeg"

	/**
	 * Devices running this firmware advertise as ATC_ plus the last three
	 * bytes of their MAC address.
	 * @type {RegExp}
	 */
	static NAME_REGEX = /^ATC_[A-Fa-f0-9]{6}$/

	static async identify(device) {
		// Both checks are needed: the name alone doesn't distinguish a puck
		// advertising BTHome from one advertising a 0x181A format, which the
		// original ATC class handles correctly.
		if (!(await this.hasBtHomeServiceData(device))) {
			return null
		}
		const name = await this.getDeviceProp(device, "Name")
		if (name && this.NAME_REGEX.test(name)) {
			return this
		}
		return null
	}

	getTextDescription() {
		return `Xiaomi LYWSD03MMC-family thermometer/hygrometer running <b>pvvx</b> custom firmware (<a href="https://github.com/pvvx/ATC_MiThermometer" target="_blank">github.com/pvvx/ATC_MiThermometer</a>) with <b>Advertising Type</b> set to <b>BTHome</b>.<br><br>If the device is set to one of the 0x181A advertising formats (atc1441 or Custom) instead, use the <b>ATC</b> sensor class.`
	}

	/**
	 * The base class's parse helpers look for the object ids the Shelly BLU
	 * H&T emits -- temperature in 0.1 C steps and humidity as a whole-percent
	 * byte. pvvx emits the 0.01-resolution variants instead (object ids 0x02
	 * and 0x03), so those lookups miss and every value comes back null.
	 *
	 * These also test against null rather than truthiness: the base class's
	 * `if (value)` drops a legitimate reading of exactly 0 -- 0.00 C in a
	 * fridge is entirely possible.
	 */
	parseTemperature(btHomeData) {
		const c = this.getSensorDataByObjectId(
			btHomeData,
			BTHomeServiceData.BthomeObjectId.SENSOR_TEMPERATURE_0_01,
		)?.temperature
		if (c === undefined || c === null) {
			return null
		}
		return Number.parseFloat((273.15 + c).toFixed(2))
	}

	parseHumidity(btHomeData) {
		// BTHome reports percent; Signal K wants a 0-1 ratio.
		const pct = this.getSensorDataByObjectId(
			btHomeData,
			BTHomeServiceData.BthomeObjectId.SENSOR_HUMIDITY_0_01,
		)?.humidity
		if (pct === undefined || pct === null) {
			return null
		}
		return Number.parseFloat((pct / 100.0).toFixed(4))
	}

	parseBatteryLevel(btHomeData) {
		const pct = this.getSensorDataByObjectId(
			btHomeData,
			BTHomeServiceData.BthomeObjectId.SENSOR_BATTERY,
		)?.battery
		if (pct === undefined || pct === null) {
			return null
		}
		return Number.parseFloat((pct / 100.0).toFixed(2))
	}

	/**
	 * Cell voltage, carried in the status advertisement rather than the
	 * measurement one -- a better low-battery signal than the percentage.
	 */
	parseVoltage(btHomeData) {
		const v = this.getSensorDataByObjectId(
			btHomeData,
			BTHomeServiceData.BthomeObjectId.SENSOR_VOLTAGE_0_001,
		)?.voltage
		return (v === undefined || v === null) ? null : v
	}

	/**
	 * pvvx alternates between a measurement advertisement (temperature,
	 * humidity, battery) and a status one (voltage, binary sensors). The base
	 * class emits every registered path for every advertisement, so whichever
	 * paths aren't in the current packet would publish null and blank out a
	 * perfectly good reading on every other beat. Emit only what this packet
	 * actually carried; absence is handled by noContactThreshold instead.
	 */
	emitData(tag, buffer, ...args) {
		const md = this.getPath(tag)
		if (!md || !md.read) {
			return
		}
		const value = md.read(buffer, ...args)
		if (value === undefined || value === null) {
			return
		}
		this.emit(tag, value)
	}

	initSchema() {
		super.initSchema()
		this.addDefaultParam("zone")

		this.addDefaultPath("temp", "environment.temperature")
			.read = this.parseTemperature.bind(this)

		this.addDefaultPath("humidity", "environment.relativeHumidity")
			.read = this.parseHumidity.bind(this)

		/**
		 * The same reading, optionally also published at the vessel-level
		 * environment.inside.relativeHumidity. NMEA 2000's HUMIDITY_SOURCE
		 * enum has only Inside/Outside with no zone concept, so
		 * signalk-to-nmea2000's HUMIDITY_INSIDE conversion reads that path
		 * and not a per-zone one. Enable it on whichever single sensor
		 * represents "inside" by naming this path in that peripheral's
		 * config; leaving the key out of a peripheral's `paths` disables it
		 * for that device (see BTSensor.initPaths).
		 *
		 * NB: addDefaultPath's second argument is eval'd against
		 * BTSensor.DEFAULTS (plugin_defaults.json) -- it names a metadata
		 * template, not a Signal K path. Passing a real path throws inside
		 * initSchema() and the sensor silently never initialises.
		 */
		this.addDefaultPath("humidityInside", "environment.relativeHumidity")
			.read = this.parseHumidity.bind(this)

		this.addDefaultPath("battery", "sensors.batteryStrength")
			.read = this.parseBatteryLevel.bind(this)

		this.addDefaultPath("voltage", "sensors.batteryVoltage")
			.read = this.parseVoltage.bind(this)
	}
}

module.exports = ATCBTHome;
