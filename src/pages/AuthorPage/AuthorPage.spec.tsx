// src/pages/AuthorPage/AuthorPage.spec.tsx
// Страница автора /authors/:slug: hero + SEO-текст + партнёрка + 404
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import AuthorPage from "./index";
import type { AuthorPageData } from "@/lib/authorsApi";
import "./AuthorPage.css";

vi.mock("@/lib/authorsApi", () => ({
  getAuthorBySlug: vi.fn(),
  getPopularAuthors: vi.fn(),
}));
// Header/Footer требуют AuthProvider — в тесте не нужны
vi.mock("@/ui/Header", () => ({ Header: () => null }));
vi.mock("@/ui/Footer", () => ({ Footer: () => null }));

import { getAuthorBySlug, getPopularAuthors } from "@/lib/authorsApi";

const fixture: AuthorPageData = {
  author: {
    id: 1,
    name: "Лев Толстой",
    slug: "lev-tolstoy",
    seoDescription: "Русский писатель, классик мировой литературы.",
    bookCount: 12,
    avgRating: 8.7,
    heroImageUrl: "/hero.jpg",
    badge: "Лауреат Букеровской премии",
    motto: "«Литература как архитектура памяти»",
    manifestoQuote: "Каждое предложение — возведение пространства.",
    manifestoAuthor: "Критик Иванов",
    manifestoRole: "Обозреватель",
    aboutText: "Текст о творчестве автора.",
  },
  books: [
    {
      id: 1,
      title: "Война и мир",
      slug: "voyna-i-mir",
      coverImageUrl: "/covers/wim.jpg",
      publishedYear: 1869,
      genre: "Роман",
      rating: 9.5,
      ratingsCount: 42,
      isbn: null,
      description: null,
    },
  ],
  topBooks: [],
  bottomBooks: [],
  tierLists: [],
  stats: [],
  showcase: [],
  adaptations: [],
  pressQuotes: [],
};

function renderPage(initialEntries: string[] = ["/authors/lev-tolstoy"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <HelmetProvider>
          {/* useParams работает только внутри Route */}
          <Routes>
            <Route path="/authors/:slug" element={<AuthorPage />} />
          </Routes>
        </HelmetProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AuthorPage", () => {
  beforeEach(() => {
    vi.mocked(getAuthorBySlug).mockReset();
  });

  it("показывает имя, SEO-текст, количество книг и кнопку партнёрки", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(fixture);

    renderPage();

    expect(await screen.findByRole("heading", { name: "Лев Толстой" })).toBeInTheDocument();
    expect(screen.getByText(/Русский писатель, классик мировой литературы/)).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("книг")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /читать|купить/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("chitai-gorod.ru"));
    expect(link).toHaveAttribute("rel", expect.stringContaining("sponsored"));
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("вызывает API с slug из маршрута", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(fixture);

    renderPage(["/authors/lev-tolstoy"]);

    expect(await screen.findByRole("heading", { name: "Лев Толстой" })).toBeInTheDocument();
    expect(getAuthorBySlug).toHaveBeenCalledWith("lev-tolstoy");
  });

  it("хук популярных авторов вызывается сразу, даже пока страница автора грузится", () => {
    // автор вечно грузится — страница стоит на спиннере
    vi.mocked(getAuthorBySlug).mockReturnValue(new Promise(() => {}));
    vi.mocked(getPopularAuthors).mockResolvedValue([]);

    renderPage();

    // порядок хуков не зависит от стадии загрузки (иначе — «Rendered more hooks»)
    expect(getPopularAuthors).toHaveBeenCalled();
  });

  it("блок «Другие авторы» ведёт на страницы других авторов, текущего исключает", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(fixture);
    vi.mocked(getPopularAuthors).mockResolvedValue([
      { id: 2, name: "Фёдор Достоевский", slug: "fedor-dostoevsky", bookCount: 5 },
      { id: 1, name: "Лев Толстой", slug: "lev-tolstoy", bookCount: 12 },
    ]);

    renderPage();

    expect(await screen.findByRole("heading", { name: "Лев Толстой" })).toBeInTheDocument();

    const other = await screen.findByRole("link", { name: /Фёдор Достоевский/ });
    expect(other).toHaveAttribute("href", "/authors/fedor-dostoevsky");
    // текущий автор в блоке не показывается
    expect(
      screen.queryByRole("link", { name: "Лев Толстой" }),
    ).not.toBeInTheDocument();
  });

  it("хлебные крошки: Главная → Все авторы → автор (видимые + JSON-LD)", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(fixture);

    renderPage();

    expect(await screen.findByRole("heading", { name: "Лев Толстой" })).toBeInTheDocument();

    // видимые крошки: промежуточный уровень ведёт на список авторов
    expect(screen.getByRole("link", { name: "Все авторы" })).toHaveAttribute("href", "/authors");
    expect(screen.getByRole("link", { name: "Главная" })).toHaveAttribute("href", "/");

    // крошки лежат поверх хиро (absolute) и не сдвигают контент страницы
    const nav = screen.getByRole("navigation", { name: "Хлебные крошки" });
    expect(nav.parentElement).toHaveClass("absolute");
    // z-20 > z-10 у hero-обёртки — иначе клики перехватывает она (крошки не кликабельны)
    expect(nav.parentElement).toHaveClass("z-20");
    // отступ под хедером, чтобы крошки не прилипали к нему
    expect(nav.parentElement).toHaveClass("pt-28");
    // хиро не залезает под fixed-хедер: у обёртки остаётся полоса pt-20
    expect(nav.closest(".author-page")).toHaveClass("pt-20");

    // JSON-LD BreadcrumbList из SEOHead
    const scripts = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]'),
    );
    const breadcrumb = scripts
      .map((s) => {
        try {
          return JSON.parse(s.textContent || "");
        } catch {
          return null;
        }
      })
      .find((ld) => ld && ld["@type"] === "BreadcrumbList");
    expect(breadcrumb).toBeDefined();
    expect(breadcrumb.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Главная", item: "https://bookstrata.ru/" },
      { "@type": "ListItem", position: 2, name: "Все авторы", item: "https://bookstrata.ru/authors" },
      { "@type": "ListItem", position: 3, name: "Лев Толстой", item: "https://bookstrata.ru/authors/lev-tolstoy" },
    ]);
  });

  it("автор без книг — кнопка партнёрки всё равно есть", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({ ...fixture, books: [] });

    renderPage();

    expect(await screen.findByRole("heading", { name: "Лев Толстой" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /читать|купить/i })).toBeInTheDocument();
  });

  it("404 от API → NotFoundPage", async () => {
    const err = Object.assign(new Error("not found"), { status: 404 });
    vi.mocked(getAuthorBySlug).mockRejectedValue(err);

    renderPage(["/authors/net-takogo"]);

    expect(await screen.findByRole("heading", { name: "Страница не найдена" })).toBeInTheDocument();
  });

  it("ошибка сети → NotFoundPage (не рендерим пустоту)", async () => {
    vi.mocked(getAuthorBySlug).mockRejectedValue(new Error("network"));

    renderPage();

    expect(await screen.findByRole("heading", { name: "Страница не найдена" })).toBeInTheDocument();
  });
});

describe("Библиография", () => {
  // Хронологический порядок (как отдаёт API), два жанра + null-жанр, isbn частично пустой
  const biblioFixture: AuthorPageData = {
    ...fixture,
    books: [
      {
        id: 3, title: "Средняя", slug: "srednyaya", coverImageUrl: "/3.jpg",
        publishedYear: 1999, genre: "Поэма", rating: 7.5, ratingsCount: 8,
        isbn: null, description: null,
      },
      {
        id: 2, title: "Сильная", slug: "silnaya", coverImageUrl: "/2.jpg",
        publishedYear: 2000, genre: "Роман", rating: 9.0, ratingsCount: 1234,
        isbn: "978-5-17-154982-1", description: null,
      },
      {
        id: 1, title: "Слабая", slug: "slabaya", coverImageUrl: "/1.jpg",
        publishedYear: 2001, genre: "Роман", rating: 6.0, ratingsCount: 12,
        isbn: null, description: null,
      },
    ],
  };

  beforeEach(() => {
    vi.mocked(getAuthorBySlug).mockReset();
  });

  /** Карточки книг в порядке отображения */
  const cards = () =>
    Array.from(document.querySelectorAll<HTMLElement>(".ap-biblio-card"));
  const cardTitles = () =>
    cards().map((c) => c.querySelector("h3")?.textContent ?? "");
  const cardWith = (title: string) =>
    cards().find((c) => (c.textContent ?? "").includes(title));

  it("карточки: по одной на книгу, таблицы в DOM нет", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(biblioFixture);

    renderPage();
    await screen.findByRole("heading", { name: "Полная библиография" });

    expect(cards()).toHaveLength(3);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    // структура карточки: год, чип категории, рейтинг, действие (без ISBN)
    expect(screen.getByText("1999")).toBeInTheDocument();
    expect(screen.getByText("Поэма")).toBeInTheDocument();
    expect(screen.queryByText(/978-5-17-154982-1/)).not.toBeInTheDocument();
    expect(screen.getByText("7.5 / 10")).toBeInTheDocument();
  });

  it("по умолчанию — хронология по году издания (порядок из API)", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(biblioFixture);

    renderPage();
    await screen.findByRole("heading", { name: "Полная библиография" });

    expect(cardTitles()).toEqual(["Средняя", "Сильная", "Слабая"]);
  });

  it("клик «По рейтингу» — сортировка по убыванию рейтинга", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(biblioFixture);

    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "По рейтингу" }));

    expect(cardTitles()).toEqual(["Сильная", "Средняя", "Слабая"]);
  });

  it("возврат к «По порядку» — снова хронология", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(biblioFixture);

    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "По рейтингу" }));
    await user.click(screen.getByRole("button", { name: "По порядку" }));

    expect(cardTitles()).toEqual(["Средняя", "Сильная", "Слабая"]);
  });

  it("фильтр-чипсет с счётчиками: «Все» + жанры, клик фильтрует карточки", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(biblioFixture);

    renderPage();
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Полная библиография" });

    expect(screen.getByRole("button", { name: "Все (3)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Поэма (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Роман (2)" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Роман (2)" }));
    expect(cardTitles()).toEqual(["Сильная", "Слабая"]);
    expect(cardWith("Средняя")).toBeUndefined();

    await user.click(screen.getByRole("button", { name: "Все (3)" }));
    expect(cardTitles()).toEqual(["Средняя", "Сильная", "Слабая"]);
  });

  it("книга со slug — ссылка в заголовке и «Открыть книгу»; без slug — текст", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({
      ...biblioFixture,
      books: [
        { ...biblioFixture.books[0], slug: null },
        biblioFixture.books[1],
      ],
    });

    renderPage();
    await screen.findByRole("heading", { name: "Полная библиография" });

    expect(screen.getByRole("link", { name: "Сильная" })).toHaveAttribute(
      "href",
      "/books/silnaya",
    );
    expect(screen.queryByRole("link", { name: "Средняя" })).not.toBeInTheDocument();
    expect(cardWith("Средняя")?.textContent).toContain("Открыть книгу");
  });

  it("счётчик оценок и строка ISBN не рендерятся в карточках", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(biblioFixture);

    renderPage();
    await screen.findByRole("heading", { name: "Полная библиография" });

    // Количество оценок (ratingsCount) в карточках не показываем
    expect(screen.queryByText(/1\s*234/)).not.toBeInTheDocument();
    // Строку ISBN тоже убираем полностью
    expect(screen.queryByText(/ISBN/)).not.toBeInTheDocument();
    expect(cardWith("Сильная")?.textContent).not.toContain("978-5-17-154982-1");
  });

  it("секция «Полная библиография» есть, счётчик книг — в hero", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(biblioFixture);

    renderPage();

    expect(await screen.findByRole("heading", { name: "Полная библиография" })).toBeInTheDocument();
    // Счётчик в hero, а не только в чипсете жанров библиографии
    const hero = screen.getByRole("heading", { name: "Лев Толстой" }).closest("section");
    expect(within(hero!).getByText("12")).toBeInTheDocument();
    expect(within(hero!).getByText("книг")).toBeInTheDocument();
  });

  it("books пуст — секция скрыта (карточек нет)", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({ ...fixture, books: [] });

    renderPage();
    await screen.findByRole("heading", { name: "Лев Толстой" });

    expect(cards()).toHaveLength(0);
    expect(screen.queryByRole("heading", { name: "Полная библиография" })).not.toBeInTheDocument();
  });
});

describe("AuthorPage — лучшие/слабые книги и тир-листы", () => {
  const ratedFixture: AuthorPageData = {
    ...fixture,
    topBooks: [
      { id: 9, title: "Мастер", slug: "master", coverImageUrl: "/m.jpg",
        publishedYear: null, genre: null, rating: 9.8, ratingsCount: 100,
        isbn: null, description: null },
    ],
    bottomBooks: [
      { id: 10, title: "Слабая книга", slug: null, coverImageUrl: "/w.jpg",
        publishedYear: null, genre: null, rating: 5.2, ratingsCount: 30,
        isbn: null, description: null },
    ],
    tierLists: [
      { id: "tl1", slug: "top-100", title: "Топ-100 книг" },
      { id: "tl2", slug: "klassika", title: "Классика" },
    ],
  };

  beforeEach(() => {
    vi.mocked(getAuthorBySlug).mockReset();
  });

  it("блоки «Лучшие книги» и «Слабые книги» с рейтингами", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(ratedFixture);

    renderPage();

    expect(await screen.findByRole("heading", { name: "Лучшие книги" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Мастер" })).toBeInTheDocument();
    expect(screen.getByText("9.8 / 10")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Слабые книги" })).toBeInTheDocument();
    expect(screen.getByText("5.2 / 10")).toBeInTheDocument();
  });

  it("тир-листы: счётчик и ссылки на /tier-lists/{slug}", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(ratedFixture);

    renderPage();

    const heading = await screen.findByRole("heading", { name: /В тир-листах/ });
    expect(heading).toBeInTheDocument();

    const tlLink = screen.getByRole("link", { name: /Топ-100 книг/ });
    expect(tlLink).toHaveAttribute("href", "/tier-lists/top-100");
    expect(screen.getByRole("link", { name: /Классика/ })).toHaveAttribute(
      "href",
      "/tier-lists/klassika",
    );
  });

  it("заполнена только одна колонка — рендерится только она", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({
      ...fixture,
      topBooks: ratedFixture.topBooks,
      bottomBooks: [],
      tierLists: [],
    });

    renderPage();

    expect(await screen.findByRole("heading", { name: "Лучшие книги" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Слабые книги" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Мастер" })).toBeInTheDocument();
  });

  it("пустые массивы — блоки не рендерятся", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({
      ...fixture,
      topBooks: [],
      bottomBooks: [],
      tierLists: [],
    });

    renderPage();

    expect(await screen.findByRole("heading", { name: "Полная библиография" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Лучшие книги" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Слабые книги" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /В тир-листах/ })).not.toBeInTheDocument();
  });

  it("порядок секций по спеке: лучшие/слабые → библиография → тир-листы", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(ratedFixture);

    renderPage();

    const top = await screen.findByRole("heading", { name: "Лучшие книги" });
    const bottom = screen.getByRole("heading", { name: "Слабые книги" });
    const biblio = screen.getByRole("heading", { name: "Полная библиография" });
    const tiers = screen.getByRole("heading", { name: /В тир-листах/ });

    const isBefore = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(isBefore(top, bottom)).toBe(true);
    expect(isBefore(bottom, biblio)).toBe(true);
    expect(isBefore(biblio, tiers)).toBe(true);
  });
});

describe("Секции ручного контента", () => {
  beforeEach(() => {
    vi.mocked(getAuthorBySlug).mockReset();
  });

  it("hero: показывает badge, motto и hero-картинку", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(fixture);

    renderPage();
    await screen.findByRole("heading", { name: "Лев Толстой" });

    expect(screen.getByText("Лауреат Букеровской премии")).toBeInTheDocument();
    expect(screen.getByText("«Литература как архитектура памяти»")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /обложка|портрет/i }).getAttribute("src"),
    ).toContain("/hero.jpg");
  });

  it("manifesto: рендерит цитату и автора", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(fixture);

    renderPage();
    await screen.findByRole("heading", { name: "Лев Толстой" });

    expect(screen.getByText(/Каждое предложение — возведение пространства\./)).toBeInTheDocument();
    expect(screen.getByText(/Критик Иванов/)).toBeInTheDocument();
  });

  it("manifesto: атрибуция — иконка пера слева, имя сверху, роль снизу", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(fixture);

    renderPage();
    await screen.findByRole("heading", { name: "Лев Толстой" });

    const name = screen.getByText("Критик Иванов");
    const footer = name.closest("footer");
    expect(footer).not.toBeNull();
    // Иконка пера (lucide Feather) внутри атрибуции
    expect(footer!.querySelector("svg.lucide-feather")).not.toBeNull();
    // Роль — та же колонка, что и имя (под ним), а не рядом
    expect(within(footer!).getByText("Обозреватель")).toBeInTheDocument();
    // Иконка идёт в DOM раньше имени (слева)
    expect(
      footer!.compareDocumentPosition(name.closest("span") ?? name) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("showcase: пуст — секция отсутствует в DOM", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(fixture);

    renderPage();
    await screen.findByRole("heading", { name: "Лев Толстой" });

    expect(screen.queryByText(/Избранные романы/i)).not.toBeInTheDocument();
  });

  it("showcase: шапка как на референсе — eyebrow + подзаголовок справа, панели-карточки", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({
      ...fixture,
      showcase: [
        {
          pullQuote: "Монументальное полотно",
          book: { ...fixture.books[0], id: 2, slug: "anna-karenina" },
        },
        {
          pullQuote: null,
          book: { ...fixture.books[0], id: 3, slug: null },
        },
      ],
    });

    renderPage();
    await screen.findByRole("heading", { name: "Лев Толстой" });

    expect(screen.getByText("Архив шедевров")).toBeInTheDocument();
    expect(
      screen.getByText(/Монументальные полотна, ставшие международными/),
    ).toBeInTheDocument();
    const cards = document.querySelectorAll(".ap-showcase-card");
    expect(cards).toHaveLength(2);
    // Чередование сторон: вторая карточка — обложка справа
    expect(cards[0]).not.toHaveClass("ap-showcase-card--flip");
    expect(cards[1]).toHaveClass("ap-showcase-card--flip");
    // Чередование акцентов по палитре (gold → rose → cobalt)
    expect(cards[0]).toHaveAttribute("data-accent", "gold");
    expect(cards[1]).toHaveAttribute("data-accent", "rose");
  });

  it("showcase: есть данные — карточки с pull-quote и ссылки на книги", async () => {
    // Книга только в showcase (не в каталоге) — чтобы ссылка не путалась с карточкой каталога
    const showcaseBook = {
      ...fixture.books[0],
      id: 2,
      title: "Анна Каренина",
      slug: "anna-karenina",
    };
    vi.mocked(getAuthorBySlug).mockResolvedValue({
      ...fixture,
      showcase: [
        {
          pullQuote: "Монументальное полотно",
          book: showcaseBook,
        },
      ],
    });

    renderPage();
    await screen.findByRole("heading", { name: "Лев Толстой" });

    expect(screen.getByText("Монументальное полотно")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Анна Каренина/ });
    expect(link).toHaveAttribute("href", "/books/anna-karenina");
  });

  it("showcase: чипы жанр/год/рейтинг различаются цветами (rose/cobalt/gold)", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({
      ...fixture,
      showcase: [
        {
          pullQuote: null,
          book: { ...fixture.books[0], id: 2, slug: "anna-karenina" },
        },
      ],
    });

    renderPage();
    await screen.findByRole("heading", { name: "Лев Толстой" });

    const card = document.querySelector(".ap-showcase-card");
    expect(card).not.toBeNull();
    const cardEl = card as HTMLElement;

    const genre = within(cardEl).getByText("Роман");
    const year = within(cardEl).getByText("Год 1869");
    const rating = within(cardEl).getByText("9.5 / 10");

    expect(genre.className).toContain("text-[var(--ap-rose)]");
    expect(year.className).toContain("text-[var(--ap-cobalt)]");
    expect(rating.className).toContain("text-[var(--ap-gold)]");
  });

  it("showcase: slug = null — карточка рендерится, но не ссылка", async () => {
    const showcaseBook = {
      ...fixture.books[0],
      id: 3,
      title: "Братья Карамазовы",
      slug: null,
    };
    vi.mocked(getAuthorBySlug).mockResolvedValue({
      ...fixture,
      showcase: [{ pullQuote: null, book: showcaseBook }],
    });

    renderPage();
    await screen.findByRole("heading", { name: "Лев Толстой" });

    expect(
      screen.getByRole("heading", { name: "Братья Карамазовы" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Братья Карамазовы/ }),
    ).not.toBeInTheDocument();
  });

  it("manifesto: manifestoQuote = null — секция скрыта", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({
      ...fixture,
      author: { ...fixture.author, manifestoQuote: null },
    });

    renderPage();
    await screen.findByRole("heading", { name: "Лев Толстой" });

    expect(screen.queryByText(/Каждое предложение/)).not.toBeInTheDocument();
  });

  it("hero: heroImageUrl = null — без портрета, текстовый блок виден", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({
      ...fixture,
      author: { ...fixture.author, heroImageUrl: null },
    });

    renderPage();
    await screen.findByRole("heading", { name: "Лев Толстой" });

    expect(screen.queryByRole("img", { name: /портрет/i })).not.toBeInTheDocument();
    expect(screen.getByText("Лауреат Букеровской премии")).toBeInTheDocument();
  });

  it("hero: портрет — фон hero-секции (absolute), карточки-фигуры справа больше нет", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(fixture);

    renderPage();
    await screen.findByRole("heading", { name: "Лев Толстой" });

    const img = screen.getByRole("img", { name: /портрет/i });
    expect(img.getAttribute("src")).toContain("/hero.jpg");
    expect(img.className).toContain("absolute");
    expect(img.className).toContain("object-cover");
    // старый layout: карточка-фигура с золотым glow в правой колонке
    expect(document.querySelector(".ap-hero-portrait")).toBeNull();
  });

  it("hero: без портрета — glow-подложка hero-секции на месте (фолбэк)", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({
      ...fixture,
      author: { ...fixture.author, heroImageUrl: null },
    });

    renderPage();
    await screen.findByRole("heading", { name: "Лев Толстой" });

    expect(document.querySelector(".ap-hero-glow")).not.toBeNull();
  });

  it("hero: кнопка «Смотреть библиографию» скроллит к секции #bibliography", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(fixture);
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;

    renderPage();
    await screen.findByRole("heading", { name: "Лев Толстой" });

    expect(document.getElementById("bibliography")).not.toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: /Смотреть библиографию/ }),
    );
    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it("hero: ручные stats рендерятся в мета-полосе (value + label), авто-строки рядом", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({
      ...fixture,
      stats: [{ value: "14 млн", label: "напечатанных книг" }],
    });

    renderPage();
    await screen.findByRole("heading", { name: "Лев Толстой" });

    expect(screen.getByText("14 млн")).toBeInTheDocument();
    expect(screen.getByText("напечатанных книг")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("книг")).toBeInTheDocument();
    expect(screen.getByText("8.7 / 10")).toBeInTheDocument();
    expect(screen.getByText("Средний рейтинг")).toBeInTheDocument();
  });

  it("hero: stats пуст — ручных строк нет, авто-строки остаются", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({ ...fixture, stats: [] });

    renderPage();
    await screen.findByRole("heading", { name: "Лев Толстой" });

    expect(screen.queryByText("14 млн")).not.toBeInTheDocument();
    expect(screen.queryByText("напечатанных книг")).not.toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("книг")).toBeInTheDocument();
    expect(screen.getByText("8.7 / 10")).toBeInTheDocument();
    expect(screen.getByText("Средний рейтинг")).toBeInTheDocument();
  });

  it("manifesto: aboutText — карточка «О траектории автора» в манифест-секции, не в hero", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue(fixture);

    renderPage();
    await screen.findByRole("heading", { name: "Лев Толстой" });

    const manifesto = screen.getByText("Манифест письма").closest("section");
    expect(manifesto).toHaveTextContent("О траектории автора");
    expect(manifesto).toHaveTextContent("Текст о творчестве автора.");

    const hero = screen
      .getByRole("heading", { name: "Лев Толстой" })
      .closest("section");
    expect(hero).not.toHaveTextContent("Текст о творчестве автора.");
    expect(screen.getAllByText("Текст о творчестве автора.")).toHaveLength(1);
  });

  it("showcase: описание книги видно в карточке", async () => {
    const showcaseBook = {
      ...fixture.books[0],
      id: 5,
      title: "Анна Каренина",
      slug: "anna-karenina",
      description: "Роман о любви и долге.",
    };
    vi.mocked(getAuthorBySlug).mockResolvedValue({
      ...fixture,
      showcase: [{ pullQuote: null, book: showcaseBook }],
    });

    renderPage();
    await screen.findByRole("heading", { name: "Лев Толстой" });

    expect(screen.getByText("Роман о любви и долге.")).toBeInTheDocument();
  });
});

describe("Экранизации и пресса", () => {
  const filmAdaptation = {
    kind: "film" as const,
    title: "Тени монолита",
    meta: "2024",
    description: "Экранизация одноимённого романа",
    url: "https://www.imdb.com/title/tt1/",
  };

  beforeEach(() => {
    vi.mocked(getAuthorBySlug).mockReset();
  });

  it("адаптации: пусто — секция скрыта, CTA при этом виден", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({ ...fixture, adaptations: [] });

    renderPage();
    await screen.findByRole("heading", { name: "Лев Толстой" });

    expect(screen.queryByRole("heading", { name: "Кино & Театр" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /смотреть авторов/i })).toBeInTheDocument();
  });

  it("адаптации: карточка с kind-бейджем, названием, meta и ссылкой url", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({
      ...fixture,
      adaptations: [filmAdaptation],
    });

    renderPage();
    await screen.findByRole("heading", { name: "Кино & Театр" });

    expect(screen.getByText("Фильм")).toBeInTheDocument();
    expect(screen.getByText("Тени монолита")).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument();
    expect(screen.getByText("Экранизация одноимённого романа")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /тени монолита/i });
    expect(link).toHaveAttribute("href", "https://www.imdb.com/title/tt1/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("адаптации: внутренний url /books/... — router-ссылка без _blank, подпись «К книге»", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({
      ...fixture,
      adaptations: [
        {
          kind: "film",
          title: "Экранизация 1975 года",
          meta: "Война и мир",
          description: "Факт из лонгрида книги",
          url: "/books/voyna-i-mir",
        },
      ],
    });

    renderPage();
    await screen.findByRole("heading", { name: "Кино & Театр" });

    const link = screen.getByRole("link", { name: /экранизация 1975 года/i });
    expect(link).toHaveAttribute("href", "/books/voyna-i-mir");
    expect(link).not.toHaveAttribute("target", "_blank");
    expect(link).toHaveTextContent(/к книге/i);
    expect(link).not.toHaveTextContent(/смотреть/i);
  });

  it("адаптации: url = null — карточка без ссылки; kind theatre/tv — бейджи «Театр» и «Сериал»", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({
      ...fixture,
      adaptations: [
        { kind: "theatre", title: "Сценическая версия", meta: null, description: null, url: null },
        { kind: "tv", title: "Монолит: сериал", meta: "2023", description: null, url: null },
      ],
    });

    renderPage();
    await screen.findByRole("heading", { name: "Кино & Театр" });

    expect(screen.getByText("Театр")).toBeInTheDocument();
    expect(screen.getByText("Сериал")).toBeInTheDocument();
    expect(screen.getByText("Сценическая версия")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /сценическая версия/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /монолит: сериал/i })).not.toBeInTheDocument();
  });

  it("пресса: пусто — секция скрыта", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({ ...fixture, pressQuotes: [] });

    renderPage();
    await screen.findByRole("heading", { name: "Лев Толстой" });

    expect(screen.queryByRole("heading", { name: "Голоса мировой прессы" })).not.toBeInTheDocument();
  });

  it("пресса: цитата с источником и ролью, текст — display-курсив", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({
      ...fixture,
      pressQuotes: [
        {
          quote: "Вэнс возвращает литературе монументальность.",
          source: "The New Yorker",
          // не «Обозреватель» — такой role есть у manifesto в fixture
          sourceRole: "Редактор отдела культуры",
        },
      ],
    });

    renderPage();
    await screen.findByRole("heading", { name: "Голоса мировой прессы" });

    const quote = screen.getByText("Вэнс возвращает литературе монументальность.");
    expect(quote.className).toMatch(/\bitalic\b/);
    expect(quote.className).toMatch(/ap-display|family-name/);
    expect(screen.getByText("The New Yorker")).toBeInTheDocument();
    expect(screen.getByText("Редактор отдела культуры")).toBeInTheDocument();
  });

  it("CTA: показывается всегда, ссылки на список авторов и поиск", async () => {
    // fixture: adaptations и pressQuotes пусты — CTA всё равно рендерится
    vi.mocked(getAuthorBySlug).mockResolvedValue(fixture);

    renderPage();
    await screen.findByRole("heading", { name: "Лев Толстой" });

    expect(screen.getByRole("link", { name: /смотреть авторов/i })).toHaveAttribute("href", "/authors");
    expect(screen.getByRole("link", { name: /найти свою книгу/i })).toHaveAttribute("href", "/rankings");
  });

  it("порядок секций: экранизации → пресса → CTA", async () => {
    vi.mocked(getAuthorBySlug).mockResolvedValue({
      ...fixture,
      adaptations: [filmAdaptation],
      pressQuotes: [
        { quote: "Текст рецензии.", source: "РБК", sourceRole: null },
      ],
    });

    renderPage();
    const adaptations = await screen.findByRole("heading", { name: "Кино & Театр" });
    const press = screen.getByRole("heading", { name: "Голоса мировой прессы" });
    const cta = screen.getByRole("link", { name: /смотреть авторов/i });

    const isBefore = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(isBefore(adaptations, press)).toBe(true);
    expect(isBefore(press, cta)).toBe(true);
  });
});
