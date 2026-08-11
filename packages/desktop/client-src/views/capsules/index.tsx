import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { setSessionId, type TransformTextEnrichOption, type UserConfig } from "@tyvox/sdk/client";
import type { ActionType } from "@tyvox/sdk/contracts";
import { motion, AnimatePresence } from "framer-motion";
import type { CapsuleState } from "../../../shared/types/state";
import { IPC } from "../../../shared/channels";
import { AUDIO } from "../../../shared/limits";
import type { CapsuleError, HotkeyStartPayload } from "../../../shared/types/ipc";
import { useIpcListener } from "../../hooks/useIpcListener";
import { useAudioCapture, warmupAudioCapture } from "../../hooks/useAudioCapture";
import { useAudioDevices } from "../../hooks/useAudioDevices";
import { useTranscribe } from "../../hooks/useTranscribe";
import { useTransform } from "../../hooks/useTransform";
import { useSettings } from "../../hooks/useSettings";
import { useSound } from "../../hooks/useSound";
import { logger } from "../../utils/logger";
import { AudioChunkBatcher } from "../../utils/audioChunkBatcher";
import { CapsuleGlobalStyles } from "./CapsuleGlobalStyles";
import { RecordingState } from "./states/RecordingState";
import { TranscribingState } from "./states/TranscribingState";
import { TransformingState } from "./states/TransformingState";
import { FallbackState } from "./states/FallbackState";
import { ErrorState } from "./states/ErrorState";

function getEnrichOptions(
  action: ActionType,
  config: UserConfig | null,
): TransformTextEnrichOption[] {
  if (action === "translate" && config) {
    return [{ type: "translate", payload: config.desktop.actions.translate.payload }];
  }
  return [];
}

const MAX_TRANSFORM_RETRIES = 2;
const RETRY_DELAY_MS = 2000;
const FALLBACK_NOTICE_MS = 3000;
const BATCHER_MAX_DELAY_MS = 2000;
const BATCHER_MAX_BYTES = 64 * 1024;
const MIN_RECORDING_DURATION_MS = 500;
const START_SOUND_DELAY_MS = 150;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const Capsule = () => {
  const theme = useTheme();
  const { config, load: loadSettings, update: updateSettings } = useSettings();
  const [micDeviceId, setMicDeviceId] = useState("default");
  const { startSession, sendChunk, finalize, reset: resetTranscribe } = useTranscribe();
  const { transform, cancel: cancelTransform, progress: transformProgress } = useTransform();

  const [state, setState] = useState<CapsuleState>("idle");
  const stateRef = useRef(state);
  const [error, setError] = useState<CapsuleError | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  const active = state !== "idle" && state !== "injecting";
  const isProcessing = ["transcribing", "polishing", "translating"].includes(state);
  const actionRef = useRef<ActionType | null>(null);
  const configRef = useRef(config);
  const sessionGenerationRef = useRef(0);
  const sessionIdRef = useRef("");
  const sessionStartRef = useRef(0);
  const batcherRef = useRef<AudioChunkBatcher | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const clearAction = useCallback(() => {
    actionRef.current = null;
  }, []);

  const injectText = useCallback((text: string) => {
    window.electron.invoke(IPC.INJECT_TEXT, { text });
  }, []);

  const resetSession = useCallback(() => {
    resetTranscribe();
    cancelTransform();
    clearAction();
    sessionGenerationRef.current += 1;
    if (batcherRef.current) {
      batcherRef.current.dispose();
      batcherRef.current = null;
    }
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    setRetryAttempt(0);
    setState("idle");
  }, [resetTranscribe, cancelTransform, clearAction]);

  useEffect(() => {
    configRef.current = config;
    if (config) {
      setMicDeviceId(config.desktop.microphone.deviceId);
    }
  }, [config]);

  useIpcListener(IPC.AUDIO_DEVICE_CHANGED, (payload: unknown) => {
    if (typeof payload === "string") {
      setMicDeviceId(payload);
    }
  });

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    warmupAudioCapture().catch(() => {});
  }, []);

  const audioDevices = useAudioDevices();

  useEffect(() => {
    window.electron.invoke(IPC.AUDIO_DEVICES_SYNC, audioDevices).catch(() => {});
  }, [audioDevices]);

  useEffect(() => {
    const update = async () => {
      try {
        await window.electron.invoke(IPC.CAPSULE_SET_IGNORE_MOUSE, state !== "error");
      } catch {
        // Ignore
      }
    };
    void update();
  }, [state]);

  useEffect(() => {
    const toggle = async () => {
      try {
        await window.electron.invoke(active ? IPC.SHOW_CAPSULE : IPC.HIDE_CAPSULE);
      } catch {
        // Ignore
      }
    };
    void toggle();
  }, [active]);

  useIpcListener(IPC.CAPSULE_STATE_CHANGE, (payload: unknown) => {
    const p = payload as { state: CapsuleState; error?: CapsuleError };
    setState(p.state);
    if (p.error) setError(p.error);
  });

  useIpcListener(IPC.HOTKEY_START_RECORDING, (payload: unknown) => {
    const p = payload as HotkeyStartPayload;
    const action = p.action;
    const sessionId = p.sessionId;
    const prev = stateRef.current;

    sessionIdRef.current = sessionId;
    setSessionId(sessionId);
    logger.info("Hotkey start", { action, sessionId });

    if (prev === "recording") {
      setState("transcribing");
      return;
    }

    if (prev === "idle" || prev === "error" || prev === "fallback") {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      sessionGenerationRef.current += 1;
      const generation = sessionGenerationRef.current;
      actionRef.current = action;
      setRetryAttempt(0);
      setState("recording");
      batcherRef.current = new AudioChunkBatcher({
        maxDelayMs: BATCHER_MAX_DELAY_MS,
        maxBytes: BATCHER_MAX_BYTES,
        onFlush: async (buffer) => {
          if (sessionGenerationRef.current !== generation) return;
          try {
            await sendChunk(buffer);
          } catch (err) {
            if (stateRef.current === "transcribing") throw err;
            logger.error("Audio chunk upload failed, aborting recording", { error: String(err) });
            setError({
              code: "AUDIO_UPLOAD_FAILED",
              message: "Audio upload failed",
              recoverable: true,
            });
            setState("error");
          }
        },
      });
      return;
    }

    resetSession();
  });

  useIpcListener(IPC.HOTKEY_STOP_RECORDING, () => {
    setState((prev) => (prev === "recording" ? "transcribing" : prev));
  });

  const handleChunk = useCallback((pcm: ArrayBuffer) => {
    batcherRef.current?.push(pcm);
  }, []);

  const handleMicFallback = useCallback(() => {
    const current = configRef.current;
    if (!current) return;
    void updateSettings({
      desktop: {
        ...current.desktop,
        microphone: { ...current.desktop.microphone, deviceId: "default" },
      },
    });
  }, [updateSettings]);

  const { startCapture, stopCapture, analyserRef } = useAudioCapture(
    handleChunk,
    undefined,
    micDeviceId,
    handleMicFallback,
  );

  const playStart = useSound("start");
  const playStop = useSound("stop");
  const playSuccess = useSound("success");
  const playError = useSound("error");

  const prevStateRef = useRef(state);
  const timedRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxRecordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingStartRef = useRef(0);

  const runTransformWithRetry = useCallback(
    async (
      text: string,
      enrichOptions: TransformTextEnrichOption[],
      attempt: number,
      generation: number,
    ): Promise<string> => {
      flushSync(() => {
        setRetryAttempt(attempt);
      });
      let accumulated = "";
      try {
        accumulated = await transform(text, enrichOptions, attempt);
        if (sessionGenerationRef.current !== generation) return accumulated;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn("Transform failed, will retry", { attempt, error: message });
        await wait(RETRY_DELAY_MS);
        if (sessionGenerationRef.current !== generation) return accumulated;
        if (attempt < MAX_TRANSFORM_RETRIES) {
          return runTransformWithRetry(text, enrichOptions, attempt + 1, generation);
        }
        throw err;
      }
      const trimmed = accumulated.trim();
      if (sessionGenerationRef.current !== generation) return accumulated;
      if (!trimmed) {
        logger.warn("Transform returned empty, will retry", { attempt });
        await wait(RETRY_DELAY_MS);
        if (sessionGenerationRef.current !== generation) return accumulated;
        if (attempt < MAX_TRANSFORM_RETRIES) {
          return runTransformWithRetry(text, enrichOptions, attempt + 1, generation);
        }
        throw new Error("Transform returned empty after retries");
      }
      return trimmed;
    },
    [transform],
  );

  useEffect(() => {
    const prev = prevStateRef.current;
    const curr = state;
    prevStateRef.current = curr;

    if (curr === "recording" && prev !== "recording") {
      sessionStartRef.current = performance.now();
      startSession(sessionIdRef.current);
      recordingStartRef.current = Date.now();
      setRecordingElapsedMs(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingElapsedMs(Date.now() - recordingStartRef.current);
      }, 1000);
      maxRecordingTimeoutRef.current = setTimeout(() => {
        setState("transcribing");
      }, AUDIO.MAX_RECORDING_DURATION_MS);
      startCapture();
      timedRef.current = setTimeout(() => {
        playStart();
      }, START_SOUND_DELAY_MS);
    }

    if (prev === "recording" && curr !== "recording") {
      if (timedRef.current) {
        clearTimeout(timedRef.current);
        timedRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setRecordingElapsedMs(0);
      stopCapture();
      const batcher = batcherRef.current;
      batcherRef.current = null;
      playStop();
      if (curr === "transcribing") {
        const action = actionRef.current;
        const startGeneration = sessionGenerationRef.current;
        const recordingDurationMs = Math.round(performance.now() - sessionStartRef.current);
        clearAction();
        logger.info("Recording stopped", { recordingDurationMs });

        if (recordingDurationMs < MIN_RECORDING_DURATION_MS) {
          logger.info("Recording too short, discarding session");
          batcher?.dispose();
          resetSession();
          return;
        }

        const batcherFlushed = batcher
          ? batcher.flush().then(() => {
              batcher.dispose();
            })
          : Promise.resolve();

        batcherFlushed
          .then(() => finalize())
          .then(async (data) => {
            logger.info("Transcription complete", { durationMs: data.durationMs });
            if (action) {
              setState(action === "translate" ? "translating" : "polishing");
              const transformStart = performance.now();
              try {
                const polished = await runTransformWithRetry(
                  data.text,
                  getEnrichOptions(action, configRef.current),
                  1,
                  startGeneration,
                );
                logger.info("Transform complete", {
                  transformDurationMs: Math.round(performance.now() - transformStart),
                });
                if (sessionGenerationRef.current !== startGeneration) return;
                if (!polished) {
                  logger.error("Transform returned empty after retries, inserting raw transcript", {
                    text: data.text,
                  });
                  injectText(data.text);
                  playError();
                  setState("fallback");
                  fallbackTimerRef.current = setTimeout(
                    () => setState((prev) => (prev === "fallback" ? "idle" : prev)),
                    FALLBACK_NOTICE_MS,
                  );
                  return;
                }
                injectText(polished);
                playSuccess();
                setState("idle");
              } catch (err) {
                logger.error("Transform failed after retries, inserting raw transcript", {
                  error: String(err),
                });
                if (sessionGenerationRef.current !== startGeneration) return;
                injectText(data.text);
                playError();
                setState("fallback");
                fallbackTimerRef.current = setTimeout(() => setState("idle"), FALLBACK_NOTICE_MS);
                setRetryAttempt(MAX_TRANSFORM_RETRIES);
              }
            } else {
              if (sessionGenerationRef.current !== startGeneration) return;
              injectText(data.text);
              playSuccess();
              setState("idle");
            }
            logger.info("Session complete", {
              sessionDurationMs: Math.round(performance.now() - sessionStartRef.current),
            });
          })
          .catch((err: unknown) => {
            logger.error("Session failed", { error: err });
            if (err && typeof err === "object" && "code" in err && "message" in err) {
              const e = err as CapsuleError;
              setError(e);
              setState("error");
            } else {
              setError({
                code: "TRANSCRIPTION_ERROR",
                message: err instanceof Error ? err.message : "Transcription failed",
                recoverable: true,
              });
              setState("error");
            }
          });
      } else {
        batcher?.dispose();
      }
    }

    if (curr === "error") {
      playError();
    }

    return () => {
      if (timedRef.current) {
        clearTimeout(timedRef.current);
        timedRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (maxRecordingTimeoutRef.current) {
        clearTimeout(maxRecordingTimeoutRef.current);
        maxRecordingTimeoutRef.current = null;
      }
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [
    state,
    startCapture,
    stopCapture,
    startSession,
    finalize,
    injectText,
    clearAction,
    playStart,
    playStop,
    playSuccess,
    playError,
    runTransformWithRetry,
  ]);

  useEffect(() => {
    return () => {
      if (batcherRef.current) {
        batcherRef.current.dispose();
        batcherRef.current = null;
      }
    };
  }, []);

  useIpcListener(IPC.CAPSULE_CANCEL, () => {
    if (stateRef.current !== "idle") {
      resetSession();
    }
  });

  const [show, setShow] = useState(false);
  const [exitAnim, setExitAnim] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (active) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      setShow(true);
      setExitAnim(false);
    } else if (show && !exitAnim) {
      setExitAnim(true);
      hideTimerRef.current = setTimeout(() => {
        setShow(false);
        hideTimerRef.current = null;
      }, 300);
    }
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [active, show, exitAnim]);

  const renderState = () => {
    switch (state) {
      case "recording":
        return <RecordingState elapsedMs={recordingElapsedMs} analyserRef={analyserRef} />;
      case "transcribing":
        return <TranscribingState />;
      case "polishing":
        return (
          <TransformingState
            variant="polish"
            attempt={retryAttempt}
            maxAttempt={MAX_TRANSFORM_RETRIES}
            progress={transformProgress}
          />
        );
      case "translating":
        return (
          <TransformingState
            variant="translate"
            attempt={retryAttempt}
            maxAttempt={MAX_TRANSFORM_RETRIES}
            progress={transformProgress}
          />
        );
      case "error":
        return error ? (
          <ErrorState
            error={error}
            onClose={() => {
              setError(null);
              setState("idle");
            }}
            attempt={retryAttempt > 0 ? retryAttempt : undefined}
            maxAttempt={MAX_TRANSFORM_RETRIES}
          />
        ) : null;
      case "fallback":
        return <FallbackState />;
      default:
        return null;
    }
  };

  return (
    <>
      <CapsuleGlobalStyles />
      <Box
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <AnimatePresence>
          {show && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: 12 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              style={{
                height: 38,
                minWidth: 120,
                maxWidth: 320,
                borderRadius: 9999,
                background: theme.vars!.palette.background.paper,
                boxShadow: `0 2px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px ${theme.vars!.palette.divider}`,
                display: "inline-flex",
                alignItems: "center",
                padding: 0,
                color: theme.vars!.palette.text.primary,
                position: "relative",
                overflow: "hidden",
                pointerEvents: "auto",
                animation: isProcessing ? "pulse 2s ease-in-out infinite" : "none",
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={state + retryAttempt}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: "inline-flex", height: "100%", width: "100%" }}
                >
                  {renderState()}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </>
  );
};
