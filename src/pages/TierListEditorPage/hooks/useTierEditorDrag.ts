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

/** Преобразует Blob в data URL */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

export interface UseTierEditorDragResult {
  tierGridRef: React.RefObject<HTMLDivElement | null>;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEndAndClear: (event: DragEndEvent) => void;
  onDownloadImage: (
    theme?: ExportTheme,
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

      const bookIdRaw = typeof active.id === "string" && active.id.startsWith("book-") ? active.id.slice(5) : active.id;
      const bookData = active.data.current?.book || listData.books[bookIdRaw];
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
      username = "",
    ) => {
      if (tierGridRef.current === null) return;

      logger.info("Downloading tier list as image", {
        title: listData.title,
        theme,
        watermark: true,
      });

      const element = tierGridRef.current;
      const inlineMap = new Map<HTMLElement, string>();

      try {
        const { toPng } = await import("html-to-image");

        // 1. Инлайним кросс-доменные изображения
        const cards = element.querySelectorAll<HTMLElement>(".nb-book-card");
        for (const card of cards) {
          const bg = card.style.backgroundImage;
          if (!bg || bg === "none") continue;

          const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
          if (!match) continue;

          const url = match[1];
          if (url.startsWith("data:")) continue;

          try {
            const resp = await fetch(url, { mode: "cors" });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const blob = await resp.blob();
            const dataUrl = await blobToDataUrl(blob);
            inlineMap.set(card, card.style.backgroundImage);
            card.style.backgroundImage = `url(${dataUrl})`;
            continue;
          } catch {
            // CORS fetch не сработал — пробуем через прокси
          }

          try {
            const proxyUrl = `/api/proxy/image?url=${encodeURIComponent(url)}`;
            const resp = await fetch(proxyUrl);
            if (!resp.ok) continue;
            const blob = await resp.blob();
            const dataUrl = await blobToDataUrl(blob);
            inlineMap.set(card, card.style.backgroundImage);
            card.style.backgroundImage = `url(${dataUrl})`;
          } catch {
            // Прокси тоже не сработал — оставляем как есть
          }
        }

        // 2. Применяем стили экспорта
        element.classList.add("is-exporting");
        if (theme !== "default") {
          element.classList.add(`export-theme-${theme}`);
        }

        // 3. Добавляем водяной знак
        const watermark = document.createElement("div");
        watermark.className = "export-watermark";

        const brandSpan = document.createElement("span");
        brandSpan.textContent = "bookstrata.ru";

        const separator = document.createTextNode(" • ");

        const userSpan = document.createElement("span");
        userSpan.textContent = `@${username || "user"}`;

        watermark.append(brandSpan, separator, userSpan);
        element.appendChild(watermark);

        // 4. Ждем немного для применения стилей и шрифтов
        await new Promise((resolve) => setTimeout(resolve, 100));

        // 5. Генерируем PNG
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

        // 6. Очищаем временные изменения
        element.classList.remove("is-exporting");
        if (theme !== "default") {
          element.classList.remove(`export-theme-${theme}`);
        }
        if (watermark) {
          element.removeChild(watermark);
        }
        for (const [card, originalBg] of inlineMap) {
          card.style.backgroundImage = originalBg;
        }
        inlineMap.clear();

        // 7. Скачиваем файл
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
        for (const [card, originalBg] of inlineMap) {
          card.style.backgroundImage = originalBg;
        }
        inlineMap.clear();

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
