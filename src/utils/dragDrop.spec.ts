import { describe, it, expect } from "vitest";
import type { DragEndEvent } from "@dnd-kit/core";
import type { TierListData } from "@/types";
import {
  resolveOverId,
  isTierReorder,
  resolveDestContainer,
  calculateDestIndex,
  isNoopMove,
  getDragEndAction,
} from "./dragDrop";

const UNRANKED_ID = "unranked-area";

function createTierListData(overrides?: Partial<TierListData>): TierListData {
  return {
    id: "test-1",
    title: "Test List",
    books: {
      "book-1": { id: "book-1", title: "Book 1", author: "Author 1", coverImageUrl: "url1" },
      "book-2": { id: "book-2", title: "Book 2", author: "Author 2", coverImageUrl: "url2" },
      "book-3": { id: "book-3", title: "Book 3", author: "Author 3", coverImageUrl: "url3" },
    },
    tiers: {
      "tier-1": { id: "tier-1", title: "S", color: "#FF6B6B", bookIds: ["book-1", "book-2"] },
      "tier-2": { id: "tier-2", title: "A", color: "#FFD93D", bookIds: ["book-3"] },
    },
    tierOrder: ["tier-1", "tier-2"],
    unrankedBookIds: [],
    tierIdToTempIdMap: {},
    ...overrides,
  };
}

function mockActive(id: string, opts?: {
  type?: string;
  containerId?: string;
  index?: number;
}) {
  return {
    id,
    data: {
      current: {
        type: opts?.type ?? "book",
        containerId: opts?.containerId,
        sortable: opts?.index !== undefined ? { index: opts.index } : undefined,
      },
    },
    rect: {
      current: null,
    },
  } as unknown as DragEndEvent["active"];
}

function mockOver(id: string, opts?: {
  type?: string;
  containerId?: string;
  index?: number;
}) {
  return {
    id,
    data: {
      current: {
        type: opts?.type ?? "book",
        containerId: opts?.containerId,
        sortable: opts?.index !== undefined ? { index: opts.index } : undefined,
      },
    },
    rect: null,
  } as unknown as NonNullable<DragEndEvent["over"]>;
}

// ─── resolveOverId ─────────────────────────────────

describe("resolveOverId", () => {
  it("должен вернуть containerId, если over — книга", () => {
    const over = mockOver("book-1", { type: "book", containerId: "tier-1" });
    expect(resolveOverId(over)).toBe("tier-1");
  });

  it("должен вернуть строковый id, если over — тир", () => {
    const over = mockOver("tier-1", { type: "tier" });
    expect(resolveOverId(over)).toBe("tier-1");
  });

  it("должен вернуть строковый id, если over — unranked", () => {
    const over = mockOver("unranked-area", { type: "unranked" });
    expect(resolveOverId(over)).toBe("unranked-area");
  });
});

// ─── isTierReorder ─────────────────────────────────

describe("isTierReorder", () => {
  it("должен вернуть true, если оба ID в tierOrder", () => {
    expect(isTierReorder("tier-1", "tier-2", ["tier-1", "tier-2"])).toBe(true);
  });

  it("должен вернуть false, если activeId не в tierOrder", () => {
    expect(isTierReorder("tier-3", "tier-2", ["tier-1", "tier-2"])).toBe(false);
  });

  it("должен вернуть false, если overId не в tierOrder", () => {
    expect(isTierReorder("tier-1", "tier-3", ["tier-1", "tier-2"])).toBe(false);
  });
});

// ─── resolveDestContainer ──────────────────────────

describe("resolveDestContainer", () => {
  const listData = createTierListData();

  it("должен вернуть containerId, если over — книга", () => {
    const over = mockOver("book-3", { type: "book", containerId: "tier-2" });
    expect(resolveDestContainer(over, "tier-2", listData)).toBe("tier-2");
  });

  it("должен вернуть overId, если это существующий тир", () => {
    const over = mockOver("tier-1", { type: "tier" });
    expect(resolveDestContainer(over, "tier-1", listData)).toBe("tier-1");
  });

  it("должен вернуть UNRANKED_AREA_ID, если overId — unranked", () => {
    const over = mockOver("unranked-area", { type: "unranked" });
    expect(resolveDestContainer(over, "unranked-area", listData)).toBe("unranked-area");
  });

  it("должен вернуть undefined для неизвестного контейнера", () => {
    const over = mockOver("unknown", { type: "unknown" });
    expect(resolveDestContainer(over, "unknown", listData)).toBeUndefined();
  });
});

// ─── calculateDestIndex ────────────────────────────

describe("calculateDestIndex", () => {
  it("должен вставить в конец, если бросаем на пустой тир", () => {
    const active = mockActive("book-1", { type: "book", containerId: "tier-1" });
    const over = mockOver("tier-2", { type: "tier" });

    const result = calculateDestIndex({
      active,
      over,
      sourceContainer: "tier-1",
      destContainer: "tier-2",
      sourceIndex: 0,
      destItems: [],
    });

    expect(result).toBe(0);
  });

  it("должен вставить в конец unranked, если бросаем в unranked", () => {
    const active = mockActive("book-1", { type: "book", containerId: "tier-1" });
    const over = mockOver("unranked-area", { type: "unranked" });

    const result = calculateDestIndex({
      active,
      over,
      sourceContainer: "tier-1",
      destContainer: "unranked-area",
      sourceIndex: 0,
      destItems: ["book-2", "book-3"],
    });

    expect(result).toBe(2);
  });

  it("должен использовать overIndex, если нет rect (без точного позиционирования)", () => {
    const active = mockActive("book-1", { type: "book", containerId: "tier-1", index: 0 });
    const over = mockOver("book-2", { type: "book", containerId: "tier-2", index: 1 });

    const result = calculateDestIndex({
      active,
      over,
      sourceContainer: "tier-1",
      destContainer: "tier-2",
      sourceIndex: 0,
      destItems: ["book-2"],
    });

    // Между контейнерами, без rect — просто overIndex
    expect(result).toBe(1);
  });

  it("должен вставить ПОСЛЕ книги, если курсор правее центра (один контейнер)", () => {
    const active = mockActive("book-1", { type: "book", containerId: "tier-1", index: 0 });
    const over = mockOver("book-2", { type: "book", containerId: "tier-1", index: 1 });

    // Добавляем rect с позицией: active правее over
    const activeWithRect = {
      ...active,
      rect: {
        current: {
          translated: { left: 200, width: 80 },
        },
      },
    } as unknown as DragEndEvent["active"];

    const overWithRect = {
      ...over,
      rect: { left: 100, width: 80 },
    } as unknown as NonNullable<DragEndEvent["over"]>;

    // active.center (240) > over.center (140) → insertAfter
    // sourceIndex (0) < overIndex (1), insertAfter=true → destIndex = 1 + 0 = 1
    const result = calculateDestIndex({
      active: activeWithRect,
      over: overWithRect,
      sourceContainer: "tier-1",
      destContainer: "tier-1",
      sourceIndex: 0,
      destItems: ["book-1", "book-2", "book-3"],
    });

    expect(result).toBe(1);
  });
});

// ─── isNoopMove ────────────────────────────────────

describe("isNoopMove", () => {
  it("должен вернуть true, если sourceContainer === destContainer, sourceIndex === destIndex", () => {
    const over = mockOver("book-1", { type: "book", containerId: "tier-1", index: 0 });
    expect(isNoopMove("tier-1", "tier-1", 0, 0, over, ["book-1", "book-2"])).toBe(true);
  });

  it("должен вернуть false, если контейнеры разные", () => {
    const over = mockOver("book-1", { type: "book", containerId: "tier-2", index: 0 });
    expect(isNoopMove("tier-1", "tier-2", 0, 0, over, ["book-1"])).toBe(false);
  });

  it("должен вернуть true, если бросили на контейнер и книга уже была последней", () => {
    const over = mockOver("tier-1", { type: "tier" });
    expect(isNoopMove("tier-1", "tier-1", 2, 3, over, ["book-1", "book-2", "book-3"])).toBe(true);
  });

  it("должен вернуть false, если бросили на контейнер, но книга не последняя", () => {
    const over = mockOver("tier-1", { type: "tier" });
    expect(isNoopMove("tier-1", "tier-1", 0, 1, over, ["book-1", "book-2", "book-3"])).toBe(false);
  });
});

// ─── getDragEndAction — комплексные сценарии ──────

describe("getDragEndAction", () => {
  const listData = createTierListData();

  it("должен вернуть null, если over отсутствует", () => {
    const event = {
      active: mockActive("book-1", { type: "book", containerId: "tier-1" }),
      over: null,
    } as unknown as DragEndEvent;

    expect(getDragEndAction(event, listData)).toBeNull();
  });

  it("должен вернуть null, если active и over — один и тот же элемент", () => {
    const event = {
      active: mockActive("book-1", { type: "book", containerId: "tier-1" }),
      over: mockOver("book-1", { type: "book", containerId: "tier-1" }),
    } as unknown as DragEndEvent;

    const mockEvent = {
      active: { id: "book-1" },
      over: { id: "book-1" },
    } as DragEndEvent;

    expect(getDragEndAction(mockEvent, listData)).toBeNull();
  });

  it("должен вернуть tier-reorder при перетаскивании тира на другой тир", () => {
    const event = {
      active: mockActive("tier-1", { type: "tier" }),
      over: mockOver("tier-2", { type: "tier" }),
    } as unknown as DragEndEvent;

    const result = getDragEndAction(event, listData);
    expect(result).toEqual({
      type: "tier",
      activeId: "tier-1",
      overId: "tier-2",
    });
  });

  it("должен вернуть book-move при перетаскивании книги между тирами", () => {
    const event = {
      active: mockActive("book-1", { type: "book", containerId: "tier-1", index: 0 }),
      over: mockOver("tier-2", { type: "tier" }),
    } as unknown as DragEndEvent;

    const result = getDragEndAction(event, listData);
    expect(result).toEqual({
      type: "book",
      sourceContainer: "tier-1",
      destContainer: "tier-2",
      sourceIndex: 0,
      destIndex: 1, // в конец tier-2 (там одна книга)
    });
  });

  it("должен вернуть book-move при перетаскивании книги в unranked", () => {
    const listWithUnranked = createTierListData({
      unrankedBookIds: ["book-3"],
    });

    const event = {
      active: mockActive("book-1", { type: "book", containerId: "tier-1", index: 0 }),
      over: mockOver("unranked-area", { type: "unranked" }),
    } as unknown as DragEndEvent;

    const result = getDragEndAction(event, listWithUnranked);
    expect(result).toEqual({
      type: "book",
      sourceContainer: "tier-1",
      destContainer: UNRANKED_ID,
      sourceIndex: 0,
      destIndex: 1, // в конец unranked
    });
  });

  it("должен вернуть null при книге на то же место (noop)", () => {
    const event = {
      active: mockActive("book-1", { type: "book", containerId: "tier-1", index: 0 }),
      over: mockOver("book-1", { type: "book", containerId: "tier-1", index: 0 }),
    } as unknown as DragEndEvent;

    // active.id === over.id → null
    const mockEvent = {
      active: { id: "book-1" },
      over: { id: "book-1" },
    } as DragEndEvent;

    expect(getDragEndAction(mockEvent, listData)).toBeNull();
  });

  it("должен вернуть null, если active не книга и не тир", () => {
    const event = {
      active: mockActive("unknown", { type: "unknown" }),
      over: mockOver("tier-1", { type: "tier" }),
    } as unknown as DragEndEvent;

    expect(getDragEndAction(event, listData)).toBeNull();
  });

  it("должен вернуть null, если sourceContainer не определён для книги", () => {
    const event = {
      active: mockActive("book-1", { type: "book" }), // без containerId
      over: mockOver("tier-2", { type: "tier" }),
    } as unknown as DragEndEvent;

    expect(getDragEndAction(event, listData)).toBeNull();
  });
});
