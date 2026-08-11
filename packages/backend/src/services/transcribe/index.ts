import { appendChunk, assembleAndCleanup } from "./stream.js";
import { transcribeAudio } from "../asr/index.js";
import { getUserConfig } from "../user-config/index.js";
import { recordingRepository } from "../../repositories/index.js";
import { getLogger } from "../../utils/logger.js";

const logger = getLogger("system");

export async function sendTranscribeChunk(userId: string, sessionId: string, chunk: Buffer) {
  const receivedBytes = await appendChunk(userId, sessionId, chunk);
  return { receivedBytes };
}

export async function finalizeTranscribe(userId: string, sessionId: string) {
  const config = await getUserConfig(userId);
  const wavBuffer = await assembleAndCleanup(userId, sessionId);
  const recordingPath = await recordingRepository.save(userId, sessionId, wavBuffer);
  logger.info({ sessionId, wavBytes: wavBuffer.length, recordingPath }, "Recording saved");
  return transcribeAudio(wavBuffer, config.speech);
}
