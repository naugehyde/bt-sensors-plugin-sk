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

	
	
	getTextDescription(){
		return `NOTE: Device must be paired with SignalK server machine to operate properly. For more information about the sensor go here: <a href=https://us.shelly.com/products/shelly-blu-h-t-black target="_blank">Shelly Blu H&T</a>.` 
	}
	getImage(){
		return "Shelly-BLU-H-and-T-Black-main-image_a2ddcf07-4408-445e-b256-b1e0d1e3514d.webp"
	}
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
