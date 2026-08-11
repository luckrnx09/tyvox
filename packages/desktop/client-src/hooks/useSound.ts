import { useCallback, useRef } from "react";

const SOUND_FILES = {
  error: "sounds/error.mp3",
  start: "sounds/start.mp3",
  stop: "sounds/stop.mp3",
  success: "sounds/success.mp3",
} as const;

export type CueName = keyof typeof SOUND_FILES;

export const useSound = (name: CueName) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(SOUND_FILES[name]);
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  }, [name]);

  return play;
};
