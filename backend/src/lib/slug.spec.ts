import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Prisma } from "@prisma/client";
import { createBookWithSlug } from "./slug.js";

function createTxMock() {
  return {
    book: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 1,
        ...data,
      })),
      update: vi.fn().mockResolvedValue({}),
    },
    bookSlugHistory: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  };
}

describe("createBookWithSlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("пропускает slug, занятый в bookSlugHistory, и берёт суффикс -2", async () => {
    const tx = createTxMock();
    tx.bookSlugHistory.findUnique
      .mockResolvedValueOnce({ id: 42 }) // novaya-kniga в истории
      .mockResolvedValueOnce(null); // novaya-kniga-2 свободен

    await createBookWithSlug(tx as unknown as Prisma.TransactionClient, {
      title: "Новая книга",
      coverImageUrl: "/cover.jpg",
    });

    expect(tx.book.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ slug: "novaya-kniga-2" }),
    });
  });

  it("при reclaimFromDraft не занимает slug из bookSlugHistory", async () => {
    const tx = createTxMock();
    tx.bookSlugHistory.findUnique
      .mockResolvedValueOnce({ id: 42 }) // первый slug отдан под 301
      .mockResolvedValueOnce(null);
    // Даже если в Book этот slug числился у draft — он не должен затираться
    tx.book.findUnique.mockResolvedValue(null);

    await createBookWithSlug(
      tx as unknown as Prisma.TransactionClient,
      {
        title: "Дюна",
        coverImageUrl: "/cover.jpg",
      },
      undefined,
      { reclaimFromDraft: true },
    );

    expect(tx.book.update).not.toHaveBeenCalled();
    expect(tx.book.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ slug: "dyuna-2" }),
    });
  });
});
