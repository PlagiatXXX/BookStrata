import { useState, useCallback } from "react";
import { Modal } from "@/ui/Modal";
import { Check, Copy, Flame, Share2, Sparkles, X } from "lucide-react";
import { useShare } from "@/hooks/useShare";
import { apiTrackEvent } from "@/lib/analyticsApi";

export interface ShareSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  shareUrl: string;
  coverImageUrl?: string | null;
  booksCount?: number;
  onRoast?: () => void;
}

export function ShareSuccessModal({
  isOpen,
  onClose,
  title,
  shareUrl,
  coverImageUrl,
  booksCount,
  onRoast,
}: ShareSuccessModalProps) {
  const { getShareUrls, copyLink, copied, shareTo } = useShare();
  const [isNativeSharing, setIsNativeSharing] = useState(false);

  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function";

  const shareUrls = getShareUrls({ url: shareUrl, title });

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) return;
    setIsNativeSharing(true);
    try {
      await navigator.share({
        title,
        text: `Мой книжный тир-лист «${title}» на BookStrata`,
        url: shareUrl,
      });
      apiTrackEvent("share_clicked", { method: "native_dialog" });
    } catch {
      // Игнорируем AbortError при закрытии пользователем
    } finally {
      setIsNativeSharing(false);
    }
  }, [shareUrl, title]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[92vw] sm:max-w-md">
      <div className="relative rounded-2xl border border-white/10 bg-[#12151c] p-5 sm:p-6 text-white shadow-2xl">
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Закрыть"
          className="absolute right-4 top-4 flex size-7 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-colors hover:border-white/20 hover:text-white"
        >
          <X size={15} />
        </button>

        {/* Шапка */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <Sparkles size={20} />
          </div>
          <div className="min-w-0 pr-6">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Тир-лист сохранён!
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Поделитесь своим рейтингом с друзьями или книжным клубом
            </p>
          </div>
        </div>

        {/* Превью-сниппет тир-листа с обложкой */}
        <div className="mb-5 flex items-center gap-3.5 rounded-xl border border-white/10 bg-slate-900/80 p-3 shadow-inner">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={title}
              className="size-16 shrink-0 rounded-lg object-cover border border-white/10 shadow-md"
            />
          ) : (
            <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-amber-500/20 to-purple-600/20 text-amber-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-400 tracking-wider uppercase">
                Готов к просмотру
              </span>
            </div>
            <h3 className="text-sm font-bold text-white truncate leading-snug">
              {title || "Без названия"}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {booksCount && booksCount > 0 ? `${booksCount} книг в списке • ` : ""}bookstrata.ru
            </p>
          </div>
        </div>

        {/* Кнопки прямого шеринга в соцсети */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Telegram */}
            <button
              type="button"
              onClick={() => shareTo(shareUrls.telegram)}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#229ED9]/30 bg-[#229ED9]/10 px-3 py-2.5 text-xs font-semibold text-[#64B5F6] transition-all hover:bg-[#229ED9]/20 hover:scale-[1.01] active:scale-[0.99]"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 shrink-0 text-[#229ED9]">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0Zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635Z" />
              </svg>
              <span>Telegram</span>
            </button>

            {/* VK */}
            <button
              type="button"
              onClick={() => shareTo(shareUrls.vk)}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#0077FF]/30 bg-[#0077FF]/10 px-3 py-2.5 text-xs font-semibold text-[#80BFFF] transition-all hover:bg-[#0077FF]/20 hover:scale-[1.01] active:scale-[0.99]"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 shrink-0 text-[#0077FF]">
                <path d="M11.7 18h1.4s.4-.05.6-.2c.2-.15.2-.45.2-.45s-.03-1.3.6-1.5c.6-.2 1.4 1.3 2.2 1.8.6.4 1 .3 1 .3l2.2-.03s1.15-.07.6-.95c-.04-.07-.3-.65-1.6-1.85-1.3-1.2-1.1-1 .45-3.15 1-1.3 1.4-2.1 1.2-2.45-.1-.25-.8-.2-.8-.2l-2.3.02s-.17-.02-.3.07c-.13.08-.2.23-.2.23s-.3.8-.7 1.5c-.8 1.4-1.1 1.5-1.25 1.4-.3-.2-.2-.85-.2-1.3 0-1.4.2-2-.4-2.15-.2-.07-.5-.1-.8-.1-1.2 0-2.2.75-2.2.75s-.45.25-.6.35c0 0-.07.03-.1.05h-.02v.02s0-.02-.02-.02c-.07-.07-.1-.1-.1-.1s-.6-.65-1-.9C9.5 6.3 8.9 6 8.9 6s-.75-.2-.4.3c.25.4.8 1.2 1.1 1.6.4.6.5.9.5.9s.2.35.1.65c-.15.4-.8 1.7-1.1 2-.2.2-.5.2-.7.15-.5-.1-1.1-.75-1.6-1.5C6.4 9.5 6 8.8 6 8.8s-.1-.25-.25-.35c-.2-.1-.5-.1-.5-.1l-2.2.02s-.33.01-.45.15c-.1.15 0 .45 0 .45s1.3 3.1 2.9 4.7c1.4 1.4 3 1.3 3 1.3h.7z" />
              </svg>
              <span>ВКонтакте</span>
            </button>
          </div>

          {/* Инпут со ссылкой и кнопкой копирования */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 p-1.5 pl-3">
            <span className="text-xs font-mono text-slate-300 truncate select-all flex-1 min-w-0">
              {shareUrl}
            </span>
            <button
              type="button"
              onClick={() => copyLink(shareUrl)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0 ${
                copied
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-white/10 text-white hover:bg-white/15"
              }`}
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? "Скопировано" : "Копировать"}</span>
            </button>
          </div>

          {/* Дополнительная кнопка «Другие приложения» (для системного диалога) */}
          {canShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              disabled={isNativeSharing}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Share2 size={13} />
              <span>Другие приложения...</span>
            </button>
          )}

          {/* Кнопка «Прожарить тир-лист» */}
          {onRoast && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRoast();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2.5 px-3 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all cursor-pointer"
              >
                <Flame size={15} className="text-amber-400" />
                <span>🔥 Узнать вердикт ИИ о расстановке</span>
              </button>
            </div>
          )}
        </div>

        {/* Футер: кнопка закрытия / продолжения */}
        <div className="mt-5 pt-3 border-t border-white/10 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer py-1 px-3"
          >
            Продолжить редактирование
          </button>
        </div>
      </div>
    </Modal>
  );
}
