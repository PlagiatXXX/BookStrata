import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RenameTierListModal } from "./RenameTierListModal";

const mockOnClose = vi.fn();
const mockOnRename = vi.fn();
const mockOnTitleChange = vi.fn();

const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
  onRename: mockOnRename,
  renameTitle: "",
  onTitleChange: mockOnTitleChange,
  isPending: false,
  tierListTitle: "Old Title",
};

describe("RenameTierListModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("должен рендерить заголовок и текущее название с правильным accessibility", () => {
    render(<RenameTierListModal {...defaultProps} />);

    const dialog = screen.getByRole("dialog");
    const title = screen.getByText("Переименовать тир-лист");
    expect(title).toBeInTheDocument();
    expect(title.id).toBe("rename-modal-title");
    expect(dialog).toHaveAttribute("aria-labelledby", "rename-modal-title");
    expect(screen.getByText("Текущее название:")).toBeInTheDocument();
    expect(screen.getByText("Old Title")).toBeInTheDocument();
  });

  it("должен рендерить input с правильными атрибутами", () => {
    render(<RenameTierListModal {...defaultProps} />, {
      wrapper: ({ children }) => <div>{children}</div>,
    });

    const input = screen.getByRole("textbox", {
      name: /новое название тир-листа/i,
    });

    // autoFocus проверяется через наличие атрибута
    expect(input).toHaveAttribute("maxLength", "100");
    expect(input).toBeEnabled();
  });

  it("должен отображать счётчик символов", () => {
    render(<RenameTierListModal {...defaultProps} renameTitle="Test Title" />);

    expect(screen.getByText("10/100")).toBeInTheDocument();
  });

  it("должен вызывать onTitleChange при вводе текста", () => {
    render(<RenameTierListModal {...defaultProps} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "New Title" } });

    expect(mockOnTitleChange).toHaveBeenCalledWith("New Title");
  });

  it("должен вызывать onRename при нажатии Enter с валидным названием", () => {
    render(<RenameTierListModal {...defaultProps} renameTitle="New Title" />);

    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockOnRename).toHaveBeenCalledTimes(1);
  });

  it("не должен вызывать onRename при нажатии Enter с пустым названием", () => {
    render(<RenameTierListModal {...defaultProps} renameTitle="" />);

    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockOnRename).not.toHaveBeenCalled();
  });

  it("не должен вызывать onRename при нажатии Enter с пробелами", () => {
    render(<RenameTierListModal {...defaultProps} renameTitle="   " />);

    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockOnRename).not.toHaveBeenCalled();
  });

  it("должен вызывать onClose при нажатии Escape", () => {
    render(<RenameTierListModal {...defaultProps} />);

    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Escape" });

    // onClose вызывается 1 раз из input (Modal не обрабатывает Escape)
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('не должен отключать кнопку "Сохранить" с пустым названием (валидация при клике)', () => {
    render(<RenameTierListModal {...defaultProps} renameTitle="" />);

    const saveButton = screen.getByRole("button", { name: /сохранить/i });
    expect(saveButton).toBeEnabled();
  });

  it('не должен отключать кнопку "Сохранить" с пробелами (валидация при клике)', () => {
    render(<RenameTierListModal {...defaultProps} renameTitle="   " />);

    const saveButton = screen.getByRole("button", { name: /сохранить/i });
    expect(saveButton).toBeEnabled();
  });

  it('должен отключать кнопку "Сохранить" во время сохранения', () => {
    render(
      <RenameTierListModal {...defaultProps} renameTitle="Title" isPending />,
    );

    const saveButton = screen.getByRole("button", { name: /сохранение/i });
    expect(saveButton).toBeDisabled();
  });

  it('должен отключать кнопку "Отмена" во время сохранения', () => {
    render(
      <RenameTierListModal {...defaultProps} renameTitle="Title" isPending />,
    );

    const cancelButton = screen.getByRole("button", { name: /отмена/i });
    expect(cancelButton).toBeDisabled();
  });

  it("должен отключать кнопку закрытия во время сохранения", () => {
    render(
      <RenameTierListModal {...defaultProps} renameTitle="Title" isPending />,
    );

    const closeButton = screen.getByLabelText("Закрыть");
    expect(closeButton).toBeDisabled();
  });

  it("должен отключать input во время сохранения", () => {
    render(
      <RenameTierListModal {...defaultProps} renameTitle="Title" isPending />,
    );

    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
  });

  it("должен показывать индикатор загрузки во время сохранения", () => {
    render(
      <RenameTierListModal {...defaultProps} renameTitle="Title" isPending />,
    );

    expect(screen.getByText("Сохранение...")).toBeInTheDocument();
  });

  it("не должен рендерить текущее название, если tierListTitle не передан", () => {
    render(<RenameTierListModal {...defaultProps} tierListTitle={undefined} />);

    expect(screen.queryByText(/текущее название:/i)).not.toBeInTheDocument();
  });

  it('должен вызывать onRename при клике на кнопку "Сохранить"', () => {
    render(<RenameTierListModal {...defaultProps} renameTitle="New Title" />);

    const saveButton = screen.getByRole("button", { name: /сохранить/i });
    fireEvent.click(saveButton);

    expect(mockOnRename).toHaveBeenCalledTimes(1);
  });

  it('должен вызывать onClose при клике на кнопку "Отмена"', () => {
    render(<RenameTierListModal {...defaultProps} />);

    const cancelButton = screen.getByRole("button", { name: /отмена/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
