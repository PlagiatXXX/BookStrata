// src/pages/BookPage/BookComments.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { BookComments } from "./BookComments";
import type { BookComment } from "@/lib/bookApi";

const mockUseBookComments = vi.fn();
const mockCreateCommentMutate = vi.fn();
const mockUpdateCommentMutate = vi.fn();
const mockDeleteCommentMutate = vi.fn();
const mockToggleLikeMutate = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/hooks/useBook", () => ({
  useBookComments: (slug: string, limit: number) => mockUseBookComments(slug, limit),
  useCreateBookComment: () => ({ mutate: mockCreateCommentMutate, isPending: false }),
  useUpdateBookComment: () => ({ mutate: mockUpdateCommentMutate, isPending: false }),
  useDeleteBookComment: () => ({ mutate: mockDeleteCommentMutate, isPending: false }),
  useToggleCommentLike: () => ({ mutate: mockToggleLikeMutate, isPending: false }),
}));

vi.mock("@/hooks/useAuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const sampleComments: BookComment[] = [
  {
    id: 1,
    content: "Отличная книга! https://example.com/very/long/url/that/should/not/overflow/the/screen",
    likesCount: 5,
    editedAt: null,
    createdAt: new Date().toISOString(),
    user: {
      id: 42,
      username: "booklover42",
      avatarUrl: "https://example.com/avatar.jpg",
    },
  },
];

describe("BookComments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { userId: 42, username: "booklover42", role: "user" },
    });
    mockUseBookComments.mockReturnValue({
      data: { items: sampleComments, total: 1 },
      isFetching: false,
    });
  });

  it("рендерит аватарку и никнейм как ссылки на профиль /users/:id", () => {
    render(
      <MemoryRouter>
        <BookComments slug="test-book" initialItems={sampleComments} initialTotal={1} />
      </MemoryRouter>,
    );

    const userLinks = screen.getAllByRole("link").filter(
      (link) => link.getAttribute("href") === "/users/42",
    );
    // Должна быть как минимум ссылка на никнейм и ссылка на аватарку
    expect(userLinks.length).toBeGreaterThanOrEqual(2);

    const usernameLink = screen.getByText("booklover42");
    expect(usernameLink.closest("a")).toHaveAttribute("href", "/users/42");
  });

  it("применяет адаптивные классы от переполнения: min-w-0, break-words и flex-wrap", () => {
    render(
      <MemoryRouter>
        <BookComments slug="test-book" initialItems={sampleComments} initialTotal={1} />
      </MemoryRouter>,
    );

    const commentText = screen.getByText(/Отличная книга!/);
    expect(commentText.className).toContain("break-words");
    expect(commentText.className).toContain("[overflow-wrap:anywhere]");

    const textContainer = commentText.parentElement;
    expect(textContainer?.className).toContain("min-w-0");

    const actionsContainer = screen.getByRole("button", { name: /Редактировать/i }).parentElement;
    expect(actionsContainer?.className).toContain("flex-wrap");
  });

  it("позволяет ввести и отправить комментарий в форме 'Ваше мнение'", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BookComments slug="test-book" initialItems={sampleComments} initialTotal={1} />
      </MemoryRouter>,
    );

    const textarea = screen.getByPlaceholderText(/Поделитесь впечатлением о книге.../i);
    const submitBtn = screen.getByRole("button", { name: "Отправить" });

    // Изначально кнопка неактивна для пустого ввода
    expect(submitBtn).toBeDisabled();

    await user.type(textarea, "Мой новый комментарий");
    expect(submitBtn).not.toBeDisabled();

    await user.click(submitBtn);
    expect(mockCreateCommentMutate).toHaveBeenCalledWith(
      { content: "Мой новый комментарий" },
      expect.any(Object),
    );
  });

  it("позволяет редактировать свой комментарий", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BookComments slug="test-book" initialItems={sampleComments} initialTotal={1} />
      </MemoryRouter>,
    );

    const editBtn = screen.getByRole("button", { name: /Редактировать/i });
    await user.click(editBtn);

    const editTextarea = screen.getByDisplayValue(/Отличная книга!/);
    expect(editTextarea).toBeTruthy();

    const saveBtn = screen.getByRole("button", { name: "Сохранить" });
    await user.click(saveBtn);

    expect(mockUpdateCommentMutate).toHaveBeenCalledWith(
      expect.objectContaining({ commentId: 1 }),
      expect.any(Object),
    );
  });

  it("позволяет ответить на комментарий с parentId", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BookComments slug="test-book" initialItems={sampleComments} initialTotal={1} />
      </MemoryRouter>,
    );

    const replyBtn = screen.getByRole("button", { name: /Ответить/i });
    await user.click(replyBtn);

    expect(screen.getByText(/Ответ для @booklover42/i)).toBeTruthy();

    const replyTextarea = screen.getByPlaceholderText<HTMLTextAreaElement>("Напишите ответ...");
    expect(replyTextarea.value).toBe("@booklover42, ");
    expect(replyTextarea.selectionStart).toBe(replyTextarea.value.length);
    expect(replyTextarea.selectionEnd).toBe(replyTextarea.value.length);

    const replySubmit = screen.getByRole("button", { name: "Отправить ответ" });
    await user.click(replySubmit);

    expect(mockCreateCommentMutate).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: 1 }),
      expect.any(Object),
    );
  });

  it("отображает удалённый комментарий (soft delete) без ссылок на профиль и кнопок действий", () => {
    const deletedComment: BookComment = {
      id: 2,
      content: "Комментарий удалён",
      likesCount: 0,
      editedAt: null,
      createdAt: new Date().toISOString(),
      isDeleted: true,
      user: { id: 0, username: "Пользователь", avatarUrl: null },
    };

    mockUseBookComments.mockReturnValue({
      data: { items: [deletedComment], total: 1 },
      isFetching: false,
    });

    render(
      <MemoryRouter>
        <BookComments slug="test-book" initialItems={[deletedComment]} initialTotal={1} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Комментарий удалён")).toBeTruthy();
    expect(screen.getByText("Пользователь")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Редактировать/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Удалить/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Профиль Пользователь/i })).toBeNull();
  });

  it("модалка удаления содержит пояснение про сохранение ветки ответов", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BookComments slug="test-book" initialItems={sampleComments} initialTotal={1} />
      </MemoryRouter>,
    );

    const deleteBtn = screen.getByRole("button", { name: /Удалить/i });
    await user.click(deleteBtn);

    expect(
      screen.getByText(/Если на него уже ответили другие пользователи, вместо текста отобразится «Комментарий удалён»/i),
    ).toBeTruthy();
  });

  it("секция имеет id='discussion' и машиночитаемый тег <time dateTime='...'>", () => {
    const createdAt = "2026-04-12T10:15:30.000Z";
    mockUseBookComments.mockReturnValue({
      data: {
        items: [
          {
            ...sampleComments[0],
            createdAt,
          },
        ],
        total: 1,
      },
      isFetching: false,
    });

    const { container } = render(
      <MemoryRouter>
        <BookComments slug="test-book" initialItems={sampleComments} initialTotal={1} />
      </MemoryRouter>,
    );

    const section = container.querySelector("section#discussion");
    expect(section).toBeInTheDocument();

    const timeEl = container.querySelector("time");
    expect(timeEl).toBeInTheDocument();
    expect(timeEl).toHaveAttribute("datetime", createdAt);
  });
});
