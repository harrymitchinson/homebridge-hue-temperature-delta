export type Sensor = {
  /**
   * Mac address of the sensor
   */
  mac: string;
};

export type Delta = {
  /**
   * The unique ID for the delta sensor
   */
  id: string;
  /**
   * The display name for the delta sensor
   */
  displayName: string;
  /**
   * Whether the delta calculation is inverted
   * @default false
   */
  inverse: boolean;
  /**
   * Sensor A
   */
  a: Sensor;
  /**
   * Sensor B
   */
  b: Sensor;
};

export type Hue = {
  /**
   * The host address of the Hue bridge
   */
  host: string;
  /**
   * The port of the Hue bridge
   * @default 443
   */
  port: number;
  /**
   * The username for Hue bridge
   */
  username: string;
};

export type Config = {
  /**
   * Hue
   */
  hue: Hue;
  /**
   * Deltas
   */
  deltas: Delta[];
  /**
   * Polling interval in milliseconds
   * @default 15000
   */
  interval: number;
};
