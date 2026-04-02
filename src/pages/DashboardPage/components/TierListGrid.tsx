import { memo } from 'react';
import { TierListCard } from './TierListCard';
import type { TierListGridProps } from '../types';

export const TierListGrid = memo(({
  tierLists,
  onOpen,
  onRename,
  onDelete,
}: TierListGridProps) => {
  return (
    <div className="dashboard-grid">
      {tierLists.map((tierList) => (
        <TierListCard
          key={tierList.id}
          tierList={tierList}
          onOpen={onOpen}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
});
