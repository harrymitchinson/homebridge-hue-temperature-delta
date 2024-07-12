export type Sensor = {
  state: {
    temperature: number;
  };
  type: 'ZLLTemperature';
  uniqueid: string;
  id: string;
};

export type ClientOptions = {
  host: string;
  port: number;
  username: string;
};

export class HueClient {
  private baseUrl: string;
  private username: string;

  constructor({ host, port, username }: ClientOptions) {
    this.baseUrl = `https://${host}:${port}`;
    this.username = username;
  }

  async ping(): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/api/${this.username}/info/timezones`,
    );

    if (res.status != 200) {
      throw new Error(`Failed to ping: ${res.status}`);
    }
  }

  async getSensors(): Promise<Sensor[]> {
    const res = await fetch(`${this.baseUrl}/api/${this.username}/sensors`);

    if (res.status != 200) {
      throw new Error(`Failed to get sensors: ${res.status}`);
    }

    const data: { [key: string]: Sensor } = await res.json();
    return Object.entries(data).map(([id, sensor]) => ({ ...sensor, id }));
  }

  async getSensorById(id: string): Promise<Sensor> {
    const res = await fetch(
      `${this.baseUrl}/api/${this.username}/sensors/${id}`,
    );

    if (res.status != 200) {
      throw new Error(`Failed to get sensor (${id}): ${res.status}`);
    }

    const data: Sensor = await res.json();
    return { ...data, id };
  }
}
