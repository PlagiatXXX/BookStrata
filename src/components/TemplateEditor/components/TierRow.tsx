import { GripVertical, Copy, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import type { TierTemplate } from '@/types/templates';

interface SortableTierRowProps {
  tier: TierTemplate;
  nameError?: string;
  colorError?: string;
  canDelete: boolean;
  onUpdateTier: (tierId: string, patch: Partial<TierTemplate>) => void;
  onDuplicate: (tierId: string) => void;
  onDelete: (tierId: string) => void;
}

export function TierRow({
  tier,
  nameError,
  colorError,
  canDelete,
  onUpdateTier,
  onDuplicate,
  onDelete,
}: SortableTierRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: tier.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-md border border-white/20 bg-black/35 p-3"
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 items-start">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-md border border-white/25 text-[#b8b1a3] hover:text-[#f3efe6] lg:col-span-1 lg:w-full"
          aria-label="Перетащить уровень"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>

        <div className="lg:col-span-5">
          <label className="block text-xs mb-1 text-[#b8b1a3]">Название уровня</label>
          <Input
            value={tier.name}
            maxLength={24}
            onChange={(event) => onUpdateTier(tier.id, { name: event.target.value })}
            placeholder="Например, S"
          />
          {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
        </div>

        <div className="lg:col-span-3">
          <label className="block text-xs mb-1 text-[#b8b1a3]">Цвет</label>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <input
              type="color"
              value={tier.color}
              onChange={(event) => onUpdateTier(tier.id, { color: event.target.value })}
              className="h-10 w-14 rounded-md border border-white/25 bg-transparent"
            />
            <Input
              value={tier.color}
              onChange={(event) => onUpdateTier(tier.id, { color: event.target.value })}
              placeholder="#RRGGBB"
            />
          </div>
          {colorError && <p className="text-xs text-red-500 mt-1">{colorError}</p>}
        </div>

        <div className="flex gap-2 lg:col-span-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onDuplicate(tier.id)}
          >
            <Copy size={14} />
            Дублировать
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            onClick={() => onDelete(tier.id)}
            disabled={!canDelete}
          >
            <Trash2 size={14} />
            Удалить
          </Button>
        </div>
      </div>
    </div>
  );
}
