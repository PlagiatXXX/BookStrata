import { useRef, useCallback } from "react";
import type {
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import type { Book, Tier, TierListData } from "@/types";
import { createLogger } from "@/lib/logger";
import { StorageService } from "@/lib/storage";
import type { ExportTheme } from "../components/ExportModal";
import { sileo } from "sileo";

// Логгер для хука drag-and-drop
const logger = createLogger("TierEditorDrag", { color: "orange" });

// Прозрачный 1×1 GIF для fallback, если изображение не удалось загрузить
const FALLBACK_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

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
      let titleBar: HTMLDivElement | null = null;
      let watermark: HTMLDivElement | null = null;

      try {
        const { toPng } = await import("html-to-image");

        // 1. Инлайним изображения через серверный прокси (обходит CORS)
        //    Прямой fetch к CDN/S3 убран — на продакшене CORS настроен только для bookstrata.ru,
        //    а пользователь может заходить с другого домена.
        const cards = element.querySelectorAll<HTMLElement>(".nb-book-card");
        for (const card of cards) {
          const bg = card.style.backgroundImage;
          if (!bg || bg === "none") continue;

          const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
          if (!match) continue;

          const url = match[1];
          if (url.startsWith("data:")) continue;

          // Пытаемся загрузить через прокси
          try {
            const token = StorageService.getString("authToken");
            const headers: Record<string, string> = {
              "Content-Type": "application/json",
            };
            if (token) {
              headers["Authorization"] = `Bearer ${token}`;
            }
            const proxyUrl = `/api/proxy/image?url=${encodeURIComponent(url)}`;
            const resp = await fetch(proxyUrl, { headers });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const blob = await resp.blob();
            const dataUrl = await blobToDataUrl(blob);
            inlineMap.set(card, card.style.backgroundImage);
            card.style.backgroundImage = `url(${dataUrl})`;
          } catch {
            // Прокси не сработал — ставим прозрачный пиксель вместо кросс-доменного URL,
            // чтобы canvas не стал tainted при отрисовке
            inlineMap.set(card, card.style.backgroundImage);
            card.style.backgroundImage = `url(${FALLBACK_PIXEL})`;
          }
        }

        // 2. Применяем стили экспорта
        element.classList.add("is-exporting");
        if (theme !== "default") {
          element.classList.add(`export-theme-${theme}`);
        }

        // 3. Добавляем заголовок тир-листа сверху
        titleBar = document.createElement("div");
        titleBar.className = "export-title-bar";
        titleBar.textContent = listData.title;
        element.insertBefore(titleBar, element.firstChild);

        // 4. Добавляем водяной знак
        watermark = document.createElement("div");
        watermark.className = "export-watermark";

        const brandSpan = document.createElement("span");
        brandSpan.textContent = "bookstrata.ru";

        const separator = document.createTextNode(" • ");

        const userSpan = document.createElement("span");
        userSpan.textContent = `@${username || "user"}`;

        watermark.append(brandSpan, separator, userSpan);
        element.appendChild(watermark);

        // 5. Ждем немного для применения стилей и шрифтов
        await new Promise((resolve) => setTimeout(resolve, 100));

        // 6. Генерируем PNG
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

        // 7. Очищаем временные изменения
        element.classList.remove("is-exporting");
        if (theme !== "default") {
          element.classList.remove(`export-theme-${theme}`);
        }
        if (titleBar) {
          element.removeChild(titleBar);
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
        if (titleBar && element.contains(titleBar)) {
          element.removeChild(titleBar);
        }
        if (watermark && element.contains(watermark)) {
          element.removeChild(watermark);
        }
        for (const [card, originalBg] of inlineMap) {
          card.style.backgroundImage = originalBg;
        }
        inlineMap.clear();

        logger.error(err instanceof Error ? err : new Error(String(err)), {
          action: "downloadImage",
          title: listData.title,
        });

        sileo.error({
          title: "Не удалось скачать изображение",
          description:
            "Проверьте подключение к интернету или попробуйте ещё раз.",
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
