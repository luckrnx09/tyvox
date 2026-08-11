import { useCallback, useEffect, useRef, useState } from "react";
import { AUDIO } from "../../shared/limits";

export async function warmupAudioCapture(): Promise<void> {
  const ctx = new AudioContext({ sampleRate: AUDIO.SAMPLE_RATE });
  await ctx.close();
}

interface UseAudioCaptureResult {
  isCapturing: boolean;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  startCapture: () => Promise<void>;
  stopCapture: () => void;
}

const DEVICE_UNAVAILABLE_ERRORS = new Set(["NotFoundError", "OverconstrainedError"]);

export function useAudioCapture(
  onChunk: (pcm: ArrayBuffer) => void,
  onError?: (err: Error) => void,
  deviceId: string = "default",
  onDeviceFallback?: () => void,
): UseAudioCaptureResult {
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const capturingRef = useRef(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const onChunkRef = useRef(onChunk);
  onChunkRef.current = onChunk;

  const deviceIdRef = useRef(deviceId);
  deviceIdRef.current = deviceId;

  const onDeviceFallbackRef = useRef(onDeviceFallback);
  onDeviceFallbackRef.current = onDeviceFallback;

  const cleanup = useCallback(() => {
    capturingRef.current = false;
    setIsCapturing(false);
    processorRef.current?.disconnect();
    processorRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const startCapture = useCallback(async () => {
    try {
      const usesSystemDefault = deviceIdRef.current === "default";
      const audioConstraints: MediaTrackConstraints = {
        autoGainControl: false,
        channelCount: AUDIO.CHANNELS,
        echoCancellation: false,
        noiseSuppression: false,
        sampleRate: AUDIO.SAMPLE_RATE,
      };
      if (!usesSystemDefault) {
        audioConstraints.deviceId = { exact: deviceIdRef.current };
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      } catch (error) {
        const unavailable =
          error instanceof DOMException && DEVICE_UNAVAILABLE_ERRORS.has(error.name);
        if (!unavailable || usesSystemDefault) {
          throw error;
        }
        onDeviceFallbackRef.current?.();
        delete audioConstraints.deviceId;
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      }
      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: AUDIO.SAMPLE_RATE });
      ctxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.65;
      analyserRef.current = analyser;

      processor.onaudioprocess = (event) => {
        if (!capturingRef.current) return;

        const input = event.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          int16[i] = Math.max(-32_768, Math.min(32_767, Math.round(input[i]! * 32_767)));
        }

        onChunkRef.current(int16.buffer.slice(0));
      };

      source.connect(processor);
      source.connect(analyser);
      processor.connect(ctx.destination);
      capturingRef.current = true;
      setIsCapturing(true);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [onError]);

  const stopCapture = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    analyserRef,
    isCapturing,
    startCapture,
    stopCapture,
  };
}
