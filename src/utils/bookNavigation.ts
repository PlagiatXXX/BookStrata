const BOOK_RETURN_SCROLL_KEY = "bookstrata_book_return_scroll";

/** Сколько времени удерживаем «догоняющий» restore, пока контент догружается */
const WATCH_TIMEOUT_MS = 3000;

interface BookReturnScroll {
  path: string;
  scrollY: number;
}

export function rememberBookReturnScroll(): void {
  try {
    const value: BookReturnScroll = {
      path: `${window.location.pathname}${window.location.search}`,
      scrollY: window.scrollY,
    };
    sessionStorage.setItem(BOOK_RETURN_SCROLL_KEY, JSON.stringify(value));
  } catch {
    // sessionStorage may be unavailable in private browsing.
  }
}

/**
 * Восстанавливает позицию скролла для пути `path` и возвращает cleanup.
 *
 * Первое восстановление может попасть на скелетон (документ короче финального
 * контента, скролл обрезается), а после отрисовки данных браузерный scroll
 * anchoring уводит страницу в футер. Поэтому повторяем scrollTo, пока высота
 * документа меняется (контент догружается), до WATCH_TIMEOUT_MS или cleanup.
 */
export function restoreBookReturnScroll(path: string): (() => void) | null {
  let value: BookReturnScroll | null = null;
  try {
    const raw = sessionStorage.getItem(BOOK_RETURN_SCROLL_KEY);
    if (!raw) return null;
    value = JSON.parse(raw) as BookReturnScroll;
  } catch {
    return null;
  }

  if (value.path !== path) return null;

  try {
    sessionStorage.removeItem(BOOK_RETURN_SCROLL_KEY);
  } catch {
    // ignore
  }

  const apply = () => {
    window.scrollTo({ top: value!.scrollY, behavior: "auto" });
  };
  apply();

  const getHeight = () => document.documentElement.scrollHeight;
  let lastHeight = getHeight();
  let rafId = 0;
  let finished = false;

  const stop = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(rafId);
    clearTimeout(timerId);
  };

  const tick = () => {
    if (finished) return;
    const height = getHeight();
    if (height !== lastHeight) {
      lastHeight = height;
      apply();
    }
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  const timerId = setTimeout(stop, WATCH_TIMEOUT_MS);

  return stop;
}
