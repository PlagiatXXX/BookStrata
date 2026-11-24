import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { Modal } from "@/ui/Modal";
import { Flame, X, RefreshCw, Copy, Check, Share2, Download, AlertTriangle } from "lucide-react";
import { roastTierList, type TierListRoastResult } from "@/lib/aiLibrarianApi";
import { sileo } from "sileo";
import type { Tier, Book } from "@/types";

export interface TierListRoastModalProps {
  isOpen: boolean;
  onClose: () => void;
  tierListTitle: string;
  tierListDescription?: string;
  tiers: Tier[];
  books: Record<string, Book>;
  tierListId?: string | number | null;
}

import {
  getRoastStorageKey,
  getRecentRoastAttempts,
  recordRoastAttempt,
  getRoastCooldownRemaining,
  formatCooldownTime,
} from "./roastCooldownHelper";

const LOADING_PHRASES: ReactNode[] = [
  "Сканирую литературные грехи...",
  "Изучаю ваш S-тир с пристрастием...",
  "Заглядываю в бездну вашего D-тира...",
  "Пытаюсь понять логику расстановки...",
  (
    <span key="critics">
      Собираю консилиум{" "}
      <s className="line-through opacity-70">тараканов</s>{" "}
      строгих критиков...
    </span>
  ),
  "Пью ромашковый чай и сдерживаю сарказм...",
  "Подбираю приличные слова...",
  "Сверяю уровень душноты со стандартами...",
  "Формулирую окончательный диагноз...",
];

function cleanQuotes(text?: string | null): string {
  if (!text) return "";
  return text.trim().replace(/^["'«\s]+/, "").replace(/["'»\s]+$/, "").trim();
}

export function TierListRoastModal({
  isOpen,
  onClose,
  tierListTitle,
  tierListDescription,
  tiers,
  books,
  tierListId,
}: TierListRoastModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TierListRoastResult | null>(() => {
    try {
      const key = getRoastStorageKey(tierListId, tierListTitle);
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.roast === "string") {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return null;
  });
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState(() => getRoastCooldownRemaining());
  const cardRef = useRef<HTMLDivElement>(null);

  const storageKey = getRoastStorageKey(tierListId, tierListTitle);
  const recentAttemptsCount = getRecentRoastAttempts().length;

  // Обновление таймера кулдауна каждую секунду при открытом окне
  useEffect(() => {
    if (!isOpen) return;
    const updateCooldown = () => {
      setCooldownRemainingMs(getRoastCooldownRemaining());
    };
    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Циклическая смена фраз при загрузке
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingPhraseIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [loading]);

  const loadRoast = useCallback(async () => {
    const cooldown = getRoastCooldownRemaining();
    if (cooldown > 0) {
      setCooldownRemainingMs(cooldown);
      setError(`Превышен лимит (2 попытки подряд). Букстраж остывает. Доступно через ${formatCooldownTime(cooldown)}.`);
      return;
    }

    setLoading(true);
    setError(null);

    const formattedTiers = tiers
      .map((tier) => ({
        label: tier.title,
        color: tier.color,
        books: (tier.bookIds || [])
          .map((id) => books[id])
          .filter(Boolean)
          .map((b) => ({
            title: b.title,
            author: b.author || undefined,
          })),
      }))
      .filter((tier) => tier.books.length > 0);

    try {
      const data = await roastTierList({
        tierListTitle,
        tierListDescription,
        tiers: formattedTiers,
      });
      setResult(data);
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch {
        // ignore
      }
      recordRoastAttempt();
      setCooldownRemainingMs(getRoastCooldownRemaining());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Не удалось получить прожарку";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [tierListTitle, tierListDescription, tiers, books, storageKey]);

  // Загрузка сохранённой прожарки из localStorage или запуск генерации
  useEffect(() => {
    if (!isOpen || result || loading || error) return;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.roast === "string") {
          setResult(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }

    loadRoast();
  }, [isOpen, storageKey, result, loading, error, loadRoast]);

  const handleReRoast = useCallback(() => {
    loadRoast();
  }, [loadRoast]);

  const handleCopy = useCallback(() => {
    if (!result) return;
    const text = `🔥 Прожарка моего тир-листа «${tierListTitle}» от ИИ-библиотекаря BookStrata:\n\n«${result.roast}»\n\nДиагноз: ${result.archetype}\nГлавный грех: ${result.hotTake}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    sileo.success({
      title: "Скопировано",
      description: "Текст прожарки скопирован в буфер",
    });
    setTimeout(() => setCopied(false), 2000);
  }, [result, tierListTitle]);

  const handleShareTelegram = useCallback(() => {
    if (!result) return;
    const text = `🔥 Прожарка моего тир-листа «${tierListTitle}» на BookStrata:\n\n«${result.roast}»\n\nМой диагноз: ${result.archetype}`;
    const url = typeof window !== "undefined" ? window.location.href : "https://bookstrata.ru";
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }, [result, tierListTitle]);

  const handleDownloadImage = useCallback(async () => {
    if (!cardRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0d0f14",
      });
      const link = document.createElement("a");
      link.download = `roast-${tierListTitle.slice(0, 30).replace(/[^a-zA-Zа-яА-Я0-9]/g, "_")}.png`;
      link.href = dataUrl;
      link.click();
      sileo.success({
        title: "Постер сохранён",
        description: "Картинка загружена на ваше устройство",
      });
    } catch {
      sileo.error({
        title: "Ошибка экспорта",
        description: "Не удалось сформировать изображение",
      });
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading, tierListTitle]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
      <div className="relative rounded-2xl border border-amber-500/20 bg-[#0d0f14] p-3.5 sm:p-5 text-white shadow-2xl shadow-amber-500/5 max-h-[85dvh] flex flex-col overflow-hidden">
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Закрыть"
          className="absolute right-3.5 top-3.5 z-10 flex size-7 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-colors hover:border-white/20 hover:text-white"
        >
          <X size={15} />
        </button>

        {/* Загрузка */}
        {loading && (
          <div className="py-4 sm:py-6 flex flex-col items-center justify-center text-center space-y-3.5">
            <div className="relative flex items-center justify-center">
              <div className="size-13 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
              <Flame size={20} className="absolute text-amber-400 animate-pulse" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-semibold text-amber-300">
                {LOADING_PHRASES[loadingPhraseIndex]}
              </p>
              <p className="text-[11px] text-white/40 mt-0.5">
                ИИ-библиотекарь взвешивает книги в тирах...
              </p>
            </div>

            {/* Памятка во время ожидания */}
            <div className="w-full max-w-md rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 sm:p-4 text-left text-xs text-white/80 leading-relaxed shadow-inner">
              <div className="flex items-center gap-1.5 mb-1.5 font-semibold text-amber-400 text-xs sm:text-[13px]">
                <span>☕</span>
                <span>Минутка спокойствия, пока кипят литературные страсти</span>
              </div>
              <p className="text-white/85 mb-2 text-[11px] sm:text-xs">
                Эта прожарка — чистый юмор и повод по-доброму посмеяться над своими вкусами. Мы никого не судим и не обижаем! Ваш результат полностью конфиденциален, но если захотите удивить друзей — кнопка «Поделиться» будет наготове.
              </p>
              <p className="text-white/60 text-[10px] sm:text-[11px] border-t border-amber-500/15 pt-1.5">
                <span className="font-semibold text-amber-300/80">P.S.</span> Чем больше книг, тем дольше Букстраж собирает мысли. А книги без названий и авторов он расшифровать не сможет. Добра и мира вашим книжным полкам! ✨
              </p>
            </div>
          </div>
        )}

        {/* Ошибка */}
        {!loading && error && (
          <div className="py-6 flex flex-col items-center text-center space-y-3">
            <div className="p-2.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-white">Не удалось прожарить тир-лист</h3>
              <p className="text-xs text-white/60 max-w-sm">{error}</p>
            </div>
            <button
              type="button"
              onClick={loadRoast}
              className="nb-btn-primary flex items-center gap-2 text-xs py-2 px-4"
            >
              <RefreshCw size={14} />
              Попробовать снова
            </button>
          </div>
        )}

        {/* Карточка-вердикт */}
        {!loading && !error && result && (
          <div className="overflow-y-auto max-h-[calc(85dvh-2rem)] pr-1 sm:pr-1.5 space-y-2.5">
            {/* Экспортируемая область карточки */}
            <div
              ref={cardRef}
              className="rounded-xl border border-amber-500/30 bg-linear-to-b from-amber-500/10 via-[#12151c] to-[#0d0f14] p-3.5 sm:p-5"
            >
              {/* Хэдер карточки */}
              <div className="flex items-center justify-between gap-3 pb-2 mb-2.5 border-b border-amber-500/20">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded bg-amber-500/20 text-amber-400">
                    <Flame size={14} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                    Прожарка тир-листа
                  </span>
                </div>
                <span className="text-xs text-white/45 truncate max-w-[55%] text-right font-medium">
                  «{tierListTitle}»
                </span>
              </div>

              {/* Архетип */}
              <div className="space-y-0.5 mb-2.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-400/80">
                  Ваш читательский архетип
                </p>
                <h3 className="text-lg sm:text-xl font-black text-amber-300 leading-tight">
                  {cleanQuotes(result.archetype)}
                </h3>
              </div>

              {/* Текст прожарки */}
              <div className="space-y-0.5 mb-2.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/40">
                  Вердикт Букстража
                </p>
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed italic border-l-2 border-amber-400/50 pl-3 py-0.5">
                  «{cleanQuotes(result.roast)}»
                </p>
              </div>

              {/* Главный грех (Hot Take) */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 sm:p-3 mb-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400 mb-0.5">
                  <span>💥 Главный скандал расстановки</span>
                </div>
                <p className="text-xs text-white/85 leading-relaxed">
                  {cleanQuotes(result.hotTake)}
                </p>
              </div>

              {/* Шкала цинизма */}
              <div className="pt-1.5 border-t border-white/5">
                <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-white/50 mb-1">
                  <span>Градус снобизма расстановки</span>
                  <span className="font-bold text-amber-400">{result.cynicismScore}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-amber-500 to-red-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.max(0, result.cynicismScore))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Компактный ряд из 4 кнопок: 4 в ряд на ПК, 2x2 на мобильных */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {/* 1. Скачать постер */}
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isDownloading}
                aria-label="Скачать постер"
                className="nb-btn-primary flex items-center justify-center gap-1.5 text-xs py-2 px-2"
              >
                <Download size={14} className="shrink-0" />
                <span className="truncate">{isDownloading ? "Создаю..." : "Скачать"}</span>
              </button>

              {/* 2. Поделиться в Telegram */}
              <button
                type="button"
                onClick={handleShareTelegram}
                aria-label="Поделиться в Telegram"
                className="nb-btn-secondary flex items-center justify-center gap-1.5 text-xs py-2 px-2 border-white/10 hover:border-amber-400/40 text-white"
              >
                <Share2 size={14} className="text-amber-400 shrink-0" />
                <span className="truncate">В Telegram</span>
              </button>

              {/* 3. Копировать */}
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Копировать текст прожарки"
                className="nb-btn-secondary flex items-center justify-center gap-1.5 text-xs py-2 px-2 border-white/10 text-white/70 hover:text-white"
              >
                {copied ? <Check size={14} className="text-green-400 shrink-0" /> : <Copy size={14} className="shrink-0" />}
                <span className="truncate">{copied ? "Скопировано" : "Копировать"}</span>
              </button>

              {/* 4. Перепрожарить */}
              <button
                type="button"
                onClick={handleReRoast}
                disabled={loading || cooldownRemainingMs > 0}
                aria-label={
                  cooldownRemainingMs > 0
                    ? `Перепрожарить (через ${formatCooldownTime(cooldownRemainingMs)})`
                    : "Перепрожарить тир-лист"
                }
                title={
                  cooldownRemainingMs > 0
                    ? `Кулдаун: доступно через ${formatCooldownTime(cooldownRemainingMs)}`
                    : `Перепрожарить тир-лист${recentAttemptsCount === 1 ? " (осталась 1 попытка)" : ""}`
                }
                className="nb-btn-secondary flex items-center justify-center gap-1.5 text-xs py-2 px-2 text-amber-300/90 border-amber-500/30 hover:border-amber-400 hover:text-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <RefreshCw size={13} className={`shrink-0 ${loading ? "animate-spin" : ""}`} />
                <span className="truncate">
                  {cooldownRemainingMs > 0
                    ? formatCooldownTime(cooldownRemainingMs)
                    : "Перепрожарить"}
                </span>
              </button>
            </div>

            {/* Подсказка кулдауна (если активен) */}
            {cooldownRemainingMs > 0 && (
              <p className="text-[10px] text-white/40 text-center mt-0.5">
                Лимит: 2 попытки подряд. Букстраж остывает.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
