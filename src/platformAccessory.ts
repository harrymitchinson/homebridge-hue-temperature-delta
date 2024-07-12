import { Service, PlatformAccessory } from 'homebridge';
import { Context, HueTemperatureDeltaHomebridgePlatform } from './platform.js';

export class HueTemperatureDeltaPlatformAccessory {
  private service: Service;
  private delta = 0;

  constructor(
    private readonly platform: HueTemperatureDeltaHomebridgePlatform,
    private readonly accessory: PlatformAccessory<Context>,
  ) {
    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(
        this.platform.Characteristic.Manufacturer,
        'Default-Manufacturer',
      )
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        'Default-Serial',
      );

    this.service =
      this.accessory.getService(this.platform.Service.TemperatureSensor) ||
      this.accessory.addService(this.platform.Service.TemperatureSensor);

    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      this.accessory.context.displayName,
    );

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.handleCurrentTemperatureGet.bind(this));

    setInterval(async () => {
      const [a, b] = await Promise.all([
        this.platform.getSensor(this.accessory.context.a.id),
        this.platform.getSensor(this.accessory.context.b.id),
      ]);
      if (a == null || b == null) {
        return;
      }

      if (this.accessory.context.inverse) {
        this.delta = b.state.temperature - a.state.temperature;
      } else {
        this.delta = a.state.temperature - b.state.temperature;
      }
    }, this.platform.config.interval);
  }

  handleCurrentTemperatureGet() {
    return this.delta;
  }
}
