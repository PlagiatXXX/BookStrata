import { Input } from '@/ui/Input';
import { Textarea } from '@/ui/Textarea';

interface BasicInfoStepProps {
  title: string;
  description: string;
  isPublic: boolean;
  titleError?: string;
  descriptionError?: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onIsPublicChange: (value: boolean) => void;
}

export function BasicInfoStep({
  title,
  description,
  isPublic,
  titleError,
  descriptionError,
  onTitleChange,
  onDescriptionChange,
  onIsPublicChange,
}: BasicInfoStepProps) {
  return (
    <section className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2 text-[#f3efe6]">
          Название шаблона *
        </label>
        <Input
          value={title}
          maxLength={80}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Например, Лучшие фэнтези книги"
        />
        {titleError && (
          <p className="text-xs text-red-500 mt-1">{titleError}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-[#f3efe6]">
          Описание
        </label>
        <Textarea
          value={description}
          maxLength={500}
          rows={5}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Кратко опишите, для чего шаблон"
        />
        <div className="mt-1 flex items-center justify-between">
          {descriptionError ? (
            <p className="text-xs text-red-500">{descriptionError}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-[#b8b1a3]">
            {description.length}/500
          </span>
        </div>
      </div>

      <div className="rounded-md border border-white/20 bg-black/25 p-4">
        <label className="inline-flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(event) => onIsPublicChange(event.target.checked)}
            className="size-4"
          />
          <span className="text-sm text-[#f3efe6]">
            Публичный шаблон (виден другим пользователям)
          </span>
        </label>
      </div>
    </section>
  );
}