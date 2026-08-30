// src/pages/BookPage/BookPage.test.tsx
// Рендер, загрузка, ошибка, 404 — по плану (Фаза 5, тесты).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, useParams } from "react-router-dom";
import BookPage from "./BookPage";
import { buildBookJsonLd, buildDescriptionSnippet } from "./seo";
import type { BookPageData } from "@/lib/bookApi";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

vi.mock("@/hooks/useAuthContext", () => ({
  useAuth: vi.fn(() => ({ user: null, isLoading: false })),
}));

vi.mock("@/hooks/useBookRating", () => ({
  useBookRatings: vi.fn(() => ({ data: null })),
  useMyBookRating: vi.fn(() => ({ data: null })),
  useRateBook: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

const toggleStatusMock = vi.fn();
vi.mock("@/hooks/useBookshelf", () => ({
  useBookshelf: vi.fn(() => ({ shelf: {}, toggleStatus: toggleStatusMock })),
}));

// Мокаем «тяжёлые» общие компоненты — они не относятся к странице книги
vi.mock("@/ui/Header", () => ({ Header: () => null }));
vi.mock("@/ui/Footer", () => ({ Footer: () => null }));
vi.mock("@/ui/MobileBottomNav", () => ({ MobileBottomNav: () => null }));
vi.mock("@/pages/NotFoundPage/NotFoundPage", () => ({
  default: () => <div>Страница не найдена</div>,
}));

vi.mock("@/hooks/useBook", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useBook")>();
  return {
    ...actual,
    useBook: vi.fn(),
    useToggleBookLike: vi.fn(() => ({ mutate: vi.fn() })),
    useAddBookToTierList: vi.fn(() => ({ mutate: vi.fn() })),
    useMyTierLists: vi.fn(() => ({ data: [], isLoading: false })),
  };
});

vi.mock("@/lib/tierListApi", () => ({
  createTierList: vi.fn(),
}));

import { useBook } from "@/hooks/useBook";
import { useBookshelf } from "@/hooks/useBookshelf";
import { useAuth } from "@/hooks/useAuthContext";
import { createTierList } from "@/lib/tierListApi";

const mockedUseBook = vi.mocked(useBook);
const mockedUseBookshelf = vi.mocked(useBookshelf);
const mockedUseAuth = vi.mocked(useAuth);
const mockedUseParams = vi.mocked(useParams);

const bookPageData: BookPageData = {
  book: {
    id: 1,
    slug: "velikij-getssbi",
    title: "Великий Гэтсби",
    author: "Ф. Скотт Фицджеральд",
    coverImageUrl: "https://example.com/cover.jpg",
    ogImageUrl: null,
    description: "Роман, ставший символом века джаза.",
    genre: "Роман",
    tags: ["Классика", "Драма"],
    status: "published",
    rating: 8.4,
    likesCount: 12,
    publishedYear: 1925,
    isbn: null,
    contextChain: null,
  },
  author: { id: 1, name: "Ф. Скотт Фицджеральд", slug: "f-skott-fitsdzherald" },
  tierLists: [{ id: "tl-1", slug: "top-100", title: "Топ-100 классики", isPublic: true }],
  collections: [{ id: 1, slug: "velikie-romany", title: "Великие романы", type: "collection" }],
  celebrities: [{ id: 1, slug: "stephen-king", name: "Стивен Кинг" }],
  similarBooks: [],
  otherBooksByAuthor: [],
  comments: { items: [], total: 0 },
  userLike: false,
};

function renderPage(initialEntries: string[] = ["/books/velikij-getssbi"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <HelmetProvider>
          <BookPage />
        </HelmetProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("BookPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseParams.mockReturnValue({ slug: "velikij-getssbi" });
  });

  it("показывает загрузку, пока данные не пришли", () => {
    mockedUseBook.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as never);
    const { container } = renderPage();
    // Spinner (aria-hidden, без текста) — проверяем по классу анимации
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("рендерит hero: название, автор, жанр, год, рейтинг и теги", async () => {
    mockedUseBook.mockReturnValue({
      data: bookPageData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Великий Гэтсби" })).toBeTruthy();
    });
    expect(screen.getAllByText("Ф. Скотт Фицджеральд").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Роман").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1925 г.").length).toBeGreaterThan(0);
    expect(screen.getByText("#Классика")).toBeTruthy();
    expect(screen.getAllByText("8.4").length).toBeGreaterThan(0);
    // Кнопка «Хочу прочитать» вместо лайка
    expect(screen.getByText("Хочу прочитать")).toBeTruthy();
    expect(screen.queryByText("12 лайков")).toBeNull();
    // Описание (лонгрид) видно всем, включая гостя
    expect(screen.getByText("Роман, ставший символом века джаза.")).toBeTruthy();
    expect(screen.getByText("Читать полностью")).toBeTruthy();
    // Scroll-индикатор после hero
    expect(screen.getByText("Листай дальше")).toBeTruthy();
    // Гостю нижний контент теперь доступен (ContentLock временно отключен)
    expect(screen.getByText("Топ-100 классики")).toBeTruthy();
    expect(screen.getByText("Великие романы")).toBeTruthy();
    expect(screen.getByText("Стивен Кинг")).toBeTruthy();
    expect(screen.getByText("Обсуждение")).toBeTruthy();
  });

  it("крошки показывают тир-лист при ?from= (путь Тир-лист → Книга)", async () => {
    mockedUseBook.mockReturnValue({
      data: bookPageData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderPage(["/books/velikij-getssbi?from=tl-1"]);

    // Крошечная ссылка (первая) ведёт на тир-лист по id
    const links = await screen.findAllByRole("link", { name: "Топ-100 классики" });
    expect(links[0]).toHaveAttribute("href", "/tier-lists/tl-1");
    // Звено «Книги» (по жанру) при ?from= не показывается — путь идёт от тир-листа
    expect(screen.queryByRole("link", { name: "Роман" })).toBeNull();
  });

  it("крошки находят тир-лист и по slug в ?from=", async () => {
    mockedUseBook.mockReturnValue({
      data: bookPageData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderPage(["/books/velikij-getssbi?from=top-100"]);

    // Крошечная ссылка (первая) ведёт на тир-лист по id
    const links = await screen.findAllByRole("link", { name: "Топ-100 классики" });
    expect(links[0]).toHaveAttribute("href", "/tier-lists/tl-1");
  });

  it("«Хочу прочитать» добавляет книгу на полку (want_to_read)", async () => {
    toggleStatusMock.mockClear();
    mockedUseAuth.mockReturnValue({ user: { id: 1 } as never, isLoading: false } as never);
    mockedUseBook.mockReturnValue({
      data: bookPageData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderPage();

    const button = await screen.findByText("Хочу прочитать");
    await userEvent.click(button);

    expect(toggleStatusMock).toHaveBeenCalledWith("1", "want_to_read", expect.objectContaining({ title: "Великий Гэтсби" }));
    mockedUseAuth.mockReturnValue({ user: null, isLoading: false } as never);
  });

  it("гость тоже может добавить книгу на полку (локальная полка, без редиректа)", async () => {
    toggleStatusMock.mockClear();
    mockedUseAuth.mockReturnValue({ user: null, isLoading: false } as never);
    mockedUseBook.mockReturnValue({
      data: bookPageData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderPage();

    const button = await screen.findByText("Хочу прочитать");
    await userEvent.click(button);

    expect(toggleStatusMock).toHaveBeenCalledWith("1", "want_to_read", expect.objectContaining({ title: "Великий Гэтсби" }));
  });

  it("книга уже на полке → кнопка «Уже в плане»", async () => {
    mockedUseBookshelf.mockReturnValue({
      shelf: { "1": "want_to_read" },
      toggleStatus: toggleStatusMock,
    } as never);
    mockedUseBook.mockReturnValue({
      data: bookPageData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderPage();

    expect(await screen.findByText("Уже в плане")).toBeTruthy();
    mockedUseBookshelf.mockReturnValue({ shelf: {}, toggleStatus: toggleStatusMock } as never);
  });

  it("показывает ошибку с кнопкой повтора при сбое загрузки", () => {
    mockedUseBook.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as never);
    renderPage();
    expect(screen.getByText("Не удалось загрузить страницу книги")).toBeTruthy();
    expect(screen.getByText("Попробовать снова")).toBeTruthy();
  });

  it("показывает 404, если книга не найдена", () => {
    mockedUseBook.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderPage();
    expect(screen.getByText("Страница не найдена")).toBeTruthy();
  });

  it("не zero: разворачивает описание по кнопке «Читать полностью»", async () => {
    mockedUseAuth.mockReturnValue({ user: { id: 1 } as never, isLoading: false } as never);
    mockedUseBook.mockReturnValue({
      data: bookPageData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderPage();

    const toggleBtn = await screen.findByText("Читать полностью");
    await userEvent.click(toggleBtn);
    expect(screen.getByText("Свернуть")).toBeTruthy();
    // Авторизованному не показывается замок
    expect(screen.queryByText("Зарегистрируйтесь, чтобы посмотреть лонгрид и увидеть отзывы")).toBeNull();
  });

  it("гостю: весь контент страницы доступен (ContentLock временно отключен)", async () => {
    mockedUseAuth.mockReturnValue({ user: null, isLoading: false } as never);
    mockedUseBook.mockReturnValue({
      data: bookPageData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderPage();

    // Верх (описание) виден без ограничений
    await waitFor(() => {
      expect(screen.getByText("Роман, ставший символом века джаза.")).toBeTruthy();
    });
    expect(screen.getByText("Читать полностью")).toBeTruthy();
    // Нижний контент доступен: тир-листы, подборки, знаменитости, обсуждение
    expect(screen.getByText("Топ-100 классики")).toBeTruthy();
    expect(screen.getByText("Великие романы")).toBeTruthy();
    expect(screen.getByText("Стивен Кинг")).toBeTruthy();
    expect(screen.getByText("Обсуждение")).toBeTruthy();
    // Старого CTA (ContentLock) нет, но есть новый BookSignUpCta
    expect(screen.queryByText("Зарегистрируйтесь, чтобы посмотреть лонгрид и увидеть отзывы")).toBeNull();
    expect(screen.getByText("Присоединяйтесь к BookStrata")).toBeTruthy();
    expect(screen.getByText("Создать аккаунт")).toBeTruthy();
  });

  it("авторизованному виден весь нижний контент без CTA регистрации", async () => {
    mockedUseAuth.mockReturnValue({ user: { id: 1 } as never, isLoading: false } as never);
    mockedUseBook.mockReturnValue({
      data: bookPageData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderPage();

    expect(await screen.findByText("Топ-100 классики")).toBeTruthy();
    expect(screen.getByText("Великие романы")).toBeTruthy();
    expect(screen.getByText("Стивен Кинг")).toBeTruthy();
    expect(screen.getByText("Обсуждение")).toBeTruthy();
    // Замка нет: ни надписи, ни CTA
    expect(screen.queryByText("Зарегистрируйтесь, чтобы посмотреть лонгрид и увидеть отзывы")).toBeNull();
    expect(screen.queryByText("Создать аккаунт")).toBeNull();
  });

  it("создаёт новый тир-лист из выпадашки и добавляет в него книгу", async () => {
    const mutateMock = vi.fn();
    vi.mocked(createTierList).mockResolvedValue({
      id: "tl-new",
      title: "Любимое фэнтези",
      slug: "lyubimoe-fentezi",
      isPublic: false,
    } as never);

    // Подменяем моки: авторизованный пользователь + пустой список листов
    vi.mocked(useAuth).mockReturnValue({ user: { id: 1 } as never, isLoading: false } as never);
    vi.mocked(useBook).mockReturnValue({
      data: bookPageData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    const useBookModule = await import("@/hooks/useBook");
    vi.mocked(useBookModule.useMyTierLists).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(useBookModule.useAddBookToTierList).mockReturnValue({
      mutate: mutateMock,
    } as never);

    renderPage();

    await userEvent.click(await screen.findByText("В тир-лист"));
    await userEvent.click(await screen.findByText("Новый тир-лист"));
    await userEvent.type(await screen.findByPlaceholderText("Название тир-листа"), "Любимое фэнтези");
    await userEvent.click(await screen.findByText("Создать и добавить"));

    await waitFor(() => {
      expect(createTierList).toHaveBeenCalledWith("Любимое фэнтези");
      expect(mutateMock).toHaveBeenCalledWith("tl-new");
    });
    // Выпадашка закрылась после успеха
    await waitFor(() => {
      expect(screen.queryByText("Создать и добавить")).toBeNull();
    });
  });

  it("JSON-LD без aggregateRating (решение 14.08: риск спам-фильтра rich-результатов)", () => {
    const ld = buildBookJsonLd({
      title: "Великий Гэтсби",
      author: "Ф. Скотт Фицджеральд",
      coverImageUrl: "https://example.com/cover.jpg",
      description: "Роман, ставший символом века джаза.",
      genre: "Роман",
      publishedYear: 1925,
      isbn: null,
      url: "https://bookstrata.ru/books/velikij-getssbi",
    });

    expect(ld["@type"]).toBe("Book");
    expect(ld.name).toBe("Великий Гэтсби");
    expect(ld.datePublished).toBe("1925");
    expect(ld).not.toHaveProperty("aggregateRating");
  });

  it("title: «Название — Автор» без бренда, og:title с брендом", async () => {
    mockedUseBook.mockReturnValue({
      data: bookPageData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderPage();

    await waitFor(() => {
      expect(document.title).toBe("Великий Гэтсби — Ф. Скотт Фицджеральд");
    });
    expect(
      document.querySelector('meta[property="og:title"]')?.getAttribute("content"),
    ).toBe("Великий Гэтсби — Ф. Скотт Фицджеральд | BookStrata");
  });

  it("buildBookJsonLd добавляет isbn, inLanguage, url и mainEntityOfPage", () => {
    const ld = buildBookJsonLd({
      title: "Дюна",
      author: "Фрэнк Герберт",
      coverImageUrl: "https://example.com/cover.jpg",
      description: "Эпопея о пустынной планете.",
      genre: "Фантастика",
      publishedYear: 1965,
      isbn: "978-5-17-123456-7",
      url: "https://bookstrata.ru/books/dyuna",
    });

    expect(ld.isbn).toBe("978-5-17-123456-7");
    expect(ld.inLanguage).toBe("ru");
    expect(ld.url).toBe("https://bookstrata.ru/books/dyuna");
    expect(ld.mainEntityOfPage).toEqual({
      "@type": "WebPage",
      "@id": "https://bookstrata.ru/books/dyuna",
    });
  });

  it("buildBookJsonLd без isbn не добавляет поле isbn", () => {
    const ld = buildBookJsonLd({
      title: "Дюна",
      author: "Фрэнк Герберт",
      coverImageUrl: "https://example.com/cover.jpg",
      description: "Эпопея о пустынной планете.",
      genre: "Фантастика",
      publishedYear: 1965,
      isbn: null,
      url: "https://bookstrata.ru/books/dyuna",
    });

    expect(ld).not.toHaveProperty("isbn");
  });
});

describe("BookPage: мобильная адаптивность действий (360px)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseParams.mockReturnValue({ slug: "velikij-getssbi" });
    mockedUseAuth.mockReturnValue({ user: { id: 1 } as never, isLoading: false } as never);
    mockedUseBook.mockReturnValue({
      data: bookPageData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
  });

  it("кнопки действий помещаются в ряд на 360px: компактный gap и паддинги на мобильных", async () => {
    renderPage();

    const wantBtn = await screen.findByRole("button", { name: /Хочу прочитать/i });
    const container = wantBtn.parentElement!;

    // gap-2 (8px) на мобильных, gap-4 (16px) на sm+
    expect(container.className).toContain("gap-2");
    expect(container.className).toContain("sm:gap-4");

    // «Хочу прочитать»: px-3 (12px) на мобильных, px-4 на sm+
    expect(wantBtn.className).toContain("px-3");
    expect(wantBtn.className).toContain("sm:px-4");

    // «В тир-лист»: px-3 на мобильных, px-6 на sm+
    const tierBtn = screen.getByRole("button", { name: /В тир-лист/i });
    expect(tierBtn.className).toContain("px-3");
    expect(tierBtn.className).toContain("sm:px-6");
  });

  it("выпадашка тир-листов выравнивается по левому краю контейнера (не обрезается слева на 360px)", async () => {
    const user = userEvent.setup();
    renderPage();

    const tierBtn = await screen.findByRole("button", { name: /В тир-лист/i });
    // Панель позиционируется от контейнера действий, а не от кнопки
    const container = tierBtn.closest("div.relative");
    expect(container).not.toBeNull();
    expect(container!.className).toContain("relative");

    await user.click(tierBtn);
    const panel = await screen.findByText("Добавить в тир-лист").then((el) => el.closest("div.absolute"));

    // На мобильных панель растёт вправо от левого края контейнера,
    // на sm+ — от правого края (как раньше от кнопки)
    expect(panel!.className).toContain("left-0");
    expect(panel!.className).toContain("sm:left-auto");
    expect(panel!.className).toContain("sm:right-0");
    expect(panel!.className).not.toMatch(/(^|\s)right-0(\s|$)/);
  });
});

describe("buildDescriptionSnippet", () => {
  it("короткое описание возвращает как есть", () => {
    expect(
      buildDescriptionSnippet({ title: "Дюна", author: "Фрэнк Герберт", description: "Роман о пустынной планете." }),
    ).toBe("Роман о пустынной планете.");
  });

  it("длинное описание обрезает по границе слова с многоточием", () => {
    const long = `Роман, ставший символом века джаза. ${"Далее длинный текст сюжета. ".repeat(10)}конец`;
    const result = buildDescriptionSnippet({ title: "Гэтсби", author: null, description: long });
    expect(result.length).toBeLessThanOrEqual(158);
    expect(result.endsWith("…")).toBe(true);
    expect(result.endsWith("…конец")).toBe(false);
  });

  it("без описания — fallback-шаблон с названием и автором", () => {
    expect(buildDescriptionSnippet({ title: "Дюна", author: "Фрэнк Герберт", description: null })).toBe(
      "Книга Дюна Фрэнк Герберт: описание, жанр, рейтинг. Найди книги в тир-листах и подборках BookStrata.",
    );
  });
});
