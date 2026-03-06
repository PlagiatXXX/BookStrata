import { useRef, useCallback } from 'react';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import type { Book, Tier, TierListData } from '@/types';
import { logger } from '@/lib/logger';

export interface UseTierEditorDragResult {
  tierGridRef: React.RefObject<HTMLDivElement | null>;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEndAndClear: (event: DragEndEvent) => void;
  onDownloadImage: () => Promise<void>;
}

interface UseTierEditorDragParams {
  listData: TierListData;
  setActiveItem: React.Dispatch<React.SetStateAction<Book | Tier | null>>;
  handleDragEndWithUnsaved: (event: DragEndEvent) => void;
}

export function useTierEditorDrag({
  listData,
  setActiveItem,
  handleDragEndWithUnsaved,
}: UseTierEditorDragParams): UseTierEditorDragResult {
  const tierGridRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const type = active.data.current?.type;
      if (type === 'book') setActiveItem(listData.books[active.id] || null);
      else if (type === 'tier') setActiveItem(listData.tiers[active.id] || null);
    },
    [listData.books, listData.tiers, setActiveItem],
  );

  const handleDragEndAndClear = useCallback(
    (event: DragEndEvent) => {
      handleDragEndWithUnsaved(event);
      setActiveItem(null);
    },
    [handleDragEndWithUnsaved, setActiveItem],
  );

  const onDownloadImage = useCallback(async () => {
    if (tierGridRef.current === null) return;
    logger.info('Downloading tier list as image', { title: listData.title });
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(tierGridRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = `${listData.title.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
      logger.info('Tier list image downloaded successfully', {
        title: listData.title,
      });
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error(String(err)), {
        action: 'downloadImage',
        title: listData.title,
      });
    }
  }, [listData.title]);

  return {
    tierGridRef,
    handleDragStart,
    handleDragEndAndClear,
    onDownloadImage,
  };
}
