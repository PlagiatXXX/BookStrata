// src/pages/AdminBooksPage/components/ReadingProfilePrompt.spec.ts
import { describe, it, expect } from "vitest";
import { buildPrompt } from "./ReadingProfilePrompt";

describe("buildPrompt (Reading DNA, админка)", () => {
  const prompt = buildPrompt({
    title: "Тест",
    author: "Автор",
    genre: "Фэнтези",
    tags: ["магия"],
    description: "Описание",
  });

  it("содержит genreConfidence", () => {
    expect(prompt).toContain("genreConfidence");
    expect(prompt).toContain('"genreConfidence": <число 0–1>');
    expect(prompt).toContain("точность жанра");
  });

  it("сохраняет старые оси", () => {
    expect(prompt).toContain("storyFocus");
    expect(prompt).toContain("complexity");
  });
});
