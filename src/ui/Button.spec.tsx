/// <reference types="vitest/globals" />

import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Button } from "./Button";

import "@testing-library/jest-dom";

describe("Button Component", () => {
  afterEach(() => {
    cleanup();
  });
  it("should render button with text", () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it("should have ghost variant by default", () => {
    render(<Button>Default Button</Button>);

    const button = screen.getByRole("button", { name: /default button/i });
    expect(button).toHaveClass("bg-transparent");
  });

  it("should have primary variant when specified", () => {
    render(<Button variant="primary">Primary Button</Button>);

    const button = screen.getByRole("button", { name: /primary button/i });
    expect(button).toHaveClass("bg-[var(--ink-0)]");
  });

  it("should apply custom className", () => {
    render(<Button className="custom-class">Custom</Button>);

    const button = screen.getByRole("button", { name: /custom/i });
    expect(button).toHaveClass("custom-class");
  });

  it("should handle click events", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clickable</Button>);

    const button = screen.getByRole("button", { name: /clickable/i });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("should be disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled Button</Button>);

    const button = screen.getByRole("button", { name: /disabled button/i });
    expect(button).toBeDisabled();
  });

  it("should forward ref", () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<Button ref={ref}>Ref Button</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("should show loading spinner when isLoading is true", () => {
    render(<Button isLoading>Loading Button</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();

    // The text should be hidden with opacity-0 but still in the document
    const text = screen.getByText(/loading button/i);
    expect(text).toHaveClass("opacity-0");
  });

  it("should be disabled when isLoading is true even if disabled is false", () => {
    render(
      <Button isLoading disabled={false}>
        Loading
      </Button>,
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });
});
