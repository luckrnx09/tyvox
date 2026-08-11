import { AppError } from "@tyvox/sdk/server";

const SAMPLE_RATE = 16_000;
const CHANNELS = 1;
const BIT_DEPTH = 16;
const VAD_WINDOW_SAMPLES = 512;
const BYTES_PER_SAMPLE = 2;
const MAX_SESSION_BYTES = 32 * 1024 * 1024;
const SESSION_TTL_MS = 10 * 60 * 1000;

function createWavHeader(dataLength: number): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = SAMPLE_RATE * CHANNELS * (BIT_DEPTH / 8);
  const blockAlign = CHANNELS * (BIT_DEPTH / 8);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BIT_DEPTH, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}

interface AudioStream {
  userId: string;
  chunks: Buffer[];
  receivedBytes: number;
  touchedAt: number;
}

const streams = new Map<string, AudioStream>();

function sweepExpiredSessions(now: number): void {
  for (const [sessionId, stream] of streams) {
    if (now - stream.touchedAt > SESSION_TTL_MS) {
      streams.delete(sessionId);
    }
  }
}

function getOwnedStream(userId: string, sessionId: string): AudioStream {
  const stream = streams.get(sessionId);
  if (!stream || stream.userId !== userId) {
    throw new AppError("NO_SPEECH_DETECTED", "No speech detected", 400);
  }
  return stream;
}

export async function appendChunk(
  userId: string,
  sessionId: string,
  chunk: Buffer,
): Promise<number> {
  const now = Date.now();
  sweepExpiredSessions(now);

  let stream = streams.get(sessionId);
  if (stream && stream.userId !== userId) {
    throw new AppError("NO_SPEECH_DETECTED", "No speech detected", 400);
  }
  if (!stream) {
    stream = { userId, chunks: [], receivedBytes: 0, touchedAt: now };
    streams.set(sessionId, stream);
  }
  if (stream.receivedBytes + chunk.length > MAX_SESSION_BYTES) {
    streams.delete(sessionId);
    throw new AppError("RECORDING_TOO_LONG", "Recording exceeds the maximum length", 400);
  }

  stream.chunks.push(chunk);
  stream.receivedBytes += chunk.length;
  stream.touchedAt = now;
  return stream.receivedBytes;
}

export async function assembleAndCleanup(userId: string, sessionId: string): Promise<Buffer> {
  sweepExpiredSessions(Date.now());
  const stream = getOwnedStream(userId, sessionId);

  streams.delete(sessionId);
  const pcmData = padOffVadWindowAlignment(Buffer.concat(stream.chunks));
  const wavHeader = createWavHeader(pcmData.length);
  return Buffer.concat([wavHeader, pcmData]);
}

function padOffVadWindowAlignment(pcm: Buffer): Buffer {
  if ((pcm.length / BYTES_PER_SAMPLE) % VAD_WINDOW_SAMPLES !== 0) {
    return pcm;
  }
  return Buffer.concat([pcm, Buffer.alloc(BYTES_PER_SAMPLE)]);
}
