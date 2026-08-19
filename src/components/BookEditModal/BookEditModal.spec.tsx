// src/components/BookEditModal/BookEditModal.spec.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookEditModal } from "./BookEditModal";

vi.mock("@/hooks/useAuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/tierListApi", () => ({ uploadBookCover: vi.fn() }));
vi.mock("@/lib/ratingsApi", () => ({
  RATING_CATEGORIES: [],
  rateBook: vi.fn(),
  getBookRatings: vi.fn().mockResolvedValue(null),
  getUserBookRating: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/aiLibrarianApi", () => ({ generateBookDescription: vi.fn() }));
vi.mock("@/ui/Modal", () => ({
  Modal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/EditorModals/EditorConfirmModal", () => ({
  EditorConfirmModal: () => null,
}));

const draftBook = {
  id: "1",
  title: "1984",
  author: "Джордж Оруэлл",
  coverImageUrl: "/c.jpg",
  description: "Антиутопия",
  thoughts: "Прочитал в школе",
  genre: "Фантастика",
  tags: ["классика"],
  status: "draft",
  slug: null,
};

const publishedBook = {
  ...draftBook,
  status: "published",
  slug: "1984",
};

describe("BookEditModal: единый каталог (19.08)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("published: глобальные поля недоступны, мысли редактируются", () => {
    render(
      <BookEditModal
        isOpen
        book={publishedBook as never}
        onClose={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.getByLabelText("Название книги")).toBeDisabled();
    expect(screen.getByLabelText("Автор книги")).toBeDisabled();
    expect(screen.getByLabelText("Жанр книги")).toBeDisabled();
    expect(screen.getByLabelText("Теги книги")).toBeDisabled();
    expect(screen.getByLabelText("Описание книги")).toBeDisabled();
    expect(screen.getByLabelText("Ваши мысли о книге")).toBeEnabled();
  });

  it("draft: все поля редактируются", () => {
    render(
      <BookEditModal
        isOpen
        book={draftBook as never}
        onClose={() => {}}
        onSave={() => {}}
      />,
    );
    expect(screen.getByLabelText("Название книги")).toBeEnabled();
    expect(screen.getByLabelText("Автор книги")).toBeEnabled();
    expect(screen.getByLabelText("Жанр книги")).toBeEnabled();
    expect(screen.getByLabelText("Теги книги")).toBeEnabled();
    expect(screen.getByLabelText("Описание книги")).toBeEnabled();
    expect(screen.getByLabelText("Ваши мысли о книге")).toBeEnabled();
  });

  it("onSave для published не отправляет глобальные поля", async () => {
    const onSave = vi.fn();
    render(
      <BookEditModal
        isOpen
        book={publishedBook as never}
        onClose={() => {}}
        onSave={onSave}
      />,
    );
    // Модалка сохраняет при закрытии (кнопка «Закрыть» → handleSaveAndClose)
    await userEvent.click(screen.getByRole("button", { name: "Закрыть" }));

    expect(onSave).toHaveBeenCalledWith(
      "1",
      expect.not.objectContaining({
        title: expect.any(String),
        author: expect.any(String),
        genre: expect.any(String),
        tags: expect.any(Array),
        description: expect.any(String),
      }),
    );
  });
});