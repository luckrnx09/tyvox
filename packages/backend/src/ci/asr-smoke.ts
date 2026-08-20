import type { SpeechConfig } from "@tyvox/sdk/contracts";
import { createASRProvider } from "../services/asr/registry.js";
import { EXAMPLE_AUDIO_WAV_BASE64 } from "../services/asr/example-audio.js";

const MODEL_ID = "small";
const config: SpeechConfig = { provider: "sensevoice:small", languages: [] };

const provider = createASRProvider(config);

console.log(`Preparing sensevoice:${MODEL_ID} ...`);
let lastLoggedPercent = -1;
await provider.prepare(MODEL_ID, (progress) => {
  const percent = Math.floor(progress * 100);
  if (percent > lastLoggedPercent) {
    lastLoggedPercent = percent;
    console.log(`progress: ${percent}%`);
  }
});

const status = await provider.status(MODEL_ID);
console.log("status:", JSON.stringify(status));
if (status.status !== "ready") {
  throw new Error(`Model not ready after prepare: ${JSON.stringify(status)}`);
}

console.log("Running readiness transcription ...");
const result = await provider.transcribe(Buffer.from(EXAMPLE_AUDIO_WAV_BASE64, "base64"));
console.log("transcription:", JSON.stringify(result.text));
if (!result.text.trim()) {
  throw new Error("Readiness transcription returned empty text");
}

console.log("CI ASR smoke test passed");
