export type Sensor = {
	/**
	 * Hue ID of the Sensor
	 */
	id: number;
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
	 */
	port?: number;
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
