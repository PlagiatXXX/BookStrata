import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ImageUploader } from "./ImageUploader";
import { MAX_BOOKS_PER_TIER_LIST } from "@/constants/limits";

vi.mock("sileo", () => ({
  sileo: {
    error: vi.fn(),
    action: vi.fn(),
    success: vi.fn(),
  },
}));

describe("ImageUploader", () => {
  const mockOnUpload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("должен отображать компонент корректно", () => {
    render(<ImageUploader onUpload={mockOnUpload} />);

    expect(screen.getByText("Загрузить")).toBeInTheDocument();
  });

  it("должен отображать текст Лимит книг при достижении лимита", () => {
    render(<ImageUploader onUpload={mockOnUpload} booksCount={MAX_BOOKS_PER_TIER_LIST} />);

    expect(screen.getByText("Лимит")).toBeInTheDocument();
  });

  it("должен быть отключен при достижении лимита", () => {
    render(<ImageUploader onUpload={mockOnUpload} booksCount={MAX_BOOKS_PER_TIER_LIST} />);

    const dropzone = screen.getByText("Лимит").parentElement;
    expect(dropzone).toHaveClass("cursor-not-allowed");
    expect(dropzone).toHaveClass("opacity-50");
  });

  it("должен быть активен когда есть место", () => {
    render(<ImageUploader onUpload={mockOnUpload} booksCount={10} />);

    const dropzone = screen.getByText("Загрузить").parentElement;
    expect(dropzone).not.toHaveClass("cursor-not-allowed");
    expect(dropzone).not.toHaveClass("opacity-50");
  });

  it("должен быть всегда активен для Pro пользователя", () => {
    render(
      <ImageUploader onUpload={mockOnUpload} booksCount={MAX_BOOKS_PER_TIER_LIST} isPro={true} />,
    );

    const dropzone = screen.getByText("Загрузить").parentElement;
    expect(dropzone).not.toHaveClass("cursor-not-allowed");
    expect(dropzone).not.toHaveClass("opacity-50");
  });
});
