import { join } from "node:path";
import { homedir } from "node:os";

export const APP_DATA_DIR = join(homedir(), ".tyvox");
