import { describe, it, expect } from "vitest";
import {
  getShelfInitialData,
  getTemplateInitialData,
  resolveDemoInitialData,
} from "./_initialData";
import type { CreateTemplateData } from "@/types/templates";
import type { Book, TierListData } from "@/types";

const sampleTemplate: CreateTemplateData = {
  title: "Тестовый шаблон",
  tiers: [
    { id: "tier_s", name: "S", color: "#ef4444", order: 1 },
    { id: "tier_a", name: "A", color: "#f97316", order: 2 },
  ],
  defaultBooks: [
    {
      title: "Книга первая",
      author: "Автор 1",
      coverImageUrl: "/images/books/kniga-1.webp",
      defaultTierId: "tier_s",
    },
    {
      title: "Книга вторая",
      author: "Автор 2",
      coverImageUrl: "/images/books/kniga-2.webp",
      defaultTierId: "tier_a",
    },
  ],
};

describe("getShelfInitialData", () => {
  const shelfBooks: Book[] = [
    {
      id: "42",
      title: "Дюна",
      author: "Фрэнк Герберт",
      coverImageUrl: "/images/books/duna.webp",
      genre: "Sci-Fi",
      description: "Пустынная планета",
    },
    {
      id: "curated_7",
      title: "Солярис",
      author: "Станислав Лем",
      coverImageUrl: "",
      genre: "",
      description: "",
    },
  ];

  it("все книги полки попадают в «Книги без рейтинга», тиры пустые", () => {
    const data = getShelfInitialData("new", "Хочу прочитать", shelfBooks);

    expect(data.unrankedBookIds).toEqual(["42", "curated_7"]);
    for (const tierId of data.tierOrder) {
      expect(data.tiers[tierId].bookIds).toEqual([]);
    }
  });

  it("заголовок тир-листа — переданное название секции полки", () => {
    const data = getShelfInitialData("new", "Моя полка", shelfBooks);

    expect(data.title).toBe("Моя полка");
    expect(data.id).toBe("new");
    expect(data.isPublic).toBe(true);
  });

  it("сохраняет данные книг из полки (title, author, coverImageUrl)", () => {
    const data = getShelfInitialData("new", "Полка", shelfBooks);

    expect(data.books["42"]).toMatchObject({
      title: "Дюна",
      author: "Фрэнк Герберт",
      coverImageUrl: "/images/books/duna.webp",
    });
    expect(data.books["curated_7"]).toMatchObject({ title: "Солярис" });
  });

  it("использует стандартные тиры S–D как в пустом тир-листе", () => {
    const data = getShelfInitialData("new", "Полка", shelfBooks);

    expect(data.tierOrder).toEqual(["tier-s", "tier-a", "tier-b", "tier-c", "tier-d"]);
    expect(data.tiers["tier-s"]).toMatchObject({ title: "Шедевр", color: "#FF6B6B" });
  });

  it("пустая полка не ломает — получаем пустой список книг", () => {
    const data = getShelfInitialData("new", "Полка", []);

    expect(data.unrankedBookIds).toEqual([]);
    expect(data.books).toEqual({});
    expect(data.tierOrder).toHaveLength(5);
  });
});

describe("resolveDemoInitialData", () => {
  const shelfBook: Book = {
    id: "42",
    title: "Дюна",
    author: "Фрэнк Герберт",
    coverImageUrl: "/duna.webp",
  };
  const fallback: TierListData = getTemplateInitialData("new", sampleTemplate);
  const base = {
    tierListId: "new",
    isAuthenticated: false,
    demoDraft: null as TierListData | null,
    shelfBooks: [] as Book[],
    fallback,
  };

  it("демо-черновик имеет приоритет над полкой", () => {
    const draft = { ...fallback, title: "Мой черновик" };
    const data = resolveDemoInitialData({
      ...base,
      fromShelf: true,
      shelfTitle: "Хочу прочитать",
      shelfBooks: [shelfBook],
      demoDraft: draft,
    });

    expect(data).toBe(draft);
  });

  it("полка используется, когда черновика нет (from=shelf)", () => {
    const data = resolveDemoInitialData({
      ...base,
      fromShelf: true,
      shelfTitle: "Хочу прочитать",
      shelfBooks: [shelfBook],
    });

    expect(data.title).toBe("Хочу прочитать");
    expect(data.unrankedBookIds).toEqual(["42"]);
  });

  it("полка без from=shelf не используется — дефолтные демо-книги", () => {
    const data = resolveDemoInitialData({
      ...base,
      shelfBooks: [shelfBook],
    });

    expect(data.unrankedBookIds.length).toBeGreaterThan(0);
    expect(data.unrankedBookIds).not.toContain("42");
    expect(data.title).toBe("Новый тир-лист");
  });

  it("пустая полка → дефолтные демо-книги, а не пустой редактор", () => {
    const data = resolveDemoInitialData({
      ...base,
      fromShelf: true,
      shelfTitle: "Хочу прочитать",
      shelfBooks: [],
    });

    expect(data.unrankedBookIds.length).toBeGreaterThan(0);
    expect(data.title).toBe("Новый тир-лист");
  });

  it("авторизованный → fallback (логика useTierEditorQueries)", () => {
    const data = resolveDemoInitialData({
      ...base,
      isAuthenticated: true,
      fromShelf: true,
      shelfBooks: [shelfBook],
    });

    expect(data).toBe(fallback);
  });

  it("?template= имеет приоритет — fallback обрабатывает шаблон", () => {
    const data = resolveDemoInitialData({
      ...base,
      templateId: "12",
      fromShelf: true,
      shelfBooks: [shelfBook],
    });

    expect(data).toBe(fallback);
  });

  it("не «new» (существующий лист) → fallback", () => {
    const data = resolveDemoInitialData({
      ...base,
      tierListId: "55",
      fromShelf: true,
      shelfBooks: [shelfBook],
    });

    expect(data).toBe(fallback);
  });
});

describe("getTemplateInitialData", () => {
  it("создаёт тиры с префиксом tpl- и сохраняет порядок", () => {
    const data = getTemplateInitialData("new", sampleTemplate);

    expect(data.tierOrder).toEqual(["tpl-tier_s", "tpl-tier_a"]);
    expect(data.tiers["tpl-tier_s"]).toMatchObject({
      id: "tpl-tier_s",
      title: "S",
      color: "#ef4444",
      bookIds: [],
    });
    expect(data.tierIdToTempIdMap).toEqual({
      tier_s: "tpl-tier_s",
      tier_a: "tpl-tier_a",
    });
  });

  it("все книги попадают в «Книги без рейтинга» (пользователь распределяет сам)", () => {
    const data = getTemplateInitialData("new", sampleTemplate);

    expect(data.unrankedBookIds).toHaveLength(2);
    expect(data.tiers["tpl-tier_s"].bookIds).toHaveLength(0);
    expect(data.tiers["tpl-tier_a"].bookIds).toHaveLength(0);
  });

  it("заполняет данные книги (title, author, coverImageUrl)", () => {
    const data = getTemplateInitialData("new", sampleTemplate);

    const book = data.books[data.unrankedBookIds[0]];
    expect(book).toMatchObject({
      title: "Книга первая",
      author: "Автор 1",
      coverImageUrl: "/images/books/kniga-1.webp",
    });
  });
});
