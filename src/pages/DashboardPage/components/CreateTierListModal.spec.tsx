import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreateTierListModal } from "./CreateTierListModal";

const mockOnClose = vi.fn();
const mockOnCreate = vi.fn();
const mockOnTitleChange = vi.fn();

const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
  onCreate: mockOnCreate,
  createTitle: "",
  onTitleChange: mockOnTitleChange,
  isPending: false,
};

describe("CreateTierListModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("должен рендерить заголовок и описание", () => {
    render(<CreateTierListModal {...defaultProps} />);

    expect(screen.getByText("Создать новый тир-лист")).toBeInTheDocument();
    expect(screen.getByText("Введите название для вашего нового рейтинга")).toBeInTheDocument();
  });

  it("должен рендерить input с autoFocus и правильными атрибутами", () => {
    render(<CreateTierListModal {...defaultProps} />);

    const input = screen.getByRole("textbox", {
      name: /название тир-листа/i,
    });

    expect(input).toHaveAttribute("maxLength", "100");
    expect(input).toBeEnabled();
  });

  it("должен отображать счётчик символов", () => {
    render(<CreateTierListModal {...defaultProps} createTitle="New List" />);

    expect(screen.getByText("8/100")).toBeInTheDocument();
  });

  it("должен вызывать onTitleChange при вводе текста", () => {
    render(<CreateTierListModal {...defaultProps} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "New Tier List" } });

    expect(mockOnTitleChange).toHaveBeenCalledWith("New Tier List");
  });

  it("должен вызывать onCreate при нажатии Enter с валидным названием", () => {
    render(<CreateTierListModal {...defaultProps} createTitle="New List" />);

    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockOnCreate).toHaveBeenCalledWith("New List");
  });

  it("не должен вызывать onCreate при нажатии Enter с пустым названием", () => {
    render(<CreateTierListModal {...defaultProps} createTitle="" />);

    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockOnCreate).not.toHaveBeenCalled();
  });

  it("не должен вызывать onCreate при нажатии Enter с пробелами", () => {
    render(<CreateTierListModal {...defaultProps} createTitle="   " />);

    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockOnCreate).not.toHaveBeenCalled();
  });

  it('не должен отключать кнопку "Создать" с пустым названием (валидация при клике)', () => {
    render(<CreateTierListModal {...defaultProps} createTitle="" />);

    const createButton = screen.getByRole("button", { name: /создать/i });
    expect(createButton).toBeEnabled();
  });

  it('должен отключать кнопку "Создать" во время создания', () => {
    render(
      <CreateTierListModal {...defaultProps} createTitle="List" isPending />,
    );

    const createButton = screen.getByRole("button", { name: /создание/i });
    expect(createButton).toBeDisabled();
  });

  it('должен отключать кнопку "Отмена" во время создания', () => {
    render(
      <CreateTierListModal {...defaultProps} createTitle="List" isPending />,
    );

    const cancelButton = screen.getByRole("button", { name: /отмена/i });
    expect(cancelButton).toBeDisabled();
  });

  it("должен отключать кнопку закрытия во время создания", () => {
    render(
      <CreateTierListModal {...defaultProps} createTitle="List" isPending />,
    );

    const closeButton = screen.getByLabelText("Закрыть");
    expect(closeButton).toBeDisabled();
  });

  it("должен отключать input во время создания", () => {
    render(
      <CreateTierListModal {...defaultProps} createTitle="List" isPending />,
    );

    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
  });

  it('должен вызывать onCreate при клике на кнопку "Создать"', () => {
    render(<CreateTierListModal {...defaultProps} createTitle="New List" />);

    const createButton = screen.getByRole("button", { name: /создать/i });
    fireEvent.click(createButton);

    expect(mockOnCreate).toHaveBeenCalledWith("New List");
  });

  it('должен вызывать onClose при клике на кнопку "Отмена"', () => {
    render(<CreateTierListModal {...defaultProps} />);

    const cancelButton = screen.getByRole("button", { name: /отмена/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
