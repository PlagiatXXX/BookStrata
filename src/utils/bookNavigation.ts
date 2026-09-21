const BOOK_RETURN_SCROLL_KEY = "bookstrata_book_return_scroll";

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

export function restoreBookReturnScroll(path: string): boolean {
  try {
    const raw = sessionStorage.getItem(BOOK_RETURN_SCROLL_KEY);
    if (!raw) return false;

    const value = JSON.parse(raw) as BookReturnScroll;
    if (value.path !== path) return false;

    sessionStorage.removeItem(BOOK_RETURN_SCROLL_KEY);
    window.scrollTo({ top: value.scrollY, behavior: "auto" });
    return true;
  } catch {
    return false;
  }
}
