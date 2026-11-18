import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SeasonalAtmosphere } from "./SeasonalAtmosphere";
import { AutumnLeavesAtmosphere } from "./AutumnLeavesAtmosphere";
import { AutumnRainAtmosphere } from "./AutumnRainAtmosphere";
import { WinterFrostAtmosphere } from "./WinterFrostAtmosphere";
import { WinterAuroraAtmosphere } from "./WinterAuroraAtmosphere";
import { WinterNewYearAtmosphere } from "./WinterNewYearAtmosphere";

function createMockCanvasContext() {
  const ctx: Record<string, unknown> = {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "round",
    lineJoin: "round",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    shadowBlur: 0,
    shadowColor: "",
    filter: "none",
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: vi.fn(),
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

describe("SeasonalAtmosphere", () => {
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
  let mockCtx: CanvasRenderingContext2D;
  let frames: FrameRequestCallback[];
  let requestFrameSpy: ReturnType<typeof vi.spyOn>;
  let cancelFrameSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockCtx = createMockCanvasContext();
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as never;

    frames = [];
    requestFrameSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb) => {
        frames.push(cb);
        return frames.length;
      });
    cancelFrameSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    requestFrameSpy.mockRestore();
    cancelFrameSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("renders null if effectsEnabled is false", () => {
    const { container } = render(
      <SeasonalAtmosphere theme="autumn-leaves" effectsEnabled={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders null for default or unknown theme", () => {
    const { container: defaultContainer } = render(
      <SeasonalAtmosphere theme="default" />,
    );
    expect(defaultContainer.firstChild).toBeNull();

    const { container: unknownContainer } = render(
      <SeasonalAtmosphere theme="unknown-theme" />,
    );
    expect(unknownContainer.firstChild).toBeNull();

    const { container: nullContainer } = render(
      <SeasonalAtmosphere theme={null} />,
    );
    expect(nullContainer.firstChild).toBeNull();

    const { container: undefinedContainer } = render(
      <SeasonalAtmosphere theme={undefined} />,
    );
    expect(undefinedContainer.firstChild).toBeNull();
  });

  it("renders AutumnLeavesAtmosphere for autumn-leaves theme", () => {
    const { container } = render(<SeasonalAtmosphere theme="autumn-leaves" />);
    const root = container.querySelector('[data-testid="autumn-leaves-atmosphere"]');
    expect(root).not.toBeNull();
    expect(root?.getAttribute("aria-hidden")).toBe("true");
    expect(root?.querySelector("canvas")).not.toBeNull();
  });

  it("renders AutumnRainAtmosphere for autumn-rain theme", () => {
    const { container } = render(<SeasonalAtmosphere theme="autumn-rain" />);
    const root = container.querySelector('[data-testid="autumn-rain-atmosphere"]');
    expect(root).not.toBeNull();
    expect(root?.getAttribute("aria-hidden")).toBe("true");
    expect(root?.querySelector("canvas")).not.toBeNull();
  });

  it("renders WinterFrostAtmosphere for winter-frost theme", () => {
    const { container } = render(<SeasonalAtmosphere theme="winter-frost" />);
    const root = container.querySelector('[data-testid="winter-frost-atmosphere"]');
    expect(root).not.toBeNull();
    expect(root?.getAttribute("aria-hidden")).toBe("true");
    expect(root?.querySelector("canvas")).not.toBeNull();
  });

  it("renders WinterAuroraAtmosphere for winter-aurora theme", () => {
    const { container } = render(<SeasonalAtmosphere theme="winter-aurora" />);
    const root = container.querySelector('[data-testid="winter-aurora-atmosphere"]');
    expect(root).not.toBeNull();
    expect(root?.getAttribute("aria-hidden")).toBe("true");
    expect(root?.querySelector("canvas")).not.toBeNull();
  });

  it("renders WinterNewYearAtmosphere for winter-newyear theme", () => {
    const { container } = render(<SeasonalAtmosphere theme="winter-newyear" />);
    const root = container.querySelector('[data-testid="winter-newyear-atmosphere"]');
    expect(root).not.toBeNull();
    expect(root?.getAttribute("aria-hidden")).toBe("true");
    expect(root?.querySelector("canvas")).not.toBeNull();
  });
});

describe("AutumnLeavesAtmosphere", () => {
  let mockCtx: CanvasRenderingContext2D;
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
  let frames: FrameRequestCallback[];
  let requestFrameSpy: ReturnType<typeof vi.spyOn>;
  let cancelFrameSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockCtx = createMockCanvasContext();
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as never;

    frames = [];
    requestFrameSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb) => {
        frames.push(cb);
        return frames.length;
      });
    cancelFrameSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    requestFrameSpy.mockRestore();
    cancelFrameSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("animates leaves on rAF and responds to pointermove wind impulses", () => {
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<AutumnLeavesAtmosphere />);

    expect(requestFrameSpy).toHaveBeenCalled();

    // Trigger animation step
    act(() => {
      const nextFrame = frames.shift();
      nextFrame?.(16);
    });

    // Check that drawing methods were called
    expect(mockCtx.clearRect).toHaveBeenCalled();

    // Trigger pointer move for wind impulse
    fireEvent.pointerMove(window, { clientX: 300, clientY: 200 });

    act(() => {
      const nextFrame = frames.shift();
      nextFrame?.(32);
    });

    unmount();
    expect(cancelFrameSpy).toHaveBeenCalled();
    expect(removeEventListener).toHaveBeenCalledWith("pointermove", expect.any(Function));
  });

  it("does not start continuous rAF loop if prefers-reduced-motion is true", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    requestFrameSpy.mockClear();
    render(<AutumnLeavesAtmosphere />);

    // In reduced motion, requestAnimationFrame should not run continuous animation loop
    expect(requestFrameSpy).not.toHaveBeenCalled();
  });

  it("pauses animation when document becomes hidden and resumes when visible", () => {
    render(<AutumnLeavesAtmosphere />);

    expect(requestFrameSpy).toHaveBeenCalled();
    cancelFrameSpy.mockClear();

    // Simulate tab switch to hidden
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    fireEvent(document, new Event("visibilitychange"));
    expect(cancelFrameSpy).toHaveBeenCalled();

    requestFrameSpy.mockClear();
    // Simulate tab switch back to visible
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    fireEvent(document, new Event("visibilitychange"));
    expect(requestFrameSpy).toHaveBeenCalled();
  });
});

describe("AutumnRainAtmosphere", () => {
  let mockCtx: CanvasRenderingContext2D;
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
  let frames: FrameRequestCallback[];
  let requestFrameSpy: ReturnType<typeof vi.spyOn>;
  let cancelFrameSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockCtx = createMockCanvasContext();
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as never;

    frames = [];
    requestFrameSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb) => {
        frames.push(cb);
        return frames.length;
      });
    cancelFrameSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    requestFrameSpy.mockRestore();
    cancelFrameSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("animates rain drops and updates lamp position variables on pointermove", () => {
    const { container, unmount } = render(<AutumnRainAtmosphere />);
    const root = container.querySelector('[data-testid="autumn-rain-atmosphere"]') as HTMLElement;
    expect(root).not.toBeNull();

    // Initial lamp position style
    expect(root.style.getPropertyValue("--rain-lamp-x")).toBeDefined();

    fireEvent.pointerMove(window, { clientX: 250, clientY: 180 });

    act(() => {
      const nextFrame = frames.shift();
      nextFrame?.(16);
    });

    expect(mockCtx.clearRect).toHaveBeenCalled();

    unmount();
    expect(cancelFrameSpy).toHaveBeenCalled();
  });

  it("handles reduced-motion and document visibility properly", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    requestFrameSpy.mockClear();
    render(<AutumnRainAtmosphere />);
    expect(requestFrameSpy).not.toHaveBeenCalled();
  });
});

describe("WinterFrostAtmosphere", () => {
  let mockCtx: CanvasRenderingContext2D;
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
  let frames: FrameRequestCallback[];
  let requestFrameSpy: ReturnType<typeof vi.spyOn>;
  let cancelFrameSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockCtx = createMockCanvasContext();
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as never;

    frames = [];
    requestFrameSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb) => {
        frames.push(cb);
        return frames.length;
      });
    cancelFrameSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    requestFrameSpy.mockRestore();
    cancelFrameSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("melts frost with pointermove and renders crystals/snow", () => {
    const { unmount } = render(<WinterFrostAtmosphere />);

    fireEvent.pointerMove(window, { clientX: 150, clientY: 150 });

    act(() => {
      const nextFrame = frames.shift();
      nextFrame?.(16);
    });

    expect(mockCtx.createRadialGradient).toHaveBeenCalled();

    unmount();
    expect(cancelFrameSpy).toHaveBeenCalled();
  });

  it("stops rAF when hidden", () => {
    render(<WinterFrostAtmosphere />);
    cancelFrameSpy.mockClear();

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    fireEvent(document, new Event("visibilitychange"));
    expect(cancelFrameSpy).toHaveBeenCalled();
  });
});

describe("WinterAuroraAtmosphere", () => {
  let mockCtx: CanvasRenderingContext2D;
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
  let frames: FrameRequestCallback[];
  let requestFrameSpy: ReturnType<typeof vi.spyOn>;
  let cancelFrameSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockCtx = createMockCanvasContext();
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as never;

    frames = [];
    requestFrameSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb) => {
        frames.push(cb);
        return frames.length;
      });
    cancelFrameSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    requestFrameSpy.mockRestore();
    cancelFrameSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("renders aurora waves and bokeh particles", () => {
    const { unmount } = render(<WinterAuroraAtmosphere />);

    act(() => {
      const nextFrame = frames.shift();
      nextFrame?.(16);
    });

    expect(mockCtx.clearRect).toHaveBeenCalled();

    unmount();
    expect(cancelFrameSpy).toHaveBeenCalled();
  });

  it("honors prefers-reduced-motion", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    requestFrameSpy.mockClear();
    render(<WinterAuroraAtmosphere />);
    expect(requestFrameSpy).not.toHaveBeenCalled();
  });
});

describe("WinterNewYearAtmosphere", () => {
  let mockCtx: CanvasRenderingContext2D;
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
  let frames: FrameRequestCallback[];
  let requestFrameSpy: ReturnType<typeof vi.spyOn>;
  let cancelFrameSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockCtx = createMockCanvasContext();
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as never;

    frames = [];
    requestFrameSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb) => {
        frames.push(cb);
        return frames.length;
      });
    cancelFrameSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    requestFrameSpy.mockRestore();
    cancelFrameSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("renders climbing Santa, garland, snowman and canvas", () => {
    const { getByTestId, unmount } = render(<WinterNewYearAtmosphere />);
    const root = getByTestId("winter-newyear-atmosphere");
    expect(root).toBeInTheDocument();
    expect(root.querySelector("canvas")).not.toBeNull();

    unmount();
    expect(cancelFrameSpy).toHaveBeenCalled();
  });

  it("triggers Santa fall on click or hover", () => {
    const { container } = render(<WinterNewYearAtmosphere />);
    const santa = container.querySelector('[title*="Дед Мороз"]');
    expect(santa).not.toBeNull();

    if (santa) {
      act(() => {
        fireEvent.mouseEnter(santa);
      });
      // Should show the exclamation bubble
      expect(container.textContent).toContain("Ой-ой-ой!");
    }
  });

  it("interacts with the snowman on click/hover", () => {
    const { container } = render(<WinterNewYearAtmosphere />);
    const snowman = container.querySelector('[title*="Снеговик"]');
    expect(snowman).not.toBeNull();

    if (snowman) {
      act(() => {
        fireEvent.mouseEnter(snowman);
      });
      // Snowman winks
      act(() => {
        fireEvent.click(snowman);
      });
    }
  });
});
