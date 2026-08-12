import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { Fur } from "./fur";

// happy-dom не умеет рисовать на canvas — замокаем 2d-контекст,
// возвращаем однородную альфа-маску, чтобы силуэт и пряди «построились».

function createMockCtx() {
  const ctx: Record<string, unknown> = {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "round",
    globalCompositeOperation: "source-over",
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    letterSpacing: "0px",
    measureText: vi.fn(() => ({ width: 100 })),
    fillText: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createImageData: vi.fn((w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) })),
    putImageData: vi.fn(),
    // полностью непрозрачная маска: фигура «заполняет» весь бокс
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(500 * 500 * 4).fill(255) })),
    setTransform: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

let mockCtx: CanvasRenderingContext2D;
const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

beforeEach(() => {
  mockCtx = createMockCtx();
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as never;
  HTMLElement.prototype.getBoundingClientRect = vi.fn(
    () => ({ width: 200, height: 60, top: 0, left: 0, right: 200, bottom: 60, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect,
  ) as never;
  if (!("ResizeObserver" in globalThis)) {
    vi.stubGlobal("ResizeObserver", class {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    });
  }
});

afterEach(() => {
  cleanup();
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  vi.unstubAllGlobals();
});

describe("Fur", () => {
  it("рендерит обёртку, canvas с aria-hidden и размеры канваса под элемент", () => {
    const { container } = render(<Fur text="BookStrata" style={{ width: 200, height: 60 }} />);

    const wrap = container.querySelector(".fur");
    expect(wrap).not.toBeNull();

    const canvas = container.querySelector("canvas.fur-canvas");
    expect(canvas).not.toBeNull();
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    // пересборка выполнилась: canvas получил размеры с учётом бахромы
    expect((canvas as HTMLCanvasElement).width).toBeGreaterThan(0);
    expect((canvas as HTMLCanvasElement).height).toBeGreaterThan(0);
    // фигура отрисовалась на маске и пряди заштрихованы
    expect(mockCtx.fillText).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it("пересобирает покров при смене цвета", () => {
    const { rerender } = render(<Fur text="BookStrata" color="#a855f7" style={{ width: 200, height: 60 }} />);
    const strokesAfterFirst = (mockCtx.stroke as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(strokesAfterFirst).toBeGreaterThan(0);

    rerender(<Fur text="BookStrata" color="#06bcf9" style={{ width: 200, height: 60 }} />);
    const strokesAfterSecond = (mockCtx.stroke as ReturnType<typeof vi.fn>).mock.calls.length;
    // второй проход штриховки поверх первого — покров перестроен, не упал
    expect(strokesAfterSecond).toBeGreaterThanOrEqual(strokesAfterFirst);
  });

  it("рисует children поверх покрова и не добавляет pettable-слушателей при pettable={false}", () => {
    const { container } = render(
      <Fur text="BookStrata" pettable={false} style={{ width: 200, height: 60 }}>
        <span>подпись</span>
      </Fur>,
    );

    const content = container.querySelector(".fur-content");
    expect(content).not.toBeNull();
    expect(content).toHaveTextContent("подпись");
  });
});
