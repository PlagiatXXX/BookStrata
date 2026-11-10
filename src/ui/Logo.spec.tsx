import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("renders brand logo without halloween pumpkin", () => {
    const { container } = render(<Logo />);
    expect(container.querySelector(".logo-pumpkin")).toBeNull();
  });
});
