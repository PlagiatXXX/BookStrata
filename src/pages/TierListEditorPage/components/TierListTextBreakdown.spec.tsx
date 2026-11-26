import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Book, TierListData } from "@/types";
import { TierListTextBreakdown } from "./TierListTextBreakdown";

function createData(overrides: Partial<TierListData> = {}): TierListData {
  return {
    tierIdToTempIdMap: {},
    id: "tl-1",
    title: "Мой топ детективов",
    books: {
      b1: {
        id: "b1",
        title: "Убийство на улице Морг",
        author: "Эдгар Аллан По",
        coverImageUrl: "img1",
        slug: "ubijstvo-na-ulitse-morg",
        status: "published",
        thoughts: "Классика жанра с блестящей развязкой.",
      },
      b2: {
        id: "b2",
        title: "Десять негритят",
        author: "Агата Кристи",
        coverImageUrl: "img2",
        slug: "desyat-negrityat",
        status: "published",
      },
      b3: {
        id: "b3",
        title: "Личная заметка о книге",
        author: "Неизвестен",
        coverImageUrl: "img3",
      },
    },
    tiers: {
      t1: {
        id: "t1",
        title: "Шедевр",
        color: "#ff5555",
        bookIds: ["b1", "b2"],
      },
      t2: {
        id: "t2",
        title: "Хорошо",
        color: "#ffaa00",
        bookIds: ["b3"],
      },
      t3: {
        id: "t3",
        title: "Пустой уровень",
        color: "#cccccc",
        bookIds: [],
      },
    },
    tierOrder: ["t1", "t2", "t3"],
    unrankedBookIds: [],
    ...overrides,
  };
}

describe("TierListTextBreakdown", () => {
  it("возвращает null, если по тирам не распределена ни одна книга", () => {
    const emptyPlacedData = createData({
      tiers: {
        t1: { id: "t1", title: "Шедевр", color: "#ff5555", bookIds: [] },
      },
      tierOrder: ["t1"],
      unrankedBookIds: ["b1", "b2"],
    });

    const { container } = render(
      <MemoryRouter>
        <TierListTextBreakdown
          title="Пустой рейтинг"
          authorName="fedor"
          listData={emptyPlacedData}
        />
      </MemoryRouter>,
    );

    expect(container.firstChild).toBeNull();
  });

  it("рендерит сводку с обрезанным email-логином автора и список книг по непустым тирам", () => {
    render(
      <MemoryRouter>
        <TierListTextBreakdown
          title="Мой топ детективов"
          authorName="nazar199947@gmail.com"
          listData={createData()}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Состав рейтинга" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/nazar199947/)).toBeInTheDocument();
    expect(screen.queryByText(/gmail\.com/)).not.toBeInTheDocument();
    expect(screen.getByText(/распределено 3 книги по 2 уровням/)).toBeInTheDocument();

    // Пустой уровень не выводится
    expect(screen.queryByText("Пустой уровень")).not.toBeInTheDocument();
    expect(screen.getByText("Шедевр")).toBeInTheDocument();
    expect(screen.getByText("Хорошо")).toBeInTheDocument();
  });

  it("делает каталоговые книги ссылками на /books/:slug и вызывает onViewBook для некаталоговых", () => {
    const onViewBook = vi.fn();
    render(
      <MemoryRouter>
        <TierListTextBreakdown
          title="Мой топ детективов"
          authorName="fedor"
          listData={createData()}
          onViewBook={onViewBook}
        />
      </MemoryRouter>,
    );

    const catalogLink = screen.getByRole("link", {
      name: "Убийство на улице Морг",
    });
    expect(catalogLink).toHaveAttribute(
      "href",
      "/books/ubijstvo-na-ulitse-morg",
    );

    const customButton = screen.getByRole("button", {
      name: "Личная заметка о книге",
    });
    fireEvent.click(customButton);
    expect(onViewBook).toHaveBeenCalledTimes(1);
    expect((onViewBook.mock.calls[0]?.[0] as Book).title).toBe(
      "Личная заметка о книге",
    );
  });

  it("отображает мысли автора под соответствующей книгой", () => {
    render(
      <MemoryRouter>
        <TierListTextBreakdown
          title="Мой топ детективов"
          authorName="fedor"
          listData={createData()}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Классика жанра с блестящей развязкой."),
    ).toBeInTheDocument();
  });

  it("не рендерит блок, если в тирах меньше 3 нормальных книг (одни хэши и image (N))", () => {
    const garbageData: TierListData = {
      tierIdToTempIdMap: {},
      id: "tl-garbage",
      title: "Книги которые мы заслужили",
      books: {
        g1: { id: "g1", title: "f7b21e2b0a472bece4e63b3e5d4fcf8e", author: "Неизвестен", coverImageUrl: "1" },
        g2: { id: "g2", title: "image (347)", author: "Неизвестен", coverImageUrl: "2" },
        g3: { id: "g3", title: "14055da3182a4fde2f91a5a7053f317d", author: "Неизвестен", coverImageUrl: "3" },
        g4: { id: "g4", title: "image (340)", author: "Неизвестен", coverImageUrl: "4" },
      },
      tiers: {
        t1: { id: "t1", title: "Шедевр", color: "#ff5555", bookIds: ["g1", "g2", "g3", "g4"] },
      },
      tierOrder: ["t1"],
      unrankedBookIds: [],
    };

    const { container } = render(
      <MemoryRouter>
        <TierListTextBreakdown
          title="Книги которые мы заслужили"
          authorName="Пустой странник"
          listData={garbageData}
        />
      </MemoryRouter>,
    );

    expect(container.firstChild).toBeNull();
  });

  it("фильтрует технические названия из списка и сводки, сохраняя нормальные книги", () => {
    const mixedData = createData({
      books: {
        ...createData().books,
        g1: { id: "g1", title: "f7b21e2b0a472bece4e63b3e5d4fcf8e", author: "Неизвестен", coverImageUrl: "1" },
        g2: { id: "g2", title: "image (347)", author: "Неизвестен", coverImageUrl: "2" },
      },
      tiers: {
        t1: { id: "t1", title: "Шедевр", color: "#ff5555", bookIds: ["g1", "b1", "b2", "g2"] },
        t2: { id: "t2", title: "Хорошо", color: "#ffaa00", bookIds: ["b3"] },
      },
      tierOrder: ["t1", "t2"],
    });

    render(
      <MemoryRouter>
        <TierListTextBreakdown
          title="Мой топ детективов"
          authorName="fedor"
          listData={mixedData}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/распределено 3 книги по 2 уровням/)).toBeInTheDocument();
    expect(screen.queryByText(/f7b21e2b0a472bece4e63b3e5d4fcf8e/)).not.toBeInTheDocument();
    expect(screen.queryByText(/image \(347\)/)).not.toBeInTheDocument();
    expect(screen.getByText("Убийство на улице Морг")).toBeInTheDocument();
  });
});
