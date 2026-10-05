import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rememberBookReturnScroll, restoreBookReturnScroll } from "./bookNavigation";

const KEY = "bookstrata_book_return_scroll";

function savedAt(path: string, scrollY: number) {
  sessionStorage.setItem(KEY, JSON.stringify({ path, scrollY }));
}

describe("rememberBookReturnScroll", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(window, "scrollY", "get").mockReturnValue(1200);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("сохраняет текущий путь и scrollY", () => {
    rememberBookReturnScroll();
    expect(JSON.parse(sessionStorage.getItem(KEY)!)).toEqual({
      path: `${window.location.pathname}${window.location.search}`,
      scrollY: 1200,
    });
  });
});

describe("restoreBookReturnScroll", () => {
  let scrollTo: ReturnType<typeof vi.spyOn>;
  let docHeight: number;

  beforeEach(() => {
    sessionStorage.clear();
    docHeight = 1000;
    vi.spyOn(document.documentElement, "scrollHeight", "get").mockImplementation(
      () => docHeight,
    );
    scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "requestAnimationFrame",
        "cancelAnimationFrame",
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("возвращает null и ничего не делает, если пути не совпадают", () => {
    savedAt("/rankings", 500);
    expect(restoreBookReturnScroll("/collections/top-fantastic")).toBeNull();
    expect(scrollTo).not.toHaveBeenCalled();
    // ключ не трогаем — может принадлежать другому переходу
    expect(sessionStorage.getItem(KEY)).not.toBeNull();
  });

  it("возвращает null, если сохранённого значения нет", () => {
    expect(restoreBookReturnScroll("/collections/top-fantastic")).toBeNull();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("возвращает null при битом JSON", () => {
    sessionStorage.setItem(KEY, "{oops");
    expect(restoreBookReturnScroll("/collections/top-fantastic")).toBeNull();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("восстанавливает позицию и сразу удаляет ключ", () => {
    savedAt("/collections/top-fantastic", 1200);
    const cleanup = restoreBookReturnScroll("/collections/top-fantastic");
    expect(cleanup).not.toBeNull();
    expect(scrollTo).toHaveBeenCalledWith({ top: 1200, behavior: "auto" });
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it("повторяет восстановление, когда высота документа изменилась (контент догрузился)", () => {
    savedAt("/collections/top-fantastic", 1200);
    restoreBookReturnScroll("/collections/top-fantastic");
    expect(scrollTo).toHaveBeenCalledTimes(1);

    // скелетон (1244px) заменён контентом (2643px) — как в баге 611→2010
    docHeight = 2643;
    vi.advanceTimersByTime(16);

    expect(scrollTo).toHaveBeenCalledTimes(2);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 1200, behavior: "auto" });
  });

  it("не трогает скролл, пока высота не изменилась", () => {
    savedAt("/collections/top-fantastic", 1200);
    restoreBookReturnScroll("/collections/top-fantastic");
    vi.advanceTimersByTime(500);
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("cleanup прекращает повторные восстановления", () => {
    savedAt("/collections/top-fantastic", 1200);
    const cleanup = restoreBookReturnScroll("/collections/top-fantastic")!;
    cleanup();

    docHeight = 2643;
    vi.advanceTimersByTime(100);

    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("прекращает повторы по таймауту, даже без cleanup", () => {
    savedAt("/collections/top-fantastic", 1200);
    restoreBookReturnScroll("/collections/top-fantastic");

    vi.advanceTimersByTime(5000);
    docHeight = 9999;
    vi.advanceTimersByTime(100);

    expect(scrollTo).toHaveBeenCalledTimes(1);
  });
});
