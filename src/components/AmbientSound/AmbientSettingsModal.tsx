import { useState, useCallback } from "react";
import {
  Headphones,
  Pause,
  Play,
  X,
  Volume1,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  ChevronDown,
  Ear,
  Music,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useAmbientSound } from "@/hooks/useAmbientSound";
import { TRACKS_BY_CATEGORY } from "./ambient-tracks";
import type { AmbientCategory } from "./ambient-tracks";
import { Modal } from "@/ui/Modal";

interface AmbientSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: { key: AmbientCategory; label: string; icon: typeof Ear }[] = [
  { key: "noise", label: "Природа", icon: Ear },
  { key: "music", label: "Музыка", icon: Music },
];

const VISIBLE_TRACKS = 5;

/* ── helpers ── */

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ── Component ── */

export function AmbientSettingsModal({ isOpen, onClose }: AmbientSettingsModalProps) {
  const {
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
  } = useAmbientSound();

  const [activeTab, setActiveTab] = useState<AmbientCategory>("noise");
  const [playlistExpanded, setPlaylistExpanded] = useState(false);
  const tracks = TRACKS_BY_CATEGORY[activeTab];
  const isActivePlaylist = category === activeTab;
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  /* Для музыки: определяем какой трек показывать в now-playing */
  const musicNowPlaying =
    activeTab === "music" && (isActivePlaylist ? currentTrack : tracks[0]);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      seekTo(Number(e.target.value));
    },
    [seekTo],
  );

  /* Нажатие на play в now-playing */
  const handleMasterPlay = useCallback(() => {
    if (isActivePlaylist) {
      toggle();
    } else {
      play("music", 0);
    }
  }, [isActivePlaylist, toggle, play]);

  const handleMasterPrev = useCallback(() => {
    if (isActivePlaylist) {
      skipPrev();
    } else {
      play("music", 0);
    }
  }, [isActivePlaylist, skipPrev, play]);

  const handleMasterNext = useCallback(() => {
    if (isActivePlaylist) {
      skipNext();
    } else {
      play("music", 1);
    }
  }, [isActivePlaylist, skipNext, play]);

  const remainingTracks = tracks.length - VISIBLE_TRACKS;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="rounded-2xl bg-slate-900 p-4 sm:p-5 shadow-2xl">
        {/* ── Header ── */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-[#c1fffe]/30 to-purple-500/20">
              <Headphones size={18} className="text-[#c1fffe]" />
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-base font-bold text-white">Фоновый звук</h2>
              {currentTrack && isPlaying && (
                <span className="text-xs text-gray-500">{currentTrack.label}</span>
              )}
              {currentTrack && !isPlaying && category && (
                <span className="text-xs text-yellow-400/80">На паузе</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-gray-400 hover:bg-slate-800/50 hover:text-white transition-colors cursor-pointer"
            aria-label="Закрыть"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Tabs ── */}
          <div className="relative mb-4 flex gap-1 rounded-lg bg-slate-800 p-0.5">
          {CATEGORIES.map(({ key, label, icon: TabIcon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                activeTab === key ? "text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <TabIcon size={14} />
              {label}
            </button>
          ))}
          <motion.div
            className="absolute top-0.5 bottom-0.5 rounded-md bg-[#c1fffe]/10"
            layout
            layoutId="ambient-tab-bg"
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            style={{
              left: activeTab === "noise" ? "2px" : "calc(50% + 1px)",
              width: "calc(50% - 3px)",
            }}
          />
        </div>

        {/* ── Tab content ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "noise" ? (
              /* ═══ ПРИРОДА: плитки ═══ */
              <div className="mb-3 grid grid-cols-3 gap-1.5">
                {tracks.map((track, index) => {
                  const isCurrent = isActivePlaylist && currentTrackIndex === index;
                  const Icon = track.icon;
                  return (
                    <motion.button
                      key={track.id}
                      type="button"
                      onClick={() => {
                        if (isCurrent) toggle();
                        else play("noise", index);
                      }}
                      whileTap={{ scale: 0.95 }}
                      className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-all cursor-pointer ${
                        isCurrent
                          ? "ring-1 ring-[#c1fffe]/40 bg-slate-800"
                          : "bg-slate-800/60 hover:bg-slate-800/80"
                      }`}
                    >
                      <div
                        className="flex size-9 items-center justify-center rounded-xl transition-transform"
                        style={{
                          backgroundColor: `${track.color}15`,
                          transform: isCurrent ? "scale(1.1)" : undefined,
                        }}
                      >
                        <Icon size={16} style={{ color: track.color }} />
                      </div>
                      <span
                        className={`text-[11px] font-medium leading-tight ${
                          isCurrent ? "text-white" : "text-gray-400"
                        }`}
                      >
                        {track.label}
                      </span>
                      {isCurrent && isPlaying && (
                        <div className="flex items-center gap-0.5">
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              className="size-1 rounded-full"
                              style={{
                                backgroundColor: track.color,
                                animation: `pulse 1s ease-in-out infinite`,
                                animationDelay: `${i * 0.2}s`,
                              }}
                            />
                          ))}
                        </div>
                      )}
                      {isCurrent && !isPlaying && (
                        <span className="text-[10px] text-yellow-400/70">Пауза</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              /* ═══ МУЗЫКА: плеер + плейлист ═══ */
              <div className="space-y-3">
                {/* Now playing — всегда виден */}
                {musicNowPlaying && (
                  <div className="rounded-xl bg-slate-800 p-3">
                    <div className="mb-2 flex items-center gap-2.5">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: `${musicNowPlaying.color}20`,
                        }}
                      >
                        <musicNowPlaying.icon
                          size={18}
                          style={{ color: musicNowPlaying.color }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {musicNowPlaying.label}
                        </p>
                        <p className="text-[11px] text-gray-500 tabular-nums">
                          {isActivePlaylist
                            ? `${formatTime(seek)} / ${formatTime(duration)}`
                            : "– / –"}
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-2.5">
                      <input
                        type="range"
                        min={0}
                        max={duration || 0}
                        step={0.5}
                        value={isActivePlaylist ? seek : 0}
                        onChange={handleSeek}
                        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-[#c1fffe]
                          [&::-webkit-slider-thumb]:size-3.5
                          [&::-webkit-slider-thumb]:appearance-none
                          [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:bg-[#c1fffe]
                          [&::-webkit-slider-thumb]:shadow-lg
                          [&::-moz-range-thumb]:size-3.5
                          [&::-moz-range-thumb]:appearance-none
                          [&::-moz-range-thumb]:rounded-full
                          [&::-moz-range-thumb]:bg-[#c1fffe]
                          [&::-moz-range-thumb]:border-0"
                      />
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleMasterPrev}
                        className="flex size-9 items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
                        title="Предыдущий"
                      >
                        <SkipBack size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={handleMasterPlay}
                        className="flex size-11 items-center justify-center rounded-full bg-linear-to-br from-[#c1fffe] to-[#a0e0e0] text-black shadow-lg shadow-[#c1fffe]/20 hover:scale-105 transition-transform cursor-pointer"
                        title={isActivePlaylist && isPlaying ? "Пауза" : "Воспроизвести"}
                      >
                        {isActivePlaylist && isPlaying ? (
                          <Pause size={20} />
                        ) : (
                          <Play size={20} className="ml-0.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleMasterNext}
                        className="flex size-9 items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
                        title="Следующий"
                      >
                        <SkipForward size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Playlist — без скролла, первые + ещё N */}
                <div className="space-y-0.5">
                  {(playlistExpanded ? tracks : tracks.slice(0, VISIBLE_TRACKS)).map(
                    (track, index) => {
                      const isCurrent = isActivePlaylist && currentTrackIndex === index;
                      const Icon = track.icon;
                      return (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => play("music", index)}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
                            isCurrent
                              ? "bg-[#c1fffe]/10"
                              : "hover:bg-slate-700/50"
                          }`}
                        >
                          <div
                            className="flex size-7 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${track.color}12` }}
                          >
                            <Icon size={12} style={{ color: track.color }} />
                          </div>
                          <span
                            className={`flex-1 text-xs ${
                              isCurrent ? "font-medium text-white" : "text-gray-400"
                            }`}
                          >
                            {track.label}
                          </span>
                          {isCurrent && isPlaying && (
                            <div className="flex items-center gap-0.5">
                              {[0, 1, 2].map((i) => (
                                <span
                                  key={i}
                                  className="size-1 rounded-full"
                                  style={{
                                    backgroundColor: track.color,
                                    animation: `pulse 1s ease-in-out infinite`,
                                    animationDelay: `${i * 0.2}s`,
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          {isCurrent && !isPlaying && (
                            <span className="text-[10px] text-yellow-400/70">Пауза</span>
                          )}
                        </button>
                      );
                    },
                  )}

                  {/* Кнопка «ещё N» */}
                  {!playlistExpanded && remainingTracks > 0 && (
                    <button
                      type="button"
                      onClick={() => setPlaylistExpanded(true)}
                      className="flex w-full items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-500 hover:text-gray-300 hover:bg-slate-700/50 transition-colors cursor-pointer"
                    >
                      <ChevronDown size={12} />
                      Ещё {remainingTracks} {remainingTracks === 1 ? "трек" : "треков"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Volume ── */}
        <div className="mb-3 mt-3 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
            className="shrink-0 text-gray-400 hover:text-white transition-colors cursor-pointer"
            aria-label={volume === 0 ? "Включить звук" : "Выключить звук"}
          >
            <VolumeIcon size={16} />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-[#c1fffe]
              [&::-webkit-slider-thumb]:size-3.5
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-[#c1fffe]
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-moz-range-thumb]:size-3.5
              [&::-moz-range-thumb]:appearance-none
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-[#c1fffe]
              [&::-moz-range-thumb]:border-0"
          />
          <span className="w-7 text-right text-[11px] tabular-nums text-gray-500 shrink-0">
            {Math.round(volume * 100)}
          </span>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-3">
          {currentTrack ? (
            <>
              <p className="text-[11px] text-gray-500">
                {isPlaying ? "Воспроизводится" : "На паузе"}
              </p>
              <button
                type="button"
                onClick={stop}
                className="cursor-pointer rounded-lg border border-red-500/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-red-400 transition-colors hover:bg-red-500/10"
              >
                Выключить
              </button>
            </>
          ) : (
            <p className="text-[11px] text-gray-500">Выберите трек, чтобы начать</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
