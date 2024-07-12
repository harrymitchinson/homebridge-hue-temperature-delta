declare module 'huejay' {
  type ClientOptions = {
    host: string;
    port?: number;
    username?: string;
    timeout?: number;
  };

  type Sensor = {
    id: number;
    uniqueId: string;
    state: {
      lastUpdated: string;
      temperature: number;
    };
  };

  class Client {
    constructor(options: ClientOptions);
    bridge: {
      ping(): Promise<void>;
      isAuthenticated(): Promise<void>;
    };

    sensors: {
      getById(id: number): Promise<Sensor>;
    };
  }
}
