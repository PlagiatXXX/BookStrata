import { Input } from '@/ui/Input';
import { Textarea } from '@/ui/Textarea';

interface BasicInfoStepProps {
  title: string;
  description: string;
  titleError?: string;
  descriptionError?: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export function BasicInfoStep({
  title,
  description,
  titleError,
  descriptionError,
  onTitleChange,
  onDescriptionChange,
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

      <div className="rounded-md border border-cyan-700/50 bg-cyan-900/30 p-4">
        <p className="text-sm text-cyan-100/90">
          <span className="font-medium">Примечание:</span> Шаблоны всегда личные и видны только вам. 
          Когда вы используете шаблон для создания тир-листа, он появляется в вашем профиле.
        </p>
      </div>
    </section>
  );
}