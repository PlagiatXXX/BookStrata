import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("renders brand logo without halloween pumpkin", () => {
    const { container } = render(<Logo />);
    expect(container.querySelector(".logo-pumpkin")).toBeNull();
  });

  it("отображает слоган «Книжное пространство» и корректный aria-label", () => {
    render(<Logo />);
    expect(screen.getByRole("button", { name: /BookStrata - Книжное пространство/i })).toBeInTheDocument();
    expect(screen.getByText("Книжное пространство")).toBeInTheDocument();
  });
});
