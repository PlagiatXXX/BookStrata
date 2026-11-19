/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExportModal } from "./ExportModal";

describe("ExportModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("рендерит кнопку «Скачать PNG» когда isOpen = true", () => {
    render(
      <ExportModal
        isOpen={true}
        onClose={vi.fn()}
        onExport={vi.fn()}
      />
    );

    expect(screen.getByText("Скачать PNG")).toBeInTheDocument();
    expect(screen.getByText("Отмена")).toBeInTheDocument();
  });

  it("вызывает onExport с mode: 'download' при клике на «Скачать PNG»", async () => {
    const onExport = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <ExportModal
        isOpen={true}
        onClose={onClose}
        onExport={onExport}
      />
    );

    const downloadBtn = screen.getByText("Скачать PNG");
    fireEvent.click(downloadBtn);

    expect(onExport).toHaveBeenCalledWith({ mode: "download" });
  });

  it("отображает кнопку «Поделиться» если navigator.share доступен", async () => {
    const originalNavigator = window.navigator;
    // Мокаем navigator.share
    Object.defineProperty(window, "navigator", {
      value: {
        ...originalNavigator,
        share: vi.fn(),
        canShare: vi.fn().mockReturnValue(true),
      },
      writable: true,
      configurable: true,
    });

    const onExport = vi.fn().mockResolvedValue(undefined);

    render(
      <ExportModal
        isOpen={true}
        onClose={vi.fn()}
        onExport={onExport}
      />
    );

    const shareBtn = screen.getByText("Поделиться");
    expect(shareBtn).toBeInTheDocument();

    fireEvent.click(shareBtn);
    expect(onExport).toHaveBeenCalledWith({ mode: "share" });

    // Восстанавливаем navigator
    Object.defineProperty(window, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });
});
