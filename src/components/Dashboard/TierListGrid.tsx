import { memo } from "react";
import { FolderX } from "lucide-react";
import type { TierListShort } from '@/lib/tierListApi';
import { TierListCard } from "./TierListCard";

interface TierListGridProps {
  tierLists: TierListShort[];
  onRename: (tierList: TierListShort) => void;
  onDelete: (tierList: TierListShort) => void;
}

export const TierListGrid = memo(({ tierLists, onRename, onDelete }: TierListGridProps) => {
  if (tierLists.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderX size={48} className="text-[#b8b1a3] mx-auto mb-4" />
        <p className="text-[#b8b1a3] text-lg">
          У вас пока нет тир-листов
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tierLists.map((tierList) => (
        <TierListCard
          key={tierList.id}
          tierList={tierList}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
});

TierListGrid.displayName = "TierListGrid";
