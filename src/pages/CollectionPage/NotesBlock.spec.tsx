import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotesBlock } from "./NotesBlock";

describe("NotesBlock", () => {
  it("renders the editorial note alongside the collection excerpt", () => {
    render(
      <NotesBlock
        excerpt="Краткое описание"
        editorialNote="Почему эти книги вошли в подборку"
      />,
    );

    expect(screen.getByRole("blockquote")).toHaveTextContent("Краткое описание");
    expect(screen.getByText("Почему эти книги вошли в подборку")).toBeInTheDocument();
  });
});
