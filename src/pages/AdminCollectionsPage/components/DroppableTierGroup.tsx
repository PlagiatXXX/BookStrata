import { memo } from "react";
import { useDroppable } from "@dnd-kit/core";

interface DroppableTierGroupProps {
  tierId: string;
  label: string;
  color: string;
  unranked?: boolean;
  children: React.ReactNode;
}

export const DroppableTierGroup = memo(function DroppableTierGroup({
  tierId,
  label,
  color,
  unranked,
  children,
}: DroppableTierGroupProps) {
  const { setNodeRef, isOver } = useDroppable({ id: tierId });

  return (
    <div
      ref={setNodeRef}
      className={`curated-editor-tier-group ${isOver ? "curated-editor-tier-group--drag-over" : ""}`}
      style={isOver ? { borderColor: color || "var(--accent-main)" } : undefined}
    >
      <div
        className={`curated-editor-tier-label ${unranked ? "unranked" : ""}`}
        style={unranked ? undefined : { borderLeftColor: color }}
      >
        {label}
      </div>
      {children}
    </div>
  );
});
