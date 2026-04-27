/// <reference types="vitest/globals" />

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BookSearchModal } from "./BookSearchModal";

// Mock the hook and API
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

describe("BookSearchModal Accessibility & Keyboard", () => {
  it("clears search query and focuses input when Escape is pressed and query is not empty", () => {
    const onClose = vi.fn();
    render(
      <BookSearchModal
        isOpen={true}
        onClose={onClose}
        tierListId="1"
      />
    );

    const input = screen.getByLabelText("Поиск книг") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test query" } });
    expect(input.value).toBe("test query");

    fireEvent.keyDown(window, { key: "Escape" });

    expect(input.value).toBe("");
    expect(document.activeElement).toBe(input);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes modal when Escape is pressed and query is empty", () => {
    const onClose = vi.fn();
    render(
      <BookSearchModal
        isOpen={true}
        onClose={onClose}
        tierListId="1"
      />
    );

    const input = screen.getByLabelText("Поиск книг") as HTMLInputElement;
    expect(input.value).toBe("");

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
  });

  it("focuses input when clear button is clicked", () => {
    render(
      <BookSearchModal
        isOpen={true}
        onClose={() => {}}
        tierListId="1"
      />
    );

    const input = screen.getByLabelText("Поиск книг") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test query" } });

    const clearButton = screen.getByLabelText("Очистить поиск");
    fireEvent.click(clearButton);

    expect(input.value).toBe("");
    expect(document.activeElement).toBe(input);
  });
});
