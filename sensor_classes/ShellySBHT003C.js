const BTHomeServiceData = require("./BTHome/BTHomeServiceData");
const AbstractBTHomeSensor = require("./BTHome/AbstractBTHomeSensor");

/**
 * Sensor class representing the Shelly BLU H&T.
 *
 * This sensor is publishing data utilising the BTHome format and inherits from {@link AbstractBTHomeSensor}.
 */
class ShellySBHT003C extends AbstractBTHomeSensor {
	/**
	 * The shortened local name as advertised by the Shelly BLU H&T.
	 * @type {string}
	 */
	static SHORTENED_LOCAL_NAME = "SBHT-003C";

	async init() {
		await super.init();
		this.initMetadata();
	}

	/**
	 * @typedef ButtonPressEvent {string}
	 */
	/**
	 * The Shelly BLU H&T only supports single press and hold press options.
	 * @type {Readonly<{PRESS: string, HOLD_PRESS: string}>}
	 */
	static ButtonPressEvent = Object.freeze({
		PRESS: "press",
		HOLD_PRESS: "hold_press",
	});

	/**
	 * Returns the `ShellySBHT003C` sensor class if the specified device has been identified as Shelly BLU H&T.
	 *
	 * @param device The Bluetooth device to be identified.
	 * @returns {Promise<ShellySBHT003C|null>} Returns the sensor class if the device has been identified, or null.
	 */
	static async identify(device) {
		if (
			(await ShellySBHT003C.hasBtHomeServiceData(device)) &&
			(await ShellySBHT003C.hasName(
				device,
				ShellySBHT003C.SHORTENED_LOCAL_NAME,
			))
		) {
			return ShellySBHT003C;
		}
		return null;
	}

	/**
	 * Parses the relevant button press events for the Shelly BLU H&T from the specified BTHome data. This device only
	 * uses a subset of all available BTHome button press events.
	 *
	 * @param btHomeData {BTHomeServiceData.BthomeServiceData} The BTHome data provided by the device.
	 * @returns {ShellySBHT003C.ButtonPressEvent|null} The device's button state.
	 * @see https://shelly-api-docs.shelly.cloud/docs-ble/Devices/ht/#button-press-events
	 * @see https://bthome.io/format/
	 */
	static parseShellySBHT003CButton(btHomeData) {
		const buttonEvent = ShellySBHT003C.parseButton(btHomeData);
		if (buttonEvent) {
			if (buttonEvent === BTHomeServiceData.ButtonEventType.PRESS) {
				return ShellySBHT003C.ButtonPressEvent.PRESS;
				/*
				 * Prior to firmware version 1.0.20, the hold press event is indicated by 0xFE, which does
				 * not conform with the BTHome standard.
				 */
			}
			if (
				buttonEvent === BTHomeServiceData.ButtonEventType.HOLD_PRESS ||
				buttonEvent === 0xfe
			) {
				return ShellySBHT003C.ButtonPressEvent.HOLD_PRESS;
			}
		}
		return null;
	}

	initSchema() {
		super.initSchema()
		this.addDefaultPath(
			"battery",
			"sensors.batteryStrength")
		.read=ShellySBHT003C.parseBatteryLevel

		this.addDefaultPath(
			"temp",
			"environment.temperature"
		)
		.read=ShellySBHT003C.parseTemperature

		this.addDefaultPath(
			"humidity",
			"environment.humidity")
		.read=ShellySBHT003C.parseHumidity,
	
		this.addMetadatum(
			"button",
			"enum",
			"button",
			ShellySBHT003C.parseShellySBHT003CButton,
		)
		.default="sensors.{macAndName}.button"
	}
}

module.exports = ShellySBHT003C;
