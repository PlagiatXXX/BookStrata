import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Reveal } from "./Reveal";

/** Контролируемый mock IntersectionObserver для эмитации пересечений */
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  private callback: IntersectionObserverCallback;
  private targets = new Set<Element>();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe(target: Element) {
    this.targets.add(target);
  }

  unobserve(target: Element) {
    this.targets.delete(target);
  }

  disconnect() {
    this.targets.clear();
  }

  /** Эмитит пересечение для всех наблюдаемых элементов */
  trigger() {
    const entries = Array.from(this.targets).map(
      (target) =>
        ({
          target,
          isIntersecting: true,
        }) as IntersectionObserverEntry,
    );
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

describe("Reveal", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("изначально скрыт (класс reveal без reveal--visible)", () => {
    render(<Reveal>Контент</Reveal>);

    const el = screen.getByText("Контент");
    expect(el.className).toContain("reveal");
    expect(el.className).not.toContain("reveal--visible");
  });

  it("показывается при пересечении с вьюпортом", () => {
    render(<Reveal>Контент</Reveal>);

    const el = screen.getByText("Контент");
    expect(MockIntersectionObserver.instances.length).toBe(1);

    act(() => {
      MockIntersectionObserver.instances[0].trigger();
    });

    expect(el.className).toContain("reveal--visible");
  });

  it("при prefers-reduced-motion виден сразу, без observer", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion") ? true : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    render(<Reveal>Контент</Reveal>);

    const el = screen.getByText("Контент");
    expect(el.className).toContain("reveal--visible");
    expect(MockIntersectionObserver.instances.length).toBe(0);
  });

  it("поддерживает тег section и проброс className", () => {
    const { container } = render(
      <Reveal as="section" className="mb-12">
        Секция
      </Reveal>,
    );

    const el = container.querySelector("section");
    expect(el).not.toBeNull();
    expect(el!.className).toContain("mb-12 reveal");
  });
});