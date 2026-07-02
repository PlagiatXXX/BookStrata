import { useState } from "react";
import { Heart, X, Check, Copy, Send } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { apiTrackEvent } from "@/lib/analyticsApi";

interface DonateModalProps {
  onClose: () => void;
}

const CARD_NUMBER = "2202200609389554";

export function DonateModal({ onClose }: DonateModalProps) {
  useBodyScrollLock(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CARD_NUMBER);
      setCopied(true);
      window.ym?.(109755750, "reachGoal", "donate_copy");
      apiTrackEvent("donate_copy");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = CARD_NUMBER;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      window.ym?.(109755750, "reachGoal", "donate_copy");
      apiTrackEvent("donate_copy");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-amber-200/20 bg-[#111] p-6 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 transition-colors hover:border-amber-200/30 hover:text-white"
          type="button"
          aria-label="Закрыть"
        >
          <X size={16} />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl border-2 border-amber-200/30 bg-amber-500/10">
            <Heart className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Поддержать проект</h2>
            <p className="text-sm text-gray-400">
              Любая сумма на развитие
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200/20 bg-amber-500/5 p-4">
            <p className="text-sm font-medium text-amber-300 mb-2">
              Реквизиты для перевода
            </p>
            <div className="flex items-center justify-between gap-2 rounded-lg bg-black/40 px-4 py-3 flex-wrap">
              <span className="font-mono text-sm md:text-base font-bold text-white tracking-wider break-all">
                {CARD_NUMBER}
              </span>
              <button
                onClick={handleCopy}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/20"
                type="button"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Скопировано" : "Копировать"}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              Сбербанк • Федор П.
            </p>
          </div>

          <div className="rounded-xl border border-amber-200/20 bg-amber-500/5 p-4">
            <p className="text-sm font-medium text-amber-300 mb-2">
              Связаться
            </p>
            <div className="flex flex-col gap-2">
              <a
                href="https://t.me/PasFedor"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-amber-300 transition-colors"
              >
                <Send size={14} />
                Telegram: @PasFedor
              </a>
              <a
                href="https://vk.com/gim237287277"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-amber-300 transition-colors"
              >
                ВКонтакте
              </a>
              <a
                href="mailto:fedorpasyada@yandex.ru"
                className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-amber-300 transition-colors"
              >
                fedorpasyada@yandex.ru
              </a>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full cursor-pointer rounded-xl border-2 border-amber-200/30 bg-amber-500/10 px-6 py-3 text-sm font-bold text-amber-200 transition-colors hover:bg-amber-500/20"
          type="button"
        >
          Спасибо, понятно
        </button>
      </div>
    </div>
  );
}
