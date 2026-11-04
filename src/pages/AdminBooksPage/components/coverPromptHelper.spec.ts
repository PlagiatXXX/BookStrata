import { describe, it, expect } from "vitest";
import { buildBookAnimationPrompt, buildBookAnimationSpecs } from "./coverPromptHelper";

describe("coverPromptHelper", () => {
  it("генерирует режиссерский промпт с названием книги и автором", () => {
    const prompt = buildBookAnimationPrompt("Дюна", "Фрэнк Герберт");
    expect(prompt).toContain("«Дюна» автора Фрэнк Герберт");
    expect(prompt).toContain("СТРОГО вертикальные 2:3");
    expect(prompt).toContain("Transformational Fair Use");
    expect(prompt).toContain("ОЖИВЛЯЙ ИЗОБРАЖЕНИЕ, НЕ ПЕРЕСОЗДАВАЙ ЕГО");
  });

  it("корректно работает без указания автора", () => {
    const prompt = buildBookAnimationPrompt("Сказки");
    expect(prompt).toContain("«Сказки»");
    expect(prompt).toContain("СТРОГО вертикальные 2:3");
  });

  it("генерирует краткие техпараметры", () => {
    const specs = buildBookAnimationSpecs();
    expect(specs).toContain("2:3");
    expect(specs).toContain("540×810");
    expect(specs).toContain("no-audio");
  });
});
