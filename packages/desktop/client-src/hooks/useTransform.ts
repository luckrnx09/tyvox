import { useState, useCallback, useRef } from "react";
import {
  transformText,
  SSEResponse,
  type TransformTextStreamEvent,
  type TransformTextEnrichOption,
} from "@tyvox/sdk/client";

export type TransformState = "idle" | "thinking" | "streaming" | "done" | "error";

const MAX_PROGRESS_BEFORE_DONE = 0.99;

export function useTransform() {
  const [state, setState] = useState<TransformState>("idle");
  const [text, setText] = useState("");
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const transform = useCallback(
    async (
      input: string,
      enrichOptions: TransformTextEnrichOption[] = [],
      timeoutScale = 1,
    ): Promise<string> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState("thinking");
      setText("");
      setProgress(0);
      let result = "";

      try {
        const response = await transformText(
          { text: input, enrichOptions, timeoutScale },
          { signal: controller.signal },
        );

        const stream = new SSEResponse<TransformTextStreamEvent>(response);
        for await (const event of stream) {
          if (controller.signal.aborted) break;

          switch (event.event) {
            case "chunk": {
              setState("streaming");
              const delta = event.data.text;
              if (delta) {
                result += delta;
                setText((prev) => prev + delta);
                setProgress(
                  Math.min(MAX_PROGRESS_BEFORE_DONE, result.length / Math.max(1, input.length)),
                );
              }
              break;
            }
            case "done": {
              setState("done");
              setProgress(1);
              break;
            }
            case "error": {
              setState("error");
              throw new Error(event.data.message || "Transform failed");
            }
          }
        }

        return result;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return result;
        setState("error");
        throw err;
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState("idle");
    setText("");
    setProgress(0);
  }, []);

  return { state, text, progress, transform, cancel };
}
