// src/lib/adminBooksApi.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "./api-client";
import {
  replaceAdminBookCharacters,
  searchAdminCharacters,
  type AdminBookDetail,
  type AdminCharacterSearchItem,
  type BookCharacterInput,
} from "./adminBooksApi";
import type { BookCharacterView, BookPageData } from "./bookApi";

vi.mock("./api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api-client")>();
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const mockedGet = vi.mocked(apiClient.get);
const mockedPut = vi.mocked(apiClient.put);

describe("adminBooksApi — characters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("searchAdminCharacters — GET /admin/characters с query-параметром q", async () => {
    const items: AdminCharacterSearchItem[] = [
      {
        id: 1,
        slug: "geralt",
        name: "Геральт из Ривии",
        aliases: ["Белый Волк"],
        universeSlug: "witcher",
        traits: ["мутант"],
        bookCount: 3,
      },
    ];
    mockedGet.mockResolvedValue({ items });

    const res = await searchAdminCharacters("Геральт Волк");
    expect(res).toEqual({ items });
    expect(mockedGet).toHaveBeenCalledWith(
      "/admin/characters?q=%D0%93%D0%B5%D1%80%D0%B0%D0%BB%D1%8C%D1%82+%D0%92%D0%BE%D0%BB%D0%BA",
    );
  });

  it("replaceAdminBookCharacters — PUT /admin/books/:id/characters с телом { items }", async () => {
    const input: BookCharacterInput[] = [
      {
        characterId: 1,
        name: "Геральт",
        aliases: ["Белый Волк"],
        universeSlug: "witcher",
        role: "protagonist",
        summary: "Ведьмак",
        traits: ["охотник"],
        sortOrder: 0,
        relations: [{ targetName: "Йеннифэр", label: "возлюбленная" }],
      },
    ];
    const returned: BookCharacterView[] = [
      {
        id: 10,
        characterId: 1,
        slug: "geralt",
        name: "Геральт",
        aliases: ["Белый Волк"],
        universeSlug: "witcher",
        role: "protagonist",
        summary: "Ведьмак",
        traits: ["охотник"],
        relations: [{ targetCharacterId: 2, targetName: "Йеннифэр", label: "возлюбленная" }],
        otherBooks: [{ id: 2, slug: "mech-prednaznacheniya", title: "Меч Предназначения" }],
      },
    ];
    mockedPut.mockResolvedValue({ characters: returned });

    const res = await replaceAdminBookCharacters(42, input);
    expect(res).toEqual({ characters: returned });
    expect(mockedPut).toHaveBeenCalledWith("/admin/books/42/characters", { items: input });

    // Проверка совместимости типов BookPageData.characters и AdminBookDetail.characters
    const pageCheck: Pick<BookPageData, "characters"> = { characters: returned };
    const detailCheck: Pick<AdminBookDetail, "characters"> = { characters: returned };
    expect(pageCheck.characters).toHaveLength(1);
    expect(detailCheck.characters).toHaveLength(1);
  });
});
