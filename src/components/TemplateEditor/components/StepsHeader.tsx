import { Save } from 'lucide-react';
import { Button } from '@/ui/Button';
import type { TemplateEditorStep } from '@/types/templateEditor';

interface Step {
  id: TemplateEditorStep;
  title: string;
  subtitle: string;
}

interface StepsHeaderProps {
  mode: 'create' | 'edit';
  currentStep: TemplateEditorStep;
  draftStatus: 'idle' | 'saving' | 'saved' | 'error';
  draftLastSaved: Date | null;
  isSubmitting: boolean;
  isValid: boolean;
  onStepClick: (step: TemplateEditorStep) => void;
  onCancel: () => void;
  onSave: () => void;
}

const steps: Step[] = [
  { id: 0, title: 'Основное', subtitle: 'Название, описание и доступ' },
  { id: 1, title: 'Уровни', subtitle: 'Структура и порядок уровней' },
  { id: 2, title: 'Проверка', subtitle: 'Превью и сохранение' },
];

const draftStatusText: Record<string, string> = {
  idle: 'Черновик не сохранен',
  saving: 'Сохраняем черновик...',
  saved: 'Черновик сохранен',
  error: 'Ошибка сохранения черновика',
};

const formatLastSaved = (date: Date | null) => {
  if (!date) return '';
  return date.toLocaleTimeString();
};

export function StepsHeader({
  mode,
  currentStep,
  draftStatus,
  draftLastSaved,
  isSubmitting,
  isValid,
  onStepClick,
  onCancel,
  onSave,
}: StepsHeaderProps) {
  return (
    <header className="border-b border-white/20 p-4 lg:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#f3efe6] sm:text-2xl">
              {mode === 'create' ? 'Создание шаблона' : 'Редактирование шаблона'}
            </h2>
            <p className="text-sm text-[#b8b1a3]">
              {draftStatusText[draftStatus]}
              {draftLastSaved ? ` • ${formatLastSaved(draftLastSaved)}` : ''}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
              Отменить
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={onSave}
              disabled={!isValid || isSubmitting}
              className="w-full sm:w-auto"
            >
              <Save size={16} />
              {isSubmitting ? 'Сохраняем...' : 'Сохранить'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {steps.map((step) => {
            const isActive = currentStep === step.id;
            const isComplete = currentStep > step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepClick(step.id)}
                className={`rounded-md border p-3 text-left transition ${
                  isActive
                    ? 'border-(--accent-main) bg-[rgba(217,79,43,0.12)]'
                    : isComplete
                      ? 'border-(--accent-alt) bg-[rgba(47,107,95,0.14)]'
                      : 'border-white/25 bg-black/25 hover:border-white/40'
                }`}
              >
                <p className="text-sm font-semibold text-[#f3efe6]">{step.title}</p>
                <p className="text-xs text-[#b8b1a3]">{step.subtitle}</p>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
