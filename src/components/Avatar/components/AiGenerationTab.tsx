import { Info, Sparkles } from 'lucide-react';
import { Spinner } from '@/components/Spinner';
import type { AiGenerationTabProps } from '../types';

export function AiGenerationTab({
  aiPrompt,
  onPromptChange,
  onGenerate,
  isBusy,
  isGenerating,
  isWaitingForResult,
  error,
  previewLoadState,
  remainingGenerations,
  limitInfo,
}: AiGenerationTabProps) {
  const isDisabled = isBusy || !aiPrompt.trim() || remainingGenerations <= 0;

  return (
    <div className="space-y-4">
      {/* Информация о лимитах */}
      <div className="flex items-center gap-2 p-3 bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 rounded-xl">
        <Info size={16} className="text-gray-400 shrink-0" />
        <span className="text-sm text-gray-400">
          Осталось генераций сегодня:{' '}
          <strong className="text-white">{remainingGenerations}</strong>{' '}
          / {limitInfo?.limit ?? 10}
        </span>
      </div>

      {/* Сообщения о статусах */}
      <StatusMessages
        error={error}
        previewLoadState={previewLoadState}
        isWaitingForResult={isWaitingForResult}
      />

      {/* Textarea для промпта */}
      <div>
        <label htmlFor="avatar-selector-prompt-input" className="block text-sm font-medium text-gray-300 mb-2">
          Опишите ваш аватар
        </label>
        <textarea
          id="avatar-selector-prompt-input"
          value={aiPrompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Например: Мужчина с бородой в очках, синий фон, дружелюбная улыбка"
          className="w-full h-28 bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 rounded-xl p-4 resize-none text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Кнопка генерации */}
      <GenerateButton
        onClick={onGenerate}
        disabled={isDisabled}
        isGenerating={isGenerating}
        isWaiting={isWaitingForResult}
      />
    </div>
  );
}

// === Sub-components ===

interface StatusMessagesProps {
  error: string | null;
  previewLoadState: 'idle' | 'loading' | 'ready' | 'error';
  isWaitingForResult: boolean;
}

function StatusMessages({ error, previewLoadState, isWaitingForResult }: StatusMessagesProps) {
  if (error) {
    return (
      <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (previewLoadState === 'loading') {
    return (
      <div className="p-3 bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 rounded-xl">
        <p className="text-sm text-gray-300">
          Загружаем изображение. Это может занять немного времени.
        </p>
      </div>
    );
  }

  if (previewLoadState === 'error') {
    return (
      <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
        <p className="text-sm text-red-400">
          Не удалось загрузить изображение. Попробуйте ещё раз.
        </p>
      </div>
    );
  }

  if (isWaitingForResult) {
    return (
      <div className="p-3 bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 rounded-xl">
        <p className="text-sm text-gray-300">
          Генерация запущена. Обычно занимает до 40 секунд. Можно
          закрыть окно — аватар обновится автоматически.
        </p>
      </div>
    );
  }

  return null;
}

interface GenerateButtonProps {
  onClick: () => void;
  disabled: boolean;
  isGenerating: boolean;
  isWaiting: boolean;
}

function GenerateButton({ onClick, disabled, isGenerating, isWaiting }: GenerateButtonProps) {
  const isBusy = isGenerating || isWaiting;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative w-full py-3.5 bg-linear-to-r from-violet-600 to-fuchsia-600 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-violet-500 hover:to-fuchsia-500 transition-all flex items-center justify-center"
    >
      <span className={isBusy ? 'opacity-0' : 'opacity-100'}>
        <span className="inline-flex items-center gap-2">
          <Sparkles size={18} />
          Сгенерировать
        </span>
      </span>
      <span
        className={`absolute inset-0 flex items-center justify-center gap-2 transition-opacity ${
          isBusy ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Spinner size="lg" className="border-white/90" />
        <span>
          {isGenerating ? 'Создаем...' : 'Дождитесь результата...'}
        </span>
      </span>
    </button>
  );
}
