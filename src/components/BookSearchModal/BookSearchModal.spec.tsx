import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BookSearchModal } from "./BookSearchModal";

// Mock the hooks and APIs
vi.mock("@/hooks/useBookSearch", () => ({
  useBookSearch: () => ({
    search: vi.fn(),
    results: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    totalResults: 0,
    clearResults: vi.fn(),
  }),
}));

vi.mock("@/lib/bookSearchApi", () => ({
  addBookFromGoogleBooks: vi.fn(),
}));

describe("BookSearchModal", () => {
  it("should have correct title id", () => {
    render(
      <BookSearchModal
        isOpen={true}
        onClose={() => {}}
        tierListId="test-id"
      />
    );

    const title = screen.getByText("Найти книгу");
    expect(title).toHaveAttribute("id", "book-search-title");
  });

  it("should refocus input when clearing search", () => {
    render(
      <BookSearchModal
        isOpen={true}
        onClose={() => {}}
        tierListId="test-id"
      />
    );

    const input = screen.getByLabelText("Поиск книг");
    fireEvent.change(input, { target: { value: "test" } });

    // The clear button is only visible when state.query is not empty
    const clearButton = screen.getByLabelText("Очистить поиск");
    fireEvent.click(clearButton);

    expect(input).toHaveValue("");
    expect(document.activeElement).toBe(input);
  });

  it("should clear search and refocus on Escape key", () => {
    render(
      <BookSearchModal
        isOpen={true}
        onClose={() => {}}
        tierListId="test-id"
      />
    );

    const input = screen.getByLabelText("Поиск книг");
    fireEvent.change(input, { target: { value: "test" } });

    fireEvent.keyDown(input, { key: "Escape" });

    expect(input).toHaveValue("");
    expect(document.activeElement).toBe(input);
  });
});
