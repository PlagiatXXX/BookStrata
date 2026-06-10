import { useCallback, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import type { AvatarPreviewProps } from "../types";

export function AvatarPreview({
  currentUrl,
  username,
  hasSelection,
  isBusy,
  busyLabel = "Загружаем...",
  position,
  onPositionChange,
}: AvatarPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    posX: number;
    posY: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const avatarUrl: string | null = currentUrl ?? null;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!avatarUrl) return;
      e.preventDefault();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        posX: position.x,
        posY: position.y,
      };
      setIsDragging(true);
    },
    [avatarUrl, position],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;

      // Переводим пиксели в проценты относительно размера контейнера
      const pctX = (deltaX / rect.width) * 100;
      const pctY = (deltaY / rect.height) * 100;

      const newX = Math.max(-50, Math.min(50, dragRef.current.posX + pctX));
      const newY = Math.max(-50, Math.min(50, dragRef.current.posY + pctY));

      onPositionChange({ x: newX, y: newY });
    },
    [onPositionChange],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  const handlePointerLeave = useCallback(() => {
    // Если пользователь вышел за пределы контейнера — отпускаем
    if (dragRef.current) {
      dragRef.current = null;
      setIsDragging(false);
    }
  }, []);

  const objectPosition = `${50 + position.x}% ${50 + position.y}%`;

  return (
    <div className="flex justify-center mb-6">
      <div className="relative">
        <div
          ref={containerRef}
          className="relative w-32 h-32 rounded-full overflow-hidden ring-2 ring-surface-border bg-surface-light dark:bg-[#200f24] light:bg-gray-100 select-none"
          style={{
            cursor: avatarUrl ? (isDragging ? "grabbing" : "grab") : "default",
            touchAction: "none",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={username ? `${username}'s avatar` : "Avatar"}
              className="pointer-events-none w-full h-full"
              style={{
                objectFit: "cover",
                objectPosition,
              }}
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-purple-500 to-pink-500 text-white font-bold text-3xl">
              {username ? username[0]?.toUpperCase() : "?"}
            </div>
          )}
        </div>

        {isBusy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 pointer-events-none">
            <div className="flex flex-col items-center gap-2">
              <Spinner
                size="lg"
                className="border-white/25 border-t-white border-l-white"
              />
              <span className="text-xs font-medium text-white">
                {busyLabel}
              </span>
            </div>
          </div>
        )}
        {hasSelection && (
          <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1 pointer-events-none">
            <Check size={16} className="text-white" />
          </div>
        )}
      </div>
    </div>
  );
}
