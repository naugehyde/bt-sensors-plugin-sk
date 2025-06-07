const BTHomeServiceData = require("./BTHome/BTHomeServiceData");
const AbstractBTHomeSensor = require("./BTHome/AbstractBTHomeSensor");

/**
 * Sensor class representing the Shelly BLU Motion.
 *
 * This sensor is publishing data utilising the BTHome format and inherits from {@link AbstractBTHomeSensor}.
 */
class ShellySBMO003Z extends AbstractBTHomeSensor {
	static Domain = this.SensorDomains.environmental
		
	/**
	 * The shortened local name as advertised by the Shelly BLU Motion.
	 * @type {string}
	 */
	static SHORTENED_LOCAL_NAME = "SBMO-003Z";

		/**
	 * The local name as advertised by the Shelly BLU Motion after pairing .
	 * @type {string}
	 */
	static LOCAL_NAME="Shelly BLU Motion";

	getDescription(){
		return '<a href=https://us.shelly.com/products/shelly-blu-motion target="_blank">Shelly Blu Motion</a> sensor. NOTE: Device need to be paired with SignalK server machine to operate properly.' 
	}

	initSchema() {
		super.initSchema()
		this.addDefaultParam("zone")


		this.addMetadatum(
			"motion",
			"boolean",
			"motion detected",
			this.parseMotion.bind(this)
		)
		.default="environment.{zone}.motion"

		this.addMetadatum(
			"illuminance",
			"Lux",
			"illuminance in zone",
			this.parseIlluminance.bind(this)
		)
		.default="environment.{zone}.illuminance"


		this.addDefaultPath(
			"battery",
			"sensors.batteryStrength")
		.read=this.parseBatteryLevel.bind(this)


		this.addMetadatum(
			"button",
			"enum",
			"button",
			this.parseShellyButton.bind(this),
		)
		.default="sensors.{macAndName}.button"

/*
		this.addMetadatum(
			"packetID",
			null,
			"packetID from sensor",
			this.parsePacketID.bind(this)
		)
		.default="sensors.{macAndName}.packetID"
*/

	}
}

module.exports = ShellySBMO003Z;
