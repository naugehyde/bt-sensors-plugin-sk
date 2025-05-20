const BTSensor = require("../../BTSensor");
const BTHomeServiceData = require("./BTHomeServiceData");
const KaitaiStream = require("kaitai-struct/KaitaiStream");
/**
 * @typedef ButtonPressEvent {string}
 */
/**
 * Shelly Blu devices support single press and hold press options.
 * @type {Readonly<{PRESS: string, HOLD_PRESS: string}>}
 */

const ButtonPressEvent = Object.freeze({
		PRESS: "press",
		HOLD_PRESS: "hold_press",
	});
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
	 * Returns the `AbstractBTHomeSensor` sensor class if the specified device has been identified as Shelly BLU H&T.
	 *
	 * @param device The Bluetooth device to be identified.
	 * @returns {Promise<AbstractBTHomeSensor|null>} Returns the sensor class if the device has been identified, or null.
	 */
	static async identify(device) {
		if (
			(await this.hasBtHomeServiceData(device)) &&
			(await this.hasName(
				device,
				this.SHORTENED_LOCAL_NAME,
			))
		) {
			return this;
		}
		return null;
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
		const serviceData = await this.getDeviceProp(
			device,
			"ServiceData",
		);
		if (serviceData) {
			if (this.BTHOME_SERVICE_ID in serviceData) {
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
		const deviceName = await this.getDeviceProp(device, "Name");
		if (deviceName) {
			if (deviceName === name) {
				return true;
			}
		}
		return false;
	}
/**
	 * Returns measurement data for the given object ID from the given BTHomeData.
	 *
	 * @param btHomeData {BTHomeServiceData.BthomeServiceData}
	 * @param objectId {number}
	 * @return {any|null} Returns the measurement data for the given object ID, or `null`, if the BTHomeData does not
	 * contain the measurement.
	 */
	getSensorDataByObjectId(btHomeData, objectId) {
		return btHomeData.measurement.find((m) => m.objectId === objectId)?.data;
	}
	/**
	 * Extracts battery level from the given BTHome data.
	 *
	 * @param btHomeData {BTHomeServiceData.BthomeServiceData} The BTHome data provided by the device.
	 * @returns {number|null} The device's battery level as ratio (0‒1).
	 */
	parseBatteryLevel(btHomeData) {
		const batteryLevel = this.getSensorDataByObjectId(
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
	parseTemperature(btHomeData) {
		const tempCelsius = this.getSensorDataByObjectId(
			btHomeData,
			BTHomeServiceData.BthomeObjectId.SENSOR_TEMPERATURE_0_1,
		)?.temperature;
		if (tempCelsius) {
			return Number.parseFloat(
				(this.KELVIN_OFFSET + tempCelsius).toFixed(2),
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
	parseHumidity(btHomeData) {
		const humidity = this.getSensorDataByObjectId(
			btHomeData,
			BTHomeServiceData.BthomeObjectId.SENSOR_HUMIDITY,
		)?.humidity;
		if (humidity) {
			return Number.parseFloat((humidity / 100.0).toFixed(2));
		}
		return null;
	}

	/**
	 * Extracts luminance from the given BTHome data.
	 *
	 * @param btHomeData {BTHomeServiceData.BthomeServiceData} The BTHome data provided by the device.
	 * @returns {number|null} The luminance as float.
	 */
	parseIlluminance(btHomeData) {
		const illuminance = this.getSensorDataByObjectId(
			btHomeData,
			BTHomeServiceData.BthomeObjectId.SENSOR_ILLUMINANCE_0_01,
		)?.illuminance;
		return illuminance;
	}
	/**
	 * Extracts motion detection from the given BTHome data.
	 *
	 * @param btHomeData {BTHomeServiceData.BthomeServiceData} The BTHome data provided by the device.
	 * @returns {Boolean|null} The device's button press state.
	 */
	parseMotion(btHomeData) {
		const motion = this.getSensorDataByObjectId(
			btHomeData,
			BTHomeServiceData.BthomeObjectId.BINARY_MOTION,
		)?.motion;
		return motion.intValue==1
	}
	

	/**
	 * Extracts button press event from the given BTHome data.
	 *
	 * @param btHomeData {BTHomeServiceData.BthomeServiceData} The BTHome data provided by the device.
	 * @returns {BTHomeServiceData.ButtonEventType|null} The device's button press state.
	 */
	parseButton(btHomeData) {
		const buttonEvent = this.getSensorDataByObjectId(
			btHomeData,
			BTHomeServiceData.BthomeObjectId.EVENT_BUTTON,
		)?.event;
		if (buttonEvent) {
			return buttonEvent;
		}
		return null;
	} 

	/**
	 * Parses the relevant button press events for the Shelly BLU H&T from the specified BTHome data. This device only
	 * uses a subset of all available BTHome button press events.
	 *
	 * @param btHomeData {BTHomeServiceData.BthomeServiceData} The BTHome data provided by the device.
	 * @returns {ButtonPressEvent|null} The device's button state.
	 * @see https://shelly-api-docs.shelly.cloud/docs-ble/Devices/ht/#button-press-events
	 * @see https://bthome.io/format/
	 */
	parseShellyButton(btHomeData) {
		const buttonEvent = this.parseButton(btHomeData);
		if (buttonEvent) {
			if (buttonEvent === BTHomeServiceData.ButtonEventType.PRESS) {
				return ButtonPressEvent.PRESS;
				/*
				 * Prior to firmware version 1.0.20, the hold press event is indicated by 0xFE, which does
				 * not conform with the BTHome standard.
				 */
			}
			if (
				buttonEvent === BTHomeServiceData.ButtonEventType.HOLD_PRESS ||
				buttonEvent === 0xfe
			) {
				return ButtonPressEvent.HOLD_PRESS;
			}
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
		const buffer = this.getServiceData(this.constructor.BTHOME_SERVICE_ID);
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
			this.debug(e)
			throw new Error(
				`Unable to parse BTHome data for ${this.getDisplayName()}`,
			);
		}
	}
}

module.exports = AbstractBTHomeSensor;
