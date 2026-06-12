import { describe, it, expect } from "vitest";
import { stableStringify } from "./stableStringify";

describe("stableStringify", () => {
  it("должен давать одинаковый результат для объектов с разным порядком ключей", () => {
    const a = { z: 1, a: 2, m: 3 };
    const b = { a: 2, z: 1, m: 3 };

    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it("должен давать разный результат для разных значений", () => {
    const a = { title: "S", color: "#ff0000" };
    const b = { title: "A", color: "#00ff00" };

    expect(stableStringify(a)).not.toBe(stableStringify(b));
  });

  it("должен рекурсивно сортировать вложенные объекты", () => {
    const a = { tiers: { added: [{ title: "S", color: "#ff0000" }] } };
    const b = { tiers: { added: [{ color: "#ff0000", title: "S" }] } };

    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it("должен обрабатывать массивы с объектами", () => {
    const a = [{ title: "S", color: "#ff0000" }, { title: "A", color: "#00ff00" }];
    const b = [{ color: "#ff0000", title: "S" }, { color: "#00ff00", title: "A" }];

    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it("должен обрабатывать null и undefined", () => {
    expect(stableStringify(null)).toBe("null");
    expect(stableStringify(undefined)).toBe(undefined as unknown as string);
  });

  it("должен обрабатывать примитивы", () => {
    expect(stableStringify("hello")).toBe('"hello"');
    expect(stableStringify(42)).toBe("42");
    expect(stableStringify(true)).toBe("true");
  });

  it("должен сохранять порядок элементов массива", () => {
    const a = [3, 1, 2];
    const b = [1, 2, 3];

    expect(stableStringify(a)).not.toBe(stableStringify(b));
  });

  it("должен корректно сериализовать AtomicSavePayload-подобный объект", () => {
    const payload = {
      tiers: {
        added: [{ tempId: "tier-1", title: "S", color: "#ff0000", rank: 1 }],
        updated: [{ id: 5, title: "A", color: "#00ff00", rank: 0 }],
        deletedIds: [1, 2, 3],
      },
      newBooks: [{ tempId: "book-1", title: "Book 1", author: "Author", coverImageUrl: "url" }],
      placements: [{ bookId: 1, tierId: 1, rank: 0 }],
      deletedBookIds: [],
    };

    const result = stableStringify(payload);
    expect(result).toContain("tempId");
    expect(result).toContain("tiers");
    expect(result).toContain("placements");
  });
});
