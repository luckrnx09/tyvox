import { join } from "node:path";
import { APP_DATA_DIR } from "./paths.js";

export const LOG_LEVEL = "info";
export const LOG_DIR = join(APP_DATA_DIR, "logs");
export const LOG_FILE_SIZE = "10m";
export const LOG_FILE_RETENTION_COUNT = 3;
