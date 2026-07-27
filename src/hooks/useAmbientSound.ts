import { useContext } from "react";
import { AmbientContext } from "@/contexts/ambient/AmbientContext";
import type { AmbientContextType } from "@/contexts/ambient/AmbientContext";

const NOOP: AmbientContextType = {
  category: null,
  currentTrackIndex: 0,
  currentTrack: null,
  isPlaying: false,
  volume: 0.5,
  seek: 0,
  duration: 0,
  play: () => {},
  toggle: () => {},
  stop: () => {},
  skipNext: () => {},
  skipPrev: () => {},
  setVolume: () => {},
  seekTo: () => {},
};

export function useAmbientSound(): AmbientContextType {
  const ctx = useContext(AmbientContext);
  if (!ctx) return NOOP;
  return ctx;
}
