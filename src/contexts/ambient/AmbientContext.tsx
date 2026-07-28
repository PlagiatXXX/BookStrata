/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Howl } from "howler";
import type { ReactNode } from "react";
import { TRACKS_BY_CATEGORY } from "@/components/AmbientSound/ambient-tracks";
import type { AmbientCategory, AmbientTrack } from "@/components/AmbientSound/ambient-tracks";

/* ─── Types ─────────────────────────────────────────── */

export interface AmbientContextType {
  /** Какой плейлист активен */
  category: AmbientCategory | null;
  /** Индекс текущего трека в TRACKS_BY_CATEGORY[category] */
  currentTrackIndex: number;
  /** Текущий трек (для UI) */
  currentTrack: AmbientTrack | null;
  isPlaying: boolean;
  volume: number;
  /** Текущая позиция в секундах */
  seek: number;
  /** Длительность трека в секундах */
  duration: number;

  /** Запустить воспроизведение с указанного трека в категории */
  play: (category: AmbientCategory, trackIndex?: number) => void;
  /** Play / Pause */
  toggle: () => void;
  /** Остановить */
  stop: () => void;
  /** Следующий трек (только music) */
  skipNext: () => void;
  /** Предыдущий трек (только music) */
  skipPrev: () => void;
  /** Сменить громкость */
  setVolume: (volume: number) => void;
  /** Перемотать на указанную секунду */
  seekTo: (seconds: number) => void;
}

export const AmbientContext = createContext<AmbientContextType | undefined>(
  undefined,
);

/* ─── sessionStorage ─────────────────────────────────── */

const SS_CATEGORY = "ambient_category";
const SS_INDEX = "ambient_index";
const SS_VOLUME = "ambient_volume";

function loadFromSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToSession(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage может быть недоступен
  }
}

/* ─── Provider ───────────────────────────────────────── */

interface AmbientProviderProps {
  children: ReactNode;
}

export function AmbientProvider({ children }: AmbientProviderProps) {
  const [category, setCategory] = useState<AmbientCategory | null>(() =>
    loadFromSession<AmbientCategory | null>(SS_CATEGORY, null),
  );
  const [currentTrackIndex, setCurrentTrackIndex] = useState(() =>
    loadFromSession<number>(SS_INDEX, 0),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(() =>
    loadFromSession<number>(SS_VOLUME, 0.5),
  );

  const soundRef = useRef<Howl | null>(null);
  const [seek, setSeek] = useState(0);
  const [duration, setDuration] = useState(0);

  /* ── helpers ── */

  const currentCategoryTracks = useMemo(
    () => (category ? TRACKS_BY_CATEGORY[category] : []),
    [category],
  );

  const currentTrack: AmbientTrack | null =
    category && currentCategoryTracks.length > 0
      ? currentCategoryTracks[currentTrackIndex] ?? null
      : null;

  const destroySound = useCallback(() => {
    if (soundRef.current) {
      soundRef.current.unload();
      soundRef.current = null;
    }
  }, []);

  /* ── play: основная логика (в ref для безопасного вызова из onend) ── */

  const playFn = (cat: AmbientCategory, trackIndex = 0) => {
    const tracks = TRACKS_BY_CATEGORY[cat];
    if (!tracks[trackIndex]) return;

    destroySound();

    const track = tracks[trackIndex];
    const isNoise = cat === "noise";

    const howl = new Howl({
      src: [track.src],
      loop: isNoise,
      volume,
      html5: !isNoise, // шумы — Web Audio (бесшовный loop), музыка — html5 (стриминг)
      onplay: () => setIsPlaying(true),
      onpause: () => setIsPlaying(false),
      onstop: () => setIsPlaying(false),
      onend: () => {
        if (isNoise) return;

        const nextIndex = (trackIndex + 1) % tracks.length;
        setCurrentTrackIndex(nextIndex);
        saveToSession(SS_INDEX, nextIndex);
        setTimeout(() => playRef.current(cat, nextIndex), 0);
      },
      onloaderror: (_id, err) => {
        console.error(`[Ambient] Failed to load ${track.src}:`, err);
        setIsPlaying(false);
      },
    });

    howl.play();
    soundRef.current = howl;
    setCurrentTrackIndex(trackIndex);
    setCategory(cat);
    saveToSession(SS_CATEGORY, cat);
    saveToSession(SS_INDEX, trackIndex);
  };

  const playRef = useRef(playFn);
  useEffect(() => {
    playRef.current = playFn;
  });

  const play = useCallback(
    (cat: AmbientCategory, trackIndex = 0) => {
      playRef.current(cat, trackIndex);
    },
    [],
  );

  /* ── toggle ── */

  const toggle = useCallback(() => {
    const sound = soundRef.current;
    if (!sound) {
      if (category !== null) {
        playRef.current(category, currentTrackIndex);
      }
      return;
    }
    if (sound.playing()) {
      sound.pause();
    } else {
      sound.play();
    }
  }, [category, currentTrackIndex]);

  /* ── stop ── */

  const stop = useCallback(() => {
    destroySound();
    setCategory(null);
    setCurrentTrackIndex(0);
    setIsPlaying(false);
    saveToSession(SS_CATEGORY, null);
    saveToSession(SS_INDEX, 0);
  }, [destroySound]);

  /* ── skip next/prev (только для music) ── */

  const skipNext = useCallback(() => {
    if (category !== "music") return;
    const tracks = TRACKS_BY_CATEGORY["music"];
    if (tracks.length === 0) return;
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    play("music", nextIndex);
  }, [category, currentTrackIndex, play]);

  const skipPrev = useCallback(() => {
    if (category !== "music") return;
    const tracks = TRACKS_BY_CATEGORY["music"];
    if (tracks.length === 0) return;
    const prevIndex =
      (currentTrackIndex - 1 + tracks.length) % tracks.length;
    play("music", prevIndex);
  }, [category, currentTrackIndex, play]);

  /* ── volume ── */

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    saveToSession(SS_VOLUME, clamped);
    if (soundRef.current) {
      soundRef.current.volume(clamped);
    }
  }, []);

  /* ── seek / duration polling ── */

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      const h = soundRef.current;
      if (!h) return;
      if (h.playing()) {
        setSeek(h.seek() as number);
        const dur = h.duration();
        if (dur !== Infinity && !isNaN(dur)) setDuration(dur);
      }
    }, 250);
    return () => clearInterval(id);
  }, [isPlaying]);

  /* ── seekTo ── */

  const seekTo = useCallback((seconds: number) => {
    const h = soundRef.current;
    if (h) {
      h.seek(seconds);
      setSeek(seconds);
    }
  }, []);

  /* cleanup */
  useEffect(() => {
    return () => {
      destroySound();
    };
  }, [destroySound]);

  const value = useMemo<AmbientContextType>(
    () => ({
      category,
      currentTrackIndex,
      currentTrack,
      isPlaying,
      volume,
      seek,
      duration,
      play,
      toggle,
      stop,
      skipNext,
      skipPrev,
      setVolume,
      seekTo,
    }),
    [
      category,
      currentTrackIndex,
      currentTrack,
      isPlaying,
      volume,
      seek,
      duration,
      play,
      toggle,
      stop,
      skipNext,
      skipPrev,
      setVolume,
      seekTo,
    ],
  );

  return (
    <AmbientContext.Provider value={value}>{children}</AmbientContext.Provider>
  );
}
