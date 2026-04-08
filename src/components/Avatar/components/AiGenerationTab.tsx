import { Info, Sparkles } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import type { AiGenerationTabProps } from "../types";

export function AiGenerationTab({
  aiPrompt,
  onPromptChange,
  onGenerate,
  isBusy,
  isGenerating,
  error,
  previewLoadState,
  remainingGenerations,
  limitInfo,
}: AiGenerationTabProps) {
  const isDisabled = isBusy || !aiPrompt.trim() || remainingGenerations <= 0;
  const isPro = limitInfo?.isPro ?? false;

  return (
    <div className="space-y-4">
      {!isPro ? (
        <div className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-xl">
          <p className="text-sm text-amber-300">
            <strong>AI генерация доступна только для Pro подписчиков</strong>
          </p>
          <p className="text-xs text-amber-400 mt-1">
            Получите Pro подписку для генерации уникальных аватаров с помощью AI
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 rounded-xl">
          <Info size={16} className="text-gray-400 shrink-0" />
          <span className="text-sm text-gray-400">
            Осталось генераций сегодня:{" "}
            <strong className="text-white">{remainingGenerations}</strong> /{" "}
            {limitInfo?.limit ?? 50}
          </span>
        </div>
      )}

      <StatusMessages
        error={error}
        previewLoadState={previewLoadState}
        isGenerating={isGenerating}
      />

      <div>
        <label
          htmlFor="avatar-selector-prompt-input"
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          Опишите ваш аватар
        </label>
        <textarea
          id="avatar-selector-prompt-input"
          value={aiPrompt}
          maxLength={500}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder="Например: мужчина с бородой в очках, синий фон, дружелюбная улыбка"
          className="w-full h-28 bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 rounded-xl p-4 resize-none text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex justify-end mt-1">
          <span
            className={`text-xs ${aiPrompt.length >= 500 ? "text-red-500" : "text-gray-500"}`}
          >
            {aiPrompt.length}/500
          </span>
        </div>
      </div>

      <GenerateButton
        onClick={onGenerate}
        disabled={isDisabled}
        isBusy={isBusy}
        isGenerating={isGenerating}
        isPro={isPro}
      />
    </div>
  );
}

interface StatusMessagesProps {
  error: string | null;
  previewLoadState: "idle" | "loading" | "ready" | "error";
  isGenerating: boolean;
}

function StatusMessages({
  error,
  previewLoadState,
  isGenerating,
}: StatusMessagesProps) {
  if (error) {
    return (
      <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex items-center gap-3 p-3 bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 rounded-xl">
        <Spinner
          size="sm"
          className="border-white/25 border-t-white border-l-white shrink-0"
        />
        <p className="text-sm text-gray-300">
          Отправляем запрос на генерацию аватара.
        </p>
      </div>
    );
  }

  if (previewLoadState === "loading") {
    return (
      <div className="flex items-center gap-3 p-3 bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 rounded-xl">
        <Spinner
          size="sm"
          className="border-white/25 border-t-white border-l-white shrink-0"
        />
        <p className="text-sm text-gray-300">
          Загружаем изображение. Это может занять немного времени.
        </p>
      </div>
    );
  }

  if (previewLoadState === "error") {
    return (
      <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
        <p className="text-sm text-red-400">
          Не удалось загрузить изображение. Попробуйте ещё раз.
        </p>
      </div>
    );
  }

  return null;
}

interface GenerateButtonProps {
  onClick: () => void;
  disabled: boolean;
  isBusy: boolean;
  isGenerating: boolean;
  isPro: boolean;
}

function GenerateButton({
  onClick,
  disabled,
  isBusy,
  isGenerating,
  isPro,
}: GenerateButtonProps) {
  const busyLabel = isGenerating ? "Генерируем..." : "Загружаем...";

  if (!isPro) {
    return (
      <button
        disabled
        className="relative w-full py-3.5 bg-gray-700 rounded-xl font-semibold text-gray-400 cursor-not-allowed flex items-center justify-center"
      >
        <span className="inline-flex items-center gap-2">
          <Sparkles size={18} />
          Требуется Pro подписка
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative w-full py-3.5 bg-linear-to-r from-violet-600 to-fuchsia-600 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-violet-500 hover:to-fuchsia-500 transition-all flex items-center justify-center"
    >
      <span className={isBusy ? "opacity-0" : "opacity-100"}>
        <span className="inline-flex items-center gap-2">
          <Sparkles size={18} />
          Сгенерировать
        </span>
      </span>
      <span
        className={`absolute inset-0 flex items-center justify-center gap-2 transition-opacity ${
          isBusy ? "opacity-100" : "opacity-0"
        }`}
      >
        <Spinner size="sm" className="border-white/25 border-t-white border-l-white" />
        <span>{busyLabel}</span>
      </span>
    </button>
  );
}
