import { Info, Sparkles } from 'lucide-react';
import { Spinner } from '@/components/Spinner';

interface LimitInfo {
  used: number;
  limit: number;
  remaining: number;
}

interface AiGenerationTabProps {
  aiPrompt: string;
  isBusy: boolean;
  isGenerating: boolean;
  isWaitingForResult: boolean;
  error: string | null;
  previewLoadState: 'idle' | 'loading' | 'ready' | 'error';
  remainingGenerations: number;
  limitInfo: LimitInfo | null;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
}

export function AiGenerationTab({
  aiPrompt,
  isBusy,
  isGenerating,
  isWaitingForResult,
  error,
  previewLoadState,
  remainingGenerations,
  limitInfo,
  onPromptChange,
  onGenerate,
}: AiGenerationTabProps) {
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

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {previewLoadState === 'loading' && (
        <div className="p-3 bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 rounded-xl">
          <p className="text-sm text-gray-300">
            Загружаем изображение. Это может занять немного времени.
          </p>
        </div>
      )}

      {previewLoadState === 'error' && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
          <p className="text-sm text-red-400">
            Не удалось загрузить изображение. Попробуйте ещё раз.
          </p>
        </div>
      )}

      {isWaitingForResult && (
        <div className="p-3 bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 rounded-xl">
          <p className="text-sm text-gray-300">
            Генерация запущена. Обычно занимает до 40 секунд. Можно
            закрыть окно — аватар обновится автоматически.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="avatar-prompt-input" className="block text-sm font-medium text-gray-300 mb-2">
          Опишите ваш аватар
        </label>
        <textarea
          id="avatar-prompt-input"
          value={aiPrompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Например: Мужчина с бородой в очках, синий фон, дружелюбная улыбка"
          className="w-full h-28 bg-surface-light dark:bg-[#2d2d44] light:bg-gray-100 rounded-xl p-4 resize-none text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <button
        onClick={onGenerate}
        disabled={isBusy || !aiPrompt.trim() || remainingGenerations <= 0}
        className="relative w-full py-3.5 bg-linear-to-r from-violet-600 to-fuchsia-600 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-violet-500 hover:to-fuchsia-500 transition-colors flex items-center justify-center"
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
    </div>
  );
}
