import { useMemo } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/ui/Button';
import { TierRow } from './TierRow';
import type { TierTemplate } from '@/types/templates';

interface TiersStepProps {
  tiers: TierTemplate[];
  tierNameErrors: (string | undefined)[];
  tierColorErrors: (string | undefined)[];
  tiersError?: string;
  onAddTier: () => void;
  onResetToPreset: () => void;
  onUpdateTier: (index: number, patch: Partial<TierTemplate>) => void;
  onDuplicateTier: (index: number) => void;
  onRemoveTier: (index: number) => void;
  onMoveTier: (oldIndex: number, newIndex: number) => void;
}

export function TiersStep({
  tiers,
  tierNameErrors,
  tierColorErrors,
  tiersError,
  onAddTier,
  onResetToPreset,
  onUpdateTier,
  onDuplicateTier,
  onRemoveTier,
  onMoveTier,
}: TiersStepProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const tierIds = useMemo(() => tiers.map((tier) => tier.id), [tiers]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tierIds.indexOf(String(active.id));
    const newIndex = tierIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onMoveTier(oldIndex, newIndex);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" onClick={onAddTier}>
          <Plus size={16} />
          Добавить уровень
        </Button>
        <Button type="button" variant="outline" onClick={onResetToPreset}>
          <RotateCcw size={16} />
          Сбросить к S/A/B/C/D
        </Button>
      </div>

      {tiersError && (
        <p className="text-sm text-red-500">{tiersError}</p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tierIds} strategy={rectSortingStrategy}>
          <div className="space-y-3">
            {tiers.map((tier, index) => (
              <TierRow
                key={tier.id}
                tier={tier}
                nameError={tierNameErrors[index] ?? undefined}
                colorError={tierColorErrors[index] ?? undefined}
                canDelete={tiers.length > 1}
                onUpdateTier={onUpdateTier}
                onDuplicate={onDuplicateTier}
                onDelete={onRemoveTier}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}
