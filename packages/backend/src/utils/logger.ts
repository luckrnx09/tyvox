import pino from "pino";
import pinoRoll from "pino-roll";
import pretty from "pino-pretty";
import { mkdirSync } from "node:fs";
import { PassThrough } from "node:stream";
import { LOG_DIR, LOG_FILE_RETENTION_COUNT, LOG_FILE_SIZE, LOG_LEVEL } from "../config.js";

mkdirSync(LOG_DIR, { recursive: true });

const loggers = new Map<string, pino.Logger>();

const SOURCE_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const FALLBACK_SOURCE = "unknown";
const MAX_LOGGERS = 32;

function buildMultiStream(source: string): pino.MultiStreamRes {
  const prettyStream = pretty({
    colorize: true,
    translateTime: "HH:MM:ss.l",
    ignore: "pid,hostname",
    singleLine: false,
  });
  const fileBuffer = new PassThrough();
  const streams: pino.StreamEntry[] = [
    { stream: prettyStream, level: "info" },
    { stream: fileBuffer, level: "info" },
  ];
  const multi = pino.multistream(streams);
  void pinoRoll({
    file: `${LOG_DIR}/${source}.log`,
    size: LOG_FILE_SIZE,
    limit: { count: LOG_FILE_RETENTION_COUNT },
    mkdir: true,
  }).then(
    (fileStream) => fileBuffer.pipe(fileStream),
    (error: unknown) => console.error("pino-roll stream failed", error),
  );
  return multi;
}

export function getLogger(source: string): pino.Logger {
  const safeSource = SOURCE_PATTERN.test(source) ? source : FALLBACK_SOURCE;
  if (!loggers.has(safeSource)) {
    if (loggers.size >= MAX_LOGGERS) {
      return getLogger(FALLBACK_SOURCE);
    }
    loggers.set(
      safeSource,
      pino(
        {
          level: LOG_LEVEL,
          base: { source: safeSource },
        },
        buildMultiStream(safeSource),
      ),
    );
  }
  return loggers.get(safeSource)!;
}
