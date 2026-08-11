import { useEffect, useRef } from "react";
import { useTheme } from "@mui/material/styles";

interface LevelBarsProps {
  barCount?: number;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
}

export const LevelBars = ({ barCount = 7, analyserRef }: LevelBarsProps) => {
  const theme = useTheme();
  const barsRef = useRef<HTMLDivElement[]>([]);
  const stripsRef = useRef<HTMLDivElement[]>([]);
  const peakHold = useRef<number[]>(Array.from({ length: barCount }, () => 0));
  const freqData = useRef<Uint8Array>(new Uint8Array(0));

  useEffect(() => {
    const analyser = analyserRef.current;
    if (analyser) {
      freqData.current = new Uint8Array(analyser.frequencyBinCount);
    }
  }, [analyserRef]);

  useEffect(() => {
    let rafId = 0;
    const animate = () => {
      const analyser = analyserRef.current;
      if (analyser && freqData.current.length === analyser.frequencyBinCount) {
        analyser.getByteFrequencyData(freqData.current as Uint8Array<ArrayBuffer>);
      } else if (analyser) {
        freqData.current = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freqData.current as Uint8Array<ArrayBuffer>);
      }

      const dataLen = freqData.current.length;
      const half = (barCount - 1) / 2;

      for (let i = 0; i < barCount; i++) {
        const d = Math.abs(i - half) / half;
        const binLo = Math.floor(d ** 1.6 * dataLen);
        const binHi = Math.floor((d + 1 / barCount) ** 1.6 * dataLen);
        let max = 0;
        for (let b = binLo; b < binHi && b < dataLen; b++) {
          const v = freqData.current[b] ?? 0;
          if (v > max) max = v;
        }
        const norm = max / 255;
        const height = 2 + norm * 18;

        const bar = barsRef.current[i];
        if (bar) {
          bar.style.height = `${height}px`;
          const hue = norm * 220;
          bar.style.background = `hsl(${hue} 80% 65%)`;
          bar.style.boxShadow =
            norm > 0.4 ? `0 0 3px hsl(${hue} 80% 65%), 0 0 8px rgba(255,99,102,0.3)` : "none";
        }

        const strip = stripsRef.current[i];
        if (strip) {
          const peak = peakHold.current[i]!;
          if (height > peak) {
            peakHold.current[i] = height;
            strip.style.top = `${(20 - height) / 2}px`;
            strip.style.opacity = "1";
          } else {
            const next = Math.max(2, peak - 0.05);
            peakHold.current[i] = next;
            strip.style.top = `${(20 - next) / 2}px`;
            const opacity = Number.parseFloat(strip.style.opacity || "0");
            strip.style.opacity = String(Math.max(0.2, opacity - 0.02));
          }
        }
      }

      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [analyserRef, barCount]);

  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexShrink: 0,
        gap: 3,
        height: 20,
        position: "relative",
      }}
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          style={{
            alignItems: "center",
            display: "flex",
            height: "100%",
            position: "relative",
            width: 2,
          }}
        >
          <div
            ref={(el) => {
              if (el) barsRef.current[i] = el;
            }}
            data-testid="lb-bar"
            style={{
              background: theme.palette.text.disabled,
              borderRadius: "50%",
              height: 2,
              transition: "height 60ms linear, background 100ms linear",
              width: 2,
              willChange: "height",
            }}
          />
          <div
            ref={(el) => {
              if (el) stripsRef.current[i] = el;
            }}
            data-testid="lb-strip"
            style={{
              background: theme.palette.text.secondary,
              height: 1,
              opacity: 0,
              pointerEvents: "none",
              position: "absolute",
              top: "50%",
              transition: "top 100ms linear, opacity 200ms linear",
              width: 2,
            }}
          />
        </div>
      ))}
    </div>
  );
};
