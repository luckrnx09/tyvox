import { DefaultProviderStrategy } from "./default.js";

const CUSTOM_ID = "custom" as const;
const CUSTOM_NAME = "Custom (OpenAI-compatible)";
const CUSTOM_DEFAULT_BASE_URL = "";

export class CustomProviderStrategy extends DefaultProviderStrategy {
  constructor() {
    super(CUSTOM_ID, CUSTOM_NAME, CUSTOM_DEFAULT_BASE_URL);
  }
}
