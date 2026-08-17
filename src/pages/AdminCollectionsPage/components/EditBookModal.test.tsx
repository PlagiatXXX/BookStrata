// src/pages/AdminCollectionsPage/components/EditBookModal.test.tsx
// Автозаполнение карточки подборки из каталога: точное совпадение — пустые поля
// заполняются автоматически, кандидаты — на выбор, кнопка — принудительная
// перезапись. Цель: не плодить дубли (синк прилинкует канон по title+author).
import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EditBookModal } from "./EditBookModal";
import * as collectionsApi from "@/lib/collectionsApi";
import type { CatalogBookMatch } from "@/lib/collectionsApi";
import type { CuratedBook } from "./types";

vi.mock("@/lib/collectionsApi", () => ({
  matchCatalogBookLookup: vi.fn(),
}));

const mockedLookup = vi.mocked(collectionsApi.matchCatalogBookLookup);

const book: CatalogBookMatch = {
  id: 42,
  title: "Правда о деле Гарри Квеберта",
  author: "Жоэль Диккер",
  coverImageUrl: "https://cdn.example.com/kvebert.webp",
  publishedYear: 2012,
  genre: "Триллер",
  tags: ["Тайны прошлого", "Писатель и литература"],
  description: "Молодой писатель расследует старое убийство.",
  slug: "pravda-o-dele-garri-kveberta",
  status: "published",
  rating: 8.5,
};

function baseForm(overrides: Record<string, unknown> = {}): CuratedBook {
  return {
    id: "curated_1_1",
    title: "",
    author: "",
    coverImageUrl: "",
    description: "",
    rating: undefined,
    genre: "",
    tags: "",
    year: undefined,
    tierId: null,
    ...overrides,
  } as CuratedBook;
}

/** Контролируемая обёртка: родитель владеет editForm, как в реальном флоу */
function renderModal(initial: CuratedBook = baseForm()) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  function Wrapper() {
    const [form, setForm] = useState<CuratedBook>(initial);
    return (
      <EditBookModal editForm={form} onFieldChange={setForm} onSave={onSave} onClose={onClose} />
    );
  }
  render(<Wrapper />);
  return { onSave, onClose };
}

describe("EditBookModal: автопоиск в каталоге", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("при точном совпадении заполняет пустые поля карточки", async () => {
    mockedLookup.mockResolvedValue({ book, candidates: [] });
    renderModal();

    fireEvent.change(screen.getByPlaceholderText("Название книги"), {
      target: { value: "Правда о деле Гарри Квеберта" },
    });

    expect(await screen.findByText("Книга уже в каталоге")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedLookup).toHaveBeenCalledWith("Правда о деле Гарри Квеберта", "");
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText("1925")).toHaveValue(2012);
    });
    expect(screen.getByDisplayValue("Триллер")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Тайны прошлого, Писатель и литература")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Молодой писатель расследует старое убийство."),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://cdn.example.com/kvebert.webp")).toBeInTheDocument();
  });

  it("похожие книги — список кандидатов, клик перезаписывает карточку", async () => {
    const candidate: CatalogBookMatch = {
      ...book,
      id: 7,
      title: "Дориан Грей",
      author: "Оскар Уайльд",
    };
    mockedLookup.mockResolvedValue({ book: null, candidates: [candidate] });
    renderModal();

    fireEvent.change(screen.getByPlaceholderText("Название книги"), {
      target: { value: "Дориан" },
    });

    fireEvent.click(await screen.findByText(/Дориан Грей — Оскар Уайльд/));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Дориан Грей")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Оскар Уайльд")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Триллер")).toBeInTheDocument();
    });
  });

  it("не найдено — подсказка о создании новой записи", async () => {
    mockedLookup.mockResolvedValue({ book: null, candidates: [] });
    renderModal();

    fireEvent.change(screen.getByPlaceholderText("Название книги"), {
      target: { value: "Совсем новая книга" },
    });

    expect(await screen.findByText(/В каталоге не найдена/)).toBeInTheDocument();
  });

  it("кнопка «Заполнить из каталога» принудительно перезаписывает карточку", async () => {
    mockedLookup.mockResolvedValue({ book, candidates: [] });
    renderModal();

    fireEvent.change(screen.getByPlaceholderText("Название книги"), {
      target: { value: "Правда о деле Гарри Квеберта" },
    });

    fireEvent.click(await screen.findByRole("button", { name: "Заполнить из каталога" }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Жоэль Диккер")).toBeInTheDocument();
      expect(screen.getByDisplayValue("https://cdn.example.com/kvebert.webp")).toBeInTheDocument();
    });
  });
});
