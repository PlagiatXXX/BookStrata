// src/pages/AdminCollectionsPage/components/WysiwygEditor.spec.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WysiwygEditor } from "./WysiwygEditor";

describe("WysiwygEditor", () => {
  it("показывает кнопку «Загрузить файл» только при переданном onUploadImage", () => {
    render(
      <WysiwygEditor
        value=""
        onChange={vi.fn()}
        onUploadImage={vi.fn()}
      />,
    );
    expect(screen.getByTitle("Загрузить файл")).toBeTruthy();
  });

  it("не показывает кнопку «Загрузить файл» без onUploadImage", () => {
    render(<WysiwygEditor value="" onChange={vi.fn()} />);
    expect(screen.queryByTitle("Загрузить файл")).toBeNull();
  });

  it("всегда показывает кнопку «По URL»", () => {
    render(<WysiwygEditor value="" onChange={vi.fn()} />);
    expect(screen.getByTitle("Вставить изображение по URL")).toBeTruthy();
  });
});
