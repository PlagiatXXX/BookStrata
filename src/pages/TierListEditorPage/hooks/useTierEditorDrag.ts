import { useRef, useCallback } from "react";
import type {
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import type { Book, Tier, TierListData } from "@/types";
import { createLogger } from "@/lib/logger";
import type { ExportTheme } from "../components/ExportModal";

// Логгер для хука drag-and-drop
const logger = createLogger("TierEditorDrag", { color: "orange" });

export interface UseTierEditorDragResult {
  tierGridRef: React.RefObject<HTMLDivElement | null>;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEndAndClear: (event: DragEndEvent) => void;
  onDownloadImage: (
    theme?: ExportTheme,
    showWatermark?: boolean,
    username?: string,
  ) => Promise<void>;
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

      const bookData = active.data.current?.book || listData.books[active.id];
      const tierData = active.data.current?.tier || listData.tiers[active.id];

      if (type === "book") setActiveItem(bookData || null);
      else if (type === "tier") setActiveItem(tierData || null);
    },
    [listData.books, listData.tiers, setActiveItem],
  );

  const handleDragOver = useCallback((_event: DragOverEvent) => {
     void _event;
    // Intentionally empty — dnd-kit handles droppable detection internally
  }, []);

  const handleDragEndAndClear = useCallback(
    (event: DragEndEvent) => {
      handleDragEndWithUnsaved(event);
      setActiveItem(null);
    },
    [handleDragEndWithUnsaved, setActiveItem],
  );

  const onDownloadImage = useCallback(
    async (
      theme: ExportTheme = "default",
      showWatermark = true,
      username = "",
    ) => {
      if (tierGridRef.current === null) return;

      logger.info("Downloading tier list as image", {
        title: listData.title,
        theme,
        showWatermark,
      });

      const element = tierGridRef.current;

      try {
        const { toPng } = await import("html-to-image");

        // 1. Применяем стили экспорта
        element.classList.add("is-exporting");
        if (theme !== "default") {
          element.classList.add(`export-theme-${theme}`);
        }

        // 2. Добавляем водяной знак если нужно
        let watermark: HTMLDivElement | null = null;
        if (showWatermark) {
          watermark = document.createElement("div");
          watermark.className = "export-watermark";

          const brandSpan = document.createElement("span");
          brandSpan.textContent = "BookStrata Pro";

          const separator = document.createTextNode(" • ");

          const userSpan = document.createElement("span");
          userSpan.textContent = `@${username || "user"}`;

          watermark.append(brandSpan, separator, userSpan);
          element.appendChild(watermark);
        }

        // 3. Ждем немного для применения стилей и шрифтов
        await new Promise((resolve) => setTimeout(resolve, 100));

        // 4. Генерируем PNG
        const dataUrl = await toPng(element, {
          cacheBust: true,
          backgroundColor:
            theme === "minimalist"
              ? "#ffffff"
              : theme === "vintage"
                ? "#f4ecd8"
                : "#000000",
          style: {
            transform: "scale(1)",
          },
        });

        // 5. Очищаем временные изменения
        element.classList.remove("is-exporting");
        if (theme !== "default") {
          element.classList.remove(`export-theme-${theme}`);
        }
        if (watermark) {
          element.removeChild(watermark);
        }

        // 6. Скачиваем файл
        const link = document.createElement("a");
        link.download = `${listData.title.replace(/\s+/g, "-")}-${theme}.png`;
        link.href = dataUrl;
        link.click();

        logger.info("Tier list image downloaded successfully", {
          title: listData.title,
        });
      } catch (err) {
        // Пытаемся очистить в случае ошибки
        element.classList.remove("is-exporting");
        element.className = element.className
          .split(" ")
          .filter((c) => !c.startsWith("export-theme-"))
          .join(" ");

        logger.error(err instanceof Error ? err : new Error(String(err)), {
          action: "downloadImage",
          title: listData.title,
        });
      }
    },
    [listData.title],
  );

  return {
    tierGridRef,
    handleDragStart,
    handleDragOver,
    handleDragEndAndClear,
    onDownloadImage,
  };
}
