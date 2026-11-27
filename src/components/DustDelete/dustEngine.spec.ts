import { describe, it, expect } from "vitest";
import {
  createSpring,
  stepSpring,
  createDustBatch,
  startBatchReassemble,
  stepAndRenderBatches,
} from "./dustEngine";

describe("dustEngine", () => {
  it("сходится к целевому значению на пружине 260/22", () => {
    const s = createSpring(0, 260, 22);
    s.t = 1;
    for (let i = 0; i < 120; i++) {
      stepSpring(s, 1 / 60);
    }
    expect(s.x).toBeCloseTo(1, 2);
  });

  it("двигает частицы влево при распаде и переводит батч в gone после затухания", () => {
    const pixels = new Float32Array([100, 50, 120, 60]);
    const colors = new Uint32Array([0xffffffff, 0xff00ff00]);
    const batch = createDustBatch({
      id: "b1",
      rect: { left: 90, top: 40, width: 100, height: 100 },
      stepPx: 2,
      pixels,
      colors,
      nowSec: 0,
      reduceMotion: true,
    });

    const width = 300;
    const height = 200;
    const buf = new Uint32Array(width * height);

    const aliveAfterStep = stepAndRenderBatches([batch], 0.08, buf, width, height, 1);
    expect(aliveAfterStep).toBe(1);
    expect(batch.px[0]).toBeLessThan(100);

    const aliveAfterFade = stepAndRenderBatches([batch], 0.5, buf, width, height, 1);
    expect(aliveAfterFade).toBe(0);
    expect(batch.state).toBe("gone");
  });

  it("переключает батч в состояние back и возвращает частицы в актуальные координаты", () => {
    const pixels = new Float32Array([120, 80]);
    const colors = new Uint32Array([0xffffffff]);
    const batch = createDustBatch({
      id: "book:1",
      rect: { left: 100, top: 60, width: 80, height: 120 },
      stepPx: 2,
      pixels,
      colors,
      nowSec: 0,
      reduceMotion: true,
    });

    const buf = new Uint32Array(400 * 300);
    stepAndRenderBatches([batch], 0.1, buf, 400, 300, 1);
    expect(batch.px[0]).toBeLessThan(120);

    startBatchReassemble(
      batch,
      { left: 110, top: 65, width: 80, height: 120 },
      0.1,
      true,
    );
    expect(batch.state).toBe("back");
    expect(batch.hx[0]).toBe(130);
    expect(batch.hy[0]).toBe(85);

    stepAndRenderBatches([batch], 0.8, buf, 400, 300, 1);
    expect(batch.px[0]).toBeCloseTo(130, 1);
    expect(batch.py[0]).toBeCloseTo(85, 1);
    expect(batch.state).toBe("restored");
  });
});
