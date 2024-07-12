import type {
  API,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
} from 'homebridge';

import { APIEvent } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { HueTemperatureDeltaPlatformAccessory } from './platformAccessory.js';
import { Config } from './config.js';
import { HueClient, Sensor } from './hue.js';

export type Context = {
  displayName: string;
  a: Sensor;
  b: Sensor;
  inverse: boolean;
};

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class HueTemperatureDeltaHomebridgePlatform
  implements DynamicPlatformPlugin
{
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly config: Config & PlatformConfig;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory<Context>[] = [];

  private _hue?: HueClient;
  private async getHueClient(): Promise<HueClient> {
    if (this._hue) {
      return this._hue;
    }
    return await this.initHueClient();
  }

  private async initHueClient(): Promise<HueClient> {
    this.log.debug('Initializing hue client');
    const client = new HueClient({
      host: this.config.hue.host,
      port: this.config.hue.port,
      username: this.config.hue.username,
    });

    this.log.debug('Checking bridge authentication status');
    try {
      await client.ping();
    } catch (err) {
      this.log.error('Not authenticated with bridge:', err);
      throw err;
    }

    this._hue = client;
    return client;
  }

  constructor(
    public readonly log: Logging,
    config: PlatformConfig,
    public readonly api: API,
  ) {
    this.config = config as Config & PlatformConfig;
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    if (!log.success) {
      log.success = log.info;
    }

    this.api.on(APIEvent.DID_FINISH_LAUNCHING, async () => {
      try {
        await this.initHueClient();
      } catch (err) {
        return;
      }
      await this.discoverDevices();
    });

    this.log.debug('Finished initializing platform:', this.config.name);
  }

  async getSensor(id: string) {
    return await this.getHueClient()
      .then((hue) => hue.getSensorById(id))
      .catch((err) => {
        this.log.warn(`Failed to get sensor (${id}):`, err);
        return null;
      });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory<Context>) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  async discoverDevices() {
    this.log.debug('Discovering devices:', this.config.name);

    const hue = await this.getHueClient();

    const temperatureSensors = await hue
      .getSensors()
      .then((sensors) =>
        sensors.filter((sensor) => sensor.type == 'ZLLTemperature'),
      );

    // loop over the discovered devices and register each one if it has not already been registered
    for (const device of this.config.deltas) {
      const a = temperatureSensors.find((sensor) =>
        sensor.uniqueid.startsWith(device.a.mac),
      );

      const b = temperatureSensors.find((sensor) =>
        sensor.uniqueid.startsWith(device.b.mac),
      );

      if (a == null || b == null) {
        this.log.warn(
          'Skipping delta as one or more sensor(s) not found:',
          device.id,
        );
        continue;
      }

      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = this.api.hap.uuid.generate(device.id);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(
        (accessory) => accessory.UUID === uuid,
      );

      if (existingAccessory) {
        this.log.info(
          'Restoring existing accessory from cache:',
          existingAccessory.displayName,
        );
        new HueTemperatureDeltaPlatformAccessory(this, existingAccessory);
      } else {
        this.log.info('Adding new accessory:', device.displayName);
        const accessory = new this.api.platformAccessory<Context>(
          device.displayName,
          uuid,
        );

        accessory.context = {
          displayName: device.displayName,
          a,
          b,
          inverse: device.inverse,
        };

        new HueTemperatureDeltaPlatformAccessory(this, accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
          accessory,
        ]);
      }
    }
  }
}
