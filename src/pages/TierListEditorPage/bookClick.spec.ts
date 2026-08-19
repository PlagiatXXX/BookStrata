// src/pages/TierListEditorPage/bookClick.spec.ts
import { describe, it, expect } from "vitest";
import { getBookClickTarget, getBookViewAction } from "./bookClick";
import type { Book } from "@/types";

const baseBook: Book = {
  id: "1",
  title: "1984",
  author: "Джордж Оруэлл",
  coverImageUrl: "/cover.jpg",
};

describe("getBookClickTarget (единый каталог, 19.08)", () => {
  it("published-книга с slug → navigate на страницу книги с ?from=tierListId", () => {
    expect(
      getBookClickTarget({ ...baseBook, status: "published", slug: "1984" }, "list-1"),
    ).toEqual({ type: "navigate", path: "/books/1984?from=list-1" });
  });

  it("draft-книга без slug → модалка", () => {
    expect(
      getBookClickTarget({ ...baseBook, status: "draft" }, "list-1"),
    ).toEqual({ type: "modal" });
  });

  it("published-книга без slug (не в каталоге) → модалка", () => {
    expect(
      getBookClickTarget({ ...baseBook, status: "published" }, "list-1"),
    ).toEqual({ type: "modal" });
  });
});

describe("getBookViewAction (редактор: владелец всегда видит модалку)", () => {
  it("редактирование (не read-only): published-книга → модалка (видны мысли/личная обложка)", () => {
    expect(
      getBookViewAction({ ...baseBook, status: "published", slug: "1984" }, "list-1", false),
    ).toEqual({ type: "modal" });
  });

  it("редактирование: draft-книга → модалка", () => {
    expect(
      getBookViewAction({ ...baseBook, status: "draft" }, "list-1", false),
    ).toEqual({ type: "modal" });
  });

  it("просмотр (read-only): published-книга → навигация на страницу книги", () => {
    expect(
      getBookViewAction({ ...baseBook, status: "published", slug: "1984" }, "list-1", true),
    ).toEqual({ type: "navigate", path: "/books/1984?from=list-1" });
  });

  it("просмотр (read-only): draft-книга → модалка", () => {
    expect(
      getBookViewAction({ ...baseBook, status: "draft" }, "list-1", true),
    ).toEqual({ type: "modal" });
  });
});