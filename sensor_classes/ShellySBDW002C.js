const BTHomeServiceData = require("./BTHome/BTHomeServiceData");
const AbstractBTHomeSensor = require("./BTHome/AbstractBTHomeSensor");

/**
 * Sensor class representing the Shelly BLU Door/Window.
 * Specification on @see https://shelly-api-docs.shelly.cloud/docs-ble/Devices/dw
 * This sensor is publishing data utilising the BTHome format and inherits from {@link AbstractBTHomeSensor}.
 */
class ShellySBDW002C extends AbstractBTHomeSensor {
  static Domain = this.SensorDomains.environmental;

  /**
   * The shortened local name as advertised by the Shelly BLU H&T.
   * @type {string}
   */
  static SHORTENED_LOCAL_NAME = "SBDW-002C";
  static LOCAL_NAME = "Shelly BLU Door/Window";

  static ImageFile="ShellyBluDoorWindow.webp"

  getTextDescription() {
    return `For more information about the sensor go here: <a href=https://us.shelly.com/products/shelly-blu-door-window-white target="_blank">Shelly Blu Door/Window</a>.`;
  }

  initSchema() {
    super.initSchema();
    this.addDefaultParam("zone", true).default = "cabin";

    this.addParameter("opening", {
      title: "Name of opening",
      examples: ["companionWay", "porthole", "hatch"],
      isRequired: true,
      default: "companionWay",
    });

    this.addMetadatum("opening", "", "state of opening (door/window) as 'open' or 'closed'; null if not present. ", this.parseWindowState.bind(this)).default =
      "environment.{zone}.{opening}.state";

    // The second parameter is not the signalk path, but a JSON object in plugin_defaults.json; that provides the default signalk path
    this.addDefaultPath("battery", "sensors.batteryStrength").read = this.parseBatteryLevel.bind(this);

    this.addMetadatum("illuminance", "lx", "illuminance measured in lux, scaled 0.01", this.parseIlluminance.bind(this)).default =
      "sensors.{macAndName}.illuminance";

    this.addMetadatum("rotation", "deg", "rotation in degrees from the closed position; null if not present", this.parseRotation.bind(this)).default =
      "sensors.{macAndName}.rotation";

    this.addMetadatum("button", "", "button 'press' or 'hold_press'; null if not present", this.parseShellyButton.bind(this)).default =
      "sensors.{macAndName}.button";
  }
}

module.exports = ShellySBDW002C;
