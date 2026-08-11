declare module "pino-roll" {
  import type { Writable } from "node:stream";

  interface PinoRollOptions {
    file: string;
    size?: string | number;
    limit?: { count?: number };
    mkdir?: boolean;
  }

  function build(options: PinoRollOptions): Promise<Writable>;

  export default build;
}
