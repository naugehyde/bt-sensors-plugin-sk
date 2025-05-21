const BTHomeServiceData = require("./BTHome/BTHomeServiceData");
const AbstractBTHomeSensor = require("./BTHome/AbstractBTHomeSensor");

/**
 * Sensor class representing the Shelly BLU H&T.
 *
 * This sensor is publishing data utilising the BTHome format and inherits from {@link AbstractBTHomeSensor}.
 */
class ShellySBHT003C extends AbstractBTHomeSensor {
	static Domain = this.SensorDomains.environmental
		
	/**
	 * The shortened local name as advertised by the Shelly BLU H&T.
	 * @type {string}
	 */
	static SHORTENED_LOCAL_NAME = "SBHT-003C";
	static LOCAL_NAME = "TBD"
	
	initSchema() {
		super.initSchema()
		this.addDefaultParam("zone")

		this.addDefaultPath(
			"battery",
			"sensors.batteryStrength")
		.read=this.parseBatteryLevel.bind(this)

		this.addDefaultPath(
			"temp",
			"environment.temperature"
		)
		.read=this.parseTemperature.bind(this)

		this.addDefaultPath(
			"humidity",
			"environment.humidity")
		.read=this.parseHumidity.bind(this),
	
		this.addMetadatum(
			"button",
			"enum",
			"button",
			this.parseShellyButton.bind(this),
		)
		.default="sensors.{macAndName}.button"
	}
}

module.exports = ShellySBHT003C;
