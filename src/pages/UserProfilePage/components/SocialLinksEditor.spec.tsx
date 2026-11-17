import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { sileo } from "sileo";
import { SocialLinksEditor } from "./SocialLinksEditor";
import type { SocialLink } from "@/lib/userApi";

vi.mock("sileo", () => ({
  sileo: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const baseLink: SocialLink = { platform: "telegram", url: "https://t.me/reader" };

function renderEditor(overrides: {
  value?: SocialLink[];
  onChange?: (links: SocialLink[]) => void;
  onSave?: (links: SocialLink[]) => void;
  isSaving?: boolean;
} = {}) {
  const {
    value = [baseLink],
    onChange = vi.fn(),
    onSave = vi.fn(),
    isSaving = false,
  } = overrides;

  // Controlled component: keep real state so edits are reflected, while
  // still exposing spies for assertions.
  function Wrapper() {
    const [links, setLinks] = useState<SocialLink[]>(value);
    return (
      <SocialLinksEditor
        value={links}
        onChange={(next) => {
          setLinks(next);
          onChange(next);
        }}
        onSave={onSave}
        isSaving={isSaving}
      />
    );
  }

  render(<Wrapper />);
  return { onChange, onSave };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SocialLinksEditor", () => {
  it("рендерит строки платформа + ссылка и счётчик «N из 6»", () => {
    renderEditor();

    expect(screen.getByRole("combobox")).toHaveValue("telegram");
    expect(screen.getByDisplayValue("https://t.me/reader")).toBeInTheDocument();
    expect(screen.getByText("1 из 6")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Удалить" })).toBeInTheDocument();
  });

  it("пустой список показывает «+ Добавить соцсеть · 0 из 6»", () => {
    renderEditor({ value: [] });

    expect(screen.getByText("0 из 6")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Добавить соцсеть/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("добавление создаёт новую пустую строку через onChange", () => {
    const { onChange } = renderEditor();

    fireEvent.click(screen.getByRole("button", { name: /Добавить соцсеть/ }));

    expect(onChange).toHaveBeenCalledWith([
      baseLink,
      { platform: "telegram", url: "" },
    ]);
  });

  it("седьмая ссылка не добавляется (лимит 6)", () => {
    const six: SocialLink[] = Array.from({ length: 6 }, (_, i) => ({
      platform: "telegram",
      url: `https://t.me/user${i}`,
    }));
    const { onChange } = renderEditor({ value: six });

    const addButton = screen.getByRole("button", { name: /Добавить соцсеть/ });
    expect(addButton).toBeDisabled();
    fireEvent.click(addButton);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("удаление строки вызывает onChange без неё", () => {
    const { onChange } = renderEditor({
      value: [baseLink, { platform: "github", url: "https://github.com/reader" }],
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Удалить" })[0]);

    expect(onChange).toHaveBeenCalledWith([
      { platform: "github", url: "https://github.com/reader" },
    ]);
  });

  it("невалидный URL не сохраняется и показывает ошибку у строки", () => {
    const { onSave } = renderEditor();

    fireEvent.change(screen.getByDisplayValue("https://t.me/reader"), {
      target: { value: "произвольный текст" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/Некорректная ссылка/)).toBeInTheDocument();
    expect(sileo.error).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Некорректная ссылка" }),
    );
  });

  it("нормализует ссылку без схемы и сохраняет", () => {
    const { onSave } = renderEditor();

    fireEvent.change(screen.getByDisplayValue("https://t.me/reader"), {
      target: { value: "t.me/username" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(onSave).toHaveBeenCalledWith([
      { platform: "telegram", url: "https://t.me/username" },
    ]);
  });

  it("пустые строки не попадают в сохраняемый список", () => {
    const { onSave } = renderEditor({
      value: [baseLink, { platform: "github", url: "" }],
    });

    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(onSave).toHaveBeenCalledWith([baseLink]);
  });

  it("интерактивные элементы не меньше 44 px", () => {
    renderEditor({ value: [] });

    expect(
      screen.getByRole("button", { name: /Добавить соцсеть/ }).style.minHeight,
    ).toBe("44px");
    expect(
      screen.getByRole("button", { name: "Сохранить" }).style.minHeight,
    ).toBe("44px");
  });
});
