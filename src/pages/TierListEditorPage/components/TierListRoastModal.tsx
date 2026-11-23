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
}

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
}: TierListRoastModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TierListRoastResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Циклическая смена фраз при загрузке
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingPhraseIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [loading]);

  const loadRoast = useCallback(async () => {
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Не удалось получить прожарку";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [tierListTitle, tierListDescription, tiers, books]);

  useEffect(() => {
    if (isOpen && !result && !loading && !error) {
      loadRoast();
    }
  }, [isOpen, result, loading, error, loadRoast]);

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
      <div className="relative rounded-2xl border border-amber-500/20 bg-[#0d0f14] p-4 sm:p-6 text-white shadow-2xl shadow-amber-500/5 max-h-[92dvh] flex flex-col">
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Закрыть"
          className="absolute right-4 top-4 z-10 flex size-7 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-colors hover:border-white/20 hover:text-white"
        >
          <X size={15} />
        </button>

        {/* Загрузка */}
        {loading && (
          <div className="py-14 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="size-16 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
              <Flame size={24} className="absolute text-amber-400 animate-pulse" />
            </div>
            <div>
              <p className="text-base font-semibold text-amber-300">
                {LOADING_PHRASES[loadingPhraseIndex]}
              </p>
              <p className="text-xs text-white/40 mt-1">
                ИИ-библиотекарь взвешивает книги в тирах...
              </p>
            </div>
          </div>
        )}

        {/* Ошибка */}
        {!loading && error && (
          <div className="py-8 flex flex-col items-center text-center space-y-4">
            <div className="p-3 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              <AlertTriangle size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Не удалось прожарить тир-лист</h3>
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
          <div className="overflow-y-auto max-h-[calc(92dvh-3rem)] pr-1 sm:pr-2 space-y-4">
            {/* Экспортируемая область карточки */}
            <div
              ref={cardRef}
              className="rounded-xl border border-amber-500/30 bg-linear-to-b from-amber-500/10 via-[#12151c] to-[#0d0f14] p-5 sm:p-7"
            >
              {/* Хэдер карточки */}
              <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-amber-500/20">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-amber-500/20 text-amber-400">
                    <Flame size={16} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
                    Прожарка тир-листа
                  </span>
                </div>
                <span className="text-xs text-white/45 truncate max-w-[55%] text-right font-medium">
                  «{tierListTitle}»
                </span>
              </div>

              {/* Архетип */}
              <div className="space-y-1 mb-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-400/80">
                  Ваш читательский архетип
                </p>
                <h3 className="text-xl sm:text-2xl font-black text-amber-300 leading-tight">
                  {cleanQuotes(result.archetype)}
                </h3>
              </div>

              {/* Текст прожарки */}
              <div className="space-y-1 mb-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/40">
                  Вердикт Букстража
                </p>
                <p className="text-sm sm:text-base text-white/90 leading-relaxed italic border-l-2 border-amber-400/50 pl-3.5 py-1">
                  «{cleanQuotes(result.roast)}»
                </p>
              </div>

              {/* Главный грех (Hot Take) */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 sm:p-4 mb-4">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400 mb-1">
                  <span>💥 Главный скандал расстановки</span>
                </div>
                <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
                  {cleanQuotes(result.hotTake)}
                </p>
              </div>

              {/* Шкала цинизма */}
              <div className="pt-2 border-t border-white/5">
                <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-white/50 mb-1.5">
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

            {/* Кнопки действий */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isDownloading}
                className="nb-btn-primary flex items-center justify-center gap-1.5 text-xs py-2.5"
              >
                <Download size={15} />
                <span>{isDownloading ? "Создаю..." : "Скачать постер"}</span>
              </button>

              <button
                type="button"
                onClick={handleShareTelegram}
                className="nb-btn-secondary flex items-center justify-center gap-1.5 text-xs py-2.5 border-white/10 hover:border-amber-400/40 text-white"
              >
                <Share2 size={15} className="text-amber-400" />
                <span>В Telegram</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="nb-btn-secondary flex items-center justify-center gap-1.5 text-xs py-2.5 border-white/10 text-white/70 hover:text-white"
              >
                {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
                <span>{copied ? "Скопировано" : "Копировать"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
