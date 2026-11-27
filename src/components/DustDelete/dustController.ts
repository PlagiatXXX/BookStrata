import { captureElementPixels } from "./captureElementPixels";
import {
  createDustBatch,
  startBatchReassemble,
  type DustBatch,
  type DustRect,
} from "./dustEngine";

export interface TriggerDustOptions {
  id?: string;
  stepPx?: number;
  onGone?: () => void;
}

type WakeListener = () => void;

const RETAIN_FOR_UNDO_MS = 5500;

const batches: DustBatch[] = [];
const wakeListeners = new Set<WakeListener>();
const cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

let seq = 0;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function nowSec(): number {
  if (typeof performance !== "undefined") {
    return performance.now() / 1000;
  }
  return Date.now() / 1000;
}

function notifyWake(): void {
  wakeListeners.forEach((listener) => listener());
}

function scheduleBatchCleanup(id: string): void {
  const prev = cleanupTimers.get(id);
  if (prev) clearTimeout(prev);

  const timer = setTimeout(() => {
    cleanupTimers.delete(id);
    const idx = batches.findIndex((b) => b.id === id && (b.state === "gone" || b.state === "restored"));
    if (idx !== -1) {
      batches.splice(idx, 1);
    }
  }, RETAIN_FOR_UNDO_MS);

  cleanupTimers.set(id, timer);
}

/**
 * Снимает пиксели DOM-элемента и запускает анимацию рассыпания в пыль на глобальном оверлее.
 */
export function triggerDustDisintegrate(
  el: HTMLElement | null | undefined,
  options: TriggerDustOptions = {},
): string | null {
  if (!el) return null;

  const id = options.id ?? `dust-${++seq}`;
  const stepPx = options.stepPx ?? 2;
  const captured = captureElementPixels(el, stepPx);
  if (!captured || captured.colors.length === 0) return null;

  // Убираем предыдущий батч с тем же id, если элемент удалили повторно
  const existingIdx = batches.findIndex((b) => b.id === id);
  if (existingIdx !== -1) {
    batches.splice(existingIdx, 1);
  }

  const prevTimer = cleanupTimers.get(id);
  if (prevTimer) {
    clearTimeout(prevTimer);
    cleanupTimers.delete(id);
  }

  const batch = createDustBatch({
    id,
    rect: captured.rect,
    stepPx: captured.stepPx,
    pixels: captured.pixels,
    colors: captured.colors,
    nowSec: nowSec(),
    reduceMotion: prefersReducedMotion(),
    onGone: () => {
      options.onGone?.();
      scheduleBatchCleanup(id);
    },
  });

  batches.push(batch);
  notifyWake();
  return id;
}

/**
 * Запускает обратную сборку (Undo) для ранее рассыпанного элемента.
 * Возвращает true, если батч найден и сборка запущена; false — если частиц уже нет.
 */
export function triggerDustReassemble(
  id: string,
  targetRect?: DustRect,
  onRestored?: () => void,
): boolean {
  const batch = batches.find((b) => b.id === id && (b.state === "dust" || b.state === "gone"));
  if (!batch) return false;

  const prevTimer = cleanupTimers.get(id);
  if (prevTimer) {
    clearTimeout(prevTimer);
    cleanupTimers.delete(id);
  }

  startBatchReassemble(
    batch,
    targetRect,
    nowSec(),
    prefersReducedMotion(),
    () => {
      onRestored?.();
      const idx = batches.indexOf(batch);
      if (idx !== -1) {
        batches.splice(idx, 1);
      }
    },
  );

  notifyWake();
  return true;
}

export function getActiveDustBatches(): DustBatch[] {
  return batches;
}

export function subscribeDustWake(listener: WakeListener): () => void {
  wakeListeners.add(listener);
  return () => {
    wakeListeners.delete(listener);
  };
}

/** Находит DOM-элемент по data-book-id с безопасным экранированием CSS-селектора. */
export function findBookElement(bookId: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const escapedId =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(bookId)
      : bookId.replace(/"/g, '\\"');
  return document.querySelector<HTMLElement>(`[data-book-id="${escapedId}"]`);
}

/** Используется в тестах для очистки состояния контроллера. */
export function resetDustController(): void {
  batches.length = 0;
  for (const timer of cleanupTimers.values()) {
    clearTimeout(timer);
  }
  cleanupTimers.clear();
}
