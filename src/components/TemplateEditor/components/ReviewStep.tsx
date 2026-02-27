import type { TierTemplate } from '@/types/templates';

interface ReviewStepProps {
  mode: 'create' | 'edit';
  title: string;
  description: string;
  tiers: TierTemplate[];
  isDirty?: boolean;
  warnings: string[];
}

export function ReviewStep({
  mode,
  title,
  description,
  tiers,
  isDirty,
  warnings,
}: ReviewStepProps) {
  return (
    <section className="space-y-5">
      <div className="rounded-md border border-white/20 bg-black/25 p-4">
        <h3 className="font-display font-semibold text-[#f3efe6] mb-2">Итог</h3>
        <p className="text-sm text-[#b8b1a3]">
          <span className="font-medium">Название:</span> {title || '—'}
        </p>
        <p className="text-sm text-[#b8b1a3] mt-1">
          <span className="font-medium">Описание:</span> {description || '—'}
        </p>
        <p className="text-sm text-[#b8b1a3] mt-1">
          <span className="font-medium">Доступ:</span> Личный (виден только вам)
        </p>
      </div>

      <div className="rounded-md border border-white/20 bg-black/25 p-4">
        <h3 className="font-display font-semibold text-[#f3efe6] mb-3">Превью уровней</h3>
        <div className="space-y-2">
          {tiers.map((tier, index) => (
            <div key={tier.id} className="flex items-center gap-3 rounded-md border border-white/20 bg-black/20 p-2">
              <span className="w-5 text-xs text-[#b8b1a3] sm:w-6">{index + 1}</span>
              <span
                className="inline-flex h-6 min-w-12 items-center justify-center rounded px-2 text-xs font-semibold text-white sm:min-w-16"
                style={{ backgroundColor: tier.color }}
              >
                {tier.name}
              </span>
              <span className="text-xs text-[#b8b1a3]">{tier.color}</span>
            </div>
          ))}
        </div>
      </div>

      {mode === 'edit' && (
        <div className="rounded-md border border-(--accent-alt)/70 bg-[rgba(47,107,95,0.15)] p-4 text-sm text-[#cce9e2]">
          {isDirty ? 'Изменения есть в текущем шаблоне.' : 'Изменений относительно сохраненной версии нет.'}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-md border border-amber-400/50 bg-amber-500/10 p-4">
          <h4 className="font-medium text-amber-100 mb-1">Предупреждения</h4>
          <ul className="text-sm text-amber-100 list-disc pl-5 space-y-1">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}