const BTSensor = require("../../BTSensor");
const BTHomeServiceData = require("./BTHomeServiceData");
const KaitaiStream = require("kaitai-struct/KaitaiStream");

/**
 * Base class for sensors publishing BTHome data.
 *
 * BTHome is an open standard for broadcasting sensor data and button presses over Bluetooth LE.
 *
 * @abstract
 * @see https://bthome.io/
 */
class AbstractBTHomeSensor extends BTSensor {
	/**
	 * Offset from Celsius to Kelvin, used to convert between these units.
	 * 273.15 degrees Kelvin correspond to 0 degrees Celsius.
	 */
	static KELVIN_OFFSET = 273.15;

	/**
	 * BTHome Service identifier
	 *
	 * @type {string} The Service UUID
	 * @see https://bthome.io/images/License_Statement_-_BTHOME.pdf
	 */
	static BTHOME_SERVICE_ID = "0000fcd2-0000-1000-8000-00805f9b34fb";

	/**
	 * Returns measurement data for the given object ID from the given BTHomeData.
	 *
	 * @param btHomeData {BTHomeServiceData.BthomeServiceData}
	 * @param objectId {number}
	 * @return {any|null} Returns the measurement data for the given object ID, or `null`, if the BTHomeData does not
	 * contain the measurement.
	 */
	static getSensorDataByObjectId(btHomeData, objectId) {
		return btHomeData.measurement.find((m) => m.objectId === objectId)?.data;
	}

	/**
	 * Returns whether the specified device's advertisement contains BTHome service data or not.
	 *
	 * This method should be included in the {@link BTSensor#identify} method of inheriting sensor classes.
	 *
	 * @example
	 * static async identify(device) {
	 *   if (await this.hasBtHomeServiceData(device)) {
	 *     // Additional checks to distinguish from other BTHome devices
	 *     return YourSensorClass;
	 *   }
	 *   return null;
	 * }
	 * @see BTSensor#identify
	 * @param device The Bluetooth device to check for BTHome data.
	 * @returns {Promise<boolean>} Returns `true`, if the device exposes BTHome service data, or `false`,
	 * if not.
	 */
	static async hasBtHomeServiceData(device) {
		const serviceData = await AbstractBTHomeSensor.getDeviceProp(
			device,
			"ServiceData",
		);
		if (serviceData) {
			if (AbstractBTHomeSensor.BTHOME_SERVICE_ID in serviceData) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Returns whether the specified device has a given name.
	 *
	 * This method can be included in the {@link BTSensor#identify} method of inheriting sensor classes.
	 *
	 * @example
	 * static async identify(device) {
	 *   if (await this.hasName(device)) {
	 *     // Additional checks, if required
	 *     return YourSensorClass;
	 *   }
	 *   return null;
	 * }
	 * @see BTSensor#identify
	 * @param device The Bluetooth device to check the name.
	 * @param name {string} The name to be checked for.
	 * @returns {Promise<boolean>} Returns `true`, if the device exposes BTHome service data, or `false`,
	 * if not.
	 */
	static async hasName(device, name) {
		const deviceName = await AbstractBTHomeSensor.getDeviceProp(device, "Name");
		if (deviceName) {
			if (deviceName === name) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Extracts battery level from the given BTHome data.
	 *
	 * @param btHomeData {BTHomeServiceData.BthomeServiceData} The BTHome data provided by the device.
	 * @returns {number|null} The device's battery level as ratio (0‒1).
	 */
	static parseBatteryLevel(btHomeData) {
		const batteryLevel = AbstractBTHomeSensor.getSensorDataByObjectId(
			btHomeData,
			BTHomeServiceData.BthomeObjectId.SENSOR_BATTERY,
		)?.battery;
		if (batteryLevel) {
			return Number.parseFloat((batteryLevel / 100.0).toFixed(2));
		}
		return null;
	}

	/**
	 * Extracts temperature from the given BTHome data and converts it to Kelvin for Signal-K.
	 *
	 * @param btHomeData {BTHomeServiceData.BthomeServiceData} The BTHome data provided by the device.
	 * @returns {number|null} The temperature in Kelvin.
	 */
	static parseTemperature(btHomeData) {
		const tempCelsius = AbstractBTHomeSensor.getSensorDataByObjectId(
			btHomeData,
			BTHomeServiceData.BthomeObjectId.SENSOR_TEMPERATURE_0_1,
		)?.temperature;
		if (tempCelsius) {
			return Number.parseFloat(
				(AbstractBTHomeSensor.KELVIN_OFFSET + tempCelsius).toFixed(2),
			);
		}
		return null;
	}

	/**
	 * Extracts humidity from the given BTHome data.
	 *
	 * @param btHomeData {BTHomeServiceData.BthomeServiceData} The BTHome data provided by the device.
	 * @returns {number|null} The relative humidity as ratio (0‒1).
	 */
	static parseHumidity(btHomeData) {
		const humidity = AbstractBTHomeSensor.getSensorDataByObjectId(
			btHomeData,
			BTHomeServiceData.BthomeObjectId.SENSOR_HUMIDITY,
		)?.humidity;
		if (humidity) {
			return Number.parseFloat((humidity / 100.0).toFixed(2));
		}
		return null;
	}

	/**
	 * Extracts button press event from the given BTHome data.
	 *
	 * @param btHomeData {BTHomeServiceData.BthomeServiceData} The BTHome data provided by the device.
	 * @returns {BTHomeServiceData.ButtonEventType|null} The device's button press state.
	 */
	static parseButton(btHomeData) {
		const buttonEvent = AbstractBTHomeSensor.getSensorDataByObjectId(
			btHomeData,
			BTHomeServiceData.BthomeObjectId.EVENT_BUTTON,
		)?.event;
		if (buttonEvent) {
			return buttonEvent;
		}
		return null;
	}

	propertiesChanged(props) {
		super.propertiesChanged(props);

		// Make sure the advertisement contains service data, which is not the case for, e.g., RSSI events
		if (!Object.hasOwn(props, "ServiceData")) {
			return;
		}

		// Retrieve BTHome data
		const buffer = this.getServiceData(AbstractBTHomeSensor.BTHOME_SERVICE_ID);
		if (!buffer) {
			this.debug(
				`ServiceData does not contain BTHome service, which is unexpected for ${this.getDisplayName()}`,
			);
			return;
		}

		try {
			// Parse ServiceData according to the BTHome v2 format (https://bthome.io/format/) and emit sensor data
			const btHomeData = new BTHomeServiceData(new KaitaiStream(buffer));
			this.emitValuesFrom(btHomeData);
		} catch (e) {
			throw new Error(
				`Unable to parse BTHome data for ${this.getDisplayName()}`,
			);
		}
	}
}

module.exports = AbstractBTHomeSensor;
