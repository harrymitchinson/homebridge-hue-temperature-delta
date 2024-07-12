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

import huejay from 'huejay';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { HueTemperatureDeltaPlatformAccessory } from './platformAccessory.js';
import { Config } from './config.js';

export type Context = {
  displayName: string;
  a: huejay.Sensor;
  b: huejay.Sensor;
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

  private _hue?: huejay.Client;
  private async getHueClient(): Promise<huejay.Client> {
    if (this._hue) {
      return this._hue;
    }
    return await this.initHueClient();
  }

  private async initHueClient(): Promise<huejay.Client> {
    this.log.debug('Initializing hue client');
    const client = new huejay.Client({
      host: this.config.hue.host,
      port: this.config.hue.port ?? undefined,
      username: this.config.hue.username,
    });

    this.log.debug('Pinging bridge');
    try {
      await client.bridge.ping();
    } catch (err) {
      this.log.error('Failed to ping bridge:', err);
      throw err;
    }

    this.log.debug('Checking bridge authentication status');
    try {
      await client.bridge.isAuthenticated();
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
      await this.initHueClient();
      await this.discoverDevices();
    });

    this.log.debug('Finished initializing platform:', this.config.name);
  }

  async getSensor(id: number) {
    return await this.getHueClient()
      .then((hue) => hue.sensors.getById(id))
      .catch((err) => {
        this.log.warn('Sensor not found:', id, err);
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

    // loop over the discovered devices and register each one if it has not already been registered
    for (const device of this.config.deltas) {
      const [a, b] = await Promise.all([
        this.getSensor(device.a.id),
        this.getSensor(device.b.id),
      ]);

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
