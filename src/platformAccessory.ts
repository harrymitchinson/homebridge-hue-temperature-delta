import { Service, PlatformAccessory } from 'homebridge';
import { Context, HueTemperatureDeltaHomebridgePlatform } from './platform.js';

export class HueTemperatureDeltaPlatformAccessory {
  private service: Service;
  private delta: number;

  constructor(
    private readonly platform: HueTemperatureDeltaHomebridgePlatform,
    private readonly accessory: PlatformAccessory<Context>,
  ) {
    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(
        this.platform.Characteristic.Manufacturer,
        'Hue Temperature Delta',
      )
      .setCharacteristic(this.platform.Characteristic.Model, 'v0')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        '00000000-0000-0000-0000-000000000000',
      );

    this.service =
      this.accessory.getService(this.platform.Service.TemperatureSensor) ||
      this.accessory.addService(this.platform.Service.TemperatureSensor);

    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      this.accessory.context.displayName,
    );

    this.delta = this.accessory.context.initialDelta;

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

      let delta: number;
      if (this.accessory.context.inverse) {
        delta = (b.state.temperature - a.state.temperature) / 100;
      } else {
        delta = (a.state.temperature - b.state.temperature) / 100;
      }
      this.delta = delta;

      this.platform.log.debug('Sensor A:', a.state.temperature);
      this.platform.log.debug('Sensor B:', b.state.temperature);
      this.platform.log.debug('Delta:', this.delta);
    }, this.platform.config.interval);
  }

  handleCurrentTemperatureGet() {
    return this.delta;
  }
}
