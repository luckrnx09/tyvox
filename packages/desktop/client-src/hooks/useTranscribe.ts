import { useState, useCallback, useRef } from "react";
import {
  sendTranscribeChunk,
  finalizeTranscribe,
  type FinalizeTranscribeOutput,
  ApiError,
} from "@tyvox/sdk/client";
import type { CapsuleError } from "../../shared/types/ipc";
import { logger } from "../utils/logger";

export type TranscribeState = "idle" | "recording" | "finalizing" | "done" | "error";

const RECOVERABLE_CODES = new Set([
  "NO_SPEECH_DETECTED",
  "TRANSCRIPTION_ERROR",
  "PROVIDER_NOT_AVAILABLE",
  "PROVIDER_INIT_ERROR",
  "MODEL_NOT_DOWNLOADED",
]);

export function useTranscribe() {
  const [state, setState] = useState<TranscribeState>("idle");
  const [result, setResult] = useState<FinalizeTranscribeOutput | null>(null);
  const [error, setError] = useState<CapsuleError | null>(null);
  const sessionIdRef = useRef<string>("");

  const startSession = useCallback((sessionId: string) => {
    sessionIdRef.current = sessionId;
    setState("recording");
    setResult(null);
    return sessionIdRef.current;
  }, []);

  const sendChunk = useCallback(async (pcm: ArrayBuffer) => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    await sendTranscribeChunk(sid, new Blob([pcm]));
  }, []);

  const finalize = useCallback(async (): Promise<FinalizeTranscribeOutput> => {
    const sid = sessionIdRef.current;
    if (!sid) throw new Error("No active session");

    setState("finalizing");
    try {
      const response = await finalizeTranscribe(sid);
      const data = response.data as FinalizeTranscribeOutput;
      setResult(data);
      setState("done");
      logger.info("Transcription result", { result: data });
      return data;
    } catch (err) {
      const code =
        err instanceof ApiError ? (err.code ?? "TRANSCRIPTION_ERROR") : "TRANSCRIPTION_ERROR";
      const message = err instanceof Error ? err.message : "Transcription failed";
      const recoverable = RECOVERABLE_CODES.has(code);
      const transcribeError: CapsuleError = { code, message, recoverable };
      setError(transcribeError);
      setState("error");
      throw transcribeError;
    }
  }, []);

  const reset = useCallback(() => {
    sessionIdRef.current = "";
    setState("idle");
    setResult(null);
    setError(null);
  }, []);

  return { state, result, error, startSession, sendChunk, finalize, reset };
}
