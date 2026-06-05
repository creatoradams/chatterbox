declare module "tmi.js" {
  export interface ChatUserstate {
    id?: string;
    "display-name"?: string;
    username?: string;
    color?: string;
    mod?: boolean;
    subscriber?: boolean;
    badges?: Record<string, string>;
  }

  export interface Options {
    options?: { debug?: boolean };
    connection?: { secure?: boolean; reconnect?: boolean };
    channels?: string[];
  }

  export class Client {
    constructor(opts: Options);
    on(event: "message", handler: (channel: string, tags: ChatUserstate, message: string, self: boolean) => void): void;
    on(event: "connected", handler: () => void): void;
    on(event: "disconnected", handler: (reason?: string) => void): void;
    connect(): Promise<[string, number]>;
    disconnect(): Promise<[string, number]>;
  }
}
