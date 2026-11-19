import { describe, expect, it } from "vitest";

import { pluralize } from "./pluralize";

describe("pluralize", () => {
  it("1 → one", () => {
    expect(pluralize(1, "книга", "книги", "книг")).toBe("книга");
  });

  it("2–4 → few", () => {
    expect(pluralize(2, "книга", "книги", "книг")).toBe("книги");
    expect(pluralize(3, "книга", "книги", "книг")).toBe("книги");
    expect(pluralize(4, "книга", "книги", "книг")).toBe("книги");
  });

  it("5–20 → many", () => {
    for (let n = 5; n <= 20; n++) {
      expect(pluralize(n, "книга", "книги", "книг")).toBe("книг");
    }
  });

  it("11–14 → many (исключение)", () => {
    expect(pluralize(11, "книга", "книги", "книг")).toBe("книг");
    expect(pluralize(12, "книга", "книги", "книг")).toBe("книг");
    expect(pluralize(13, "книга", "книги", "книг")).toBe("книг");
    expect(pluralize(14, "книга", "книги", "книг")).toBe("книг");
  });

  it("21, 31, 101 → one", () => {
    expect(pluralize(21, "книга", "книги", "книг")).toBe("книга");
    expect(pluralize(31, "книга", "книги", "книг")).toBe("книга");
    expect(pluralize(101, "книга", "книги", "книг")).toBe("книга");
  });

  it("22–24, 32–34 → few", () => {
    expect(pluralize(22, "книга", "книги", "книг")).toBe("книги");
    expect(pluralize(24, "книга", "книги", "книг")).toBe("книги");
    expect(pluralize(32, "книга", "книги", "книг")).toBe("книги");
  });

  it("0 → many", () => {
    expect(pluralize(0, "книга", "книги", "книг")).toBe("книг");
  });
});
