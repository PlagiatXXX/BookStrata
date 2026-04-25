/// <reference types="vitest/globals" />

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchBar } from "./SearchBar";

describe("SearchBar Shortcut", () => {
  it("should focus the input when '/' is pressed", () => {
    render(<SearchBar value="" onChange={() => {}} />);
    const input = screen.getByLabelText("Поиск по названию");

    expect(document.activeElement).not.toBe(input);

    fireEvent.keyDown(window, { key: "/" });

    expect(document.activeElement).toBe(input);
  });

  it("should not focus the input when '/' is pressed if another input is focused", () => {
    render(
      <div>
        <input data-testid="other-input" />
        <SearchBar value="" onChange={() => {}} />
      </div>
    );
    const otherInput = screen.getByTestId("other-input");
    const searchInput = screen.getByLabelText("Поиск по названию");

    otherInput.focus();
    expect(document.activeElement).toBe(otherInput);

    fireEvent.keyDown(otherInput, { key: "/", bubbles: true });

    expect(document.activeElement).toBe(otherInput);
    expect(document.activeElement).not.toBe(searchInput);
  });

  it("should show the kbd hint when not focused and empty", () => {
    render(<SearchBar value="" onChange={() => {}} />);
    expect(screen.getByText("/")).toBeInTheDocument();
  });

  it("should hide the kbd hint when focused", () => {
    render(<SearchBar value="" onChange={() => {}} />);
    const input = screen.getByLabelText("Поиск по названию");

    fireEvent.focus(input);
    expect(screen.queryByText("/")).not.toBeInTheDocument();
  });

  it("should hide the kbd hint when value is not empty", () => {
    render(<SearchBar value="test" onChange={() => {}} />);
    expect(screen.queryByText("/")).not.toBeInTheDocument();
  });

  it("should clear the value when 'Escape' is pressed and value is not empty", () => {
    const handleChange = vi.fn();
    render(<SearchBar value="test" onChange={handleChange} />);
    const input = screen.getByLabelText("Поиск по названию");

    fireEvent.keyDown(input, { key: "Escape" });

    expect(handleChange).toHaveBeenCalledWith("");
  });

  it("should blur the input when 'Escape' is pressed and value is empty", () => {
    render(<SearchBar value="" onChange={() => {}} />);
    const input = screen.getByLabelText("Поиск по названию");

    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.keyDown(input, { key: "Escape" });

    expect(document.activeElement).not.toBe(input);
  });
});
