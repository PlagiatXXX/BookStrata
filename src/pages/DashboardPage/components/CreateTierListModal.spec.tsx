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

  it("должен рендерить заголовок и описание с правильным accessibility", () => {
    render(<CreateTierListModal {...defaultProps} />);

    const dialog = screen.getByRole("dialog");
    const title = screen.getByText("Создать новый тир-лист");
    expect(title).toBeInTheDocument();
    expect(title.id).toBe("create-modal-title");
    expect(dialog).toHaveAttribute("aria-labelledby", "create-modal-title");
  });

  it("должен рендерить input с правильными атрибутами", () => {
    render(<CreateTierListModal {...defaultProps} />);

    const input = screen.getByRole("textbox", {
      name: /название тир-листа/i,
    });

    expect(input).toHaveAttribute("maxLength", "50");
    expect(input).toBeEnabled();
  });

  it("должен отображать счётчик символов", () => {
    render(<CreateTierListModal {...defaultProps} createTitle="New List" />);

    expect(screen.getByText("8/50")).toBeInTheDocument();
  });

  it("должен вызывать onTitleChange при вводе текста", () => {
    render(<CreateTierListModal {...defaultProps} />);

    const input = screen.getByRole("textbox", { name: /название тир-листа/i });
    fireEvent.change(input, { target: { value: "New Tier List" } });

    expect(mockOnTitleChange).toHaveBeenCalledWith("New Tier List");
  });

  it("должен вызывать onCreate при нажатии Enter с валидным названием", () => {
    render(<CreateTierListModal {...defaultProps} createTitle="New List" />);

    const input = screen.getByRole("textbox", { name: /название тир-листа/i });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockOnCreate).toHaveBeenCalledWith("New List", "", "default");
  });

  it("не должен вызывать onCreate при нажатии Enter с пустым названием", () => {
    render(<CreateTierListModal {...defaultProps} createTitle="" />);

    const input = screen.getByRole("textbox", { name: /название тир-листа/i });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockOnCreate).not.toHaveBeenCalled();
  });

  it("не должен вызывать onCreate при нажатии Enter с пробелами", () => {
    render(<CreateTierListModal {...defaultProps} createTitle="   " />);

    const input = screen.getByRole("textbox", { name: /название тир-листа/i });
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

    const input = screen.getByRole("textbox", { name: /название тир-листа/i });
    expect(input).toBeDisabled();
  });

  it('должен вызывать onCreate при клике на кнопку "Создать"', () => {
    render(<CreateTierListModal {...defaultProps} createTitle="New List" />);

    const createButton = screen.getByRole("button", { name: /создать/i });
    fireEvent.click(createButton);

    expect(mockOnCreate).toHaveBeenCalledWith("New List", "", "default");
  });

  it('должен вызывать onClose при клике на кнопку "Отмена"', () => {
    render(<CreateTierListModal {...defaultProps} />);

    const cancelButton = screen.getByRole("button", { name: /отмена/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // === Новые тесты сезонных тем (Задача 2) ===

  it("должен рендерить сезонные табы (Классика, Осень, Зима)", () => {
    render(<CreateTierListModal {...defaultProps} />);

    const classicTab = screen.getByRole("tab", { name: /классика/i });
    const autumnTab = screen.getByRole("tab", { name: /осень/i });
    const winterTab = screen.getByRole("tab", { name: /зима/i });

    expect(classicTab).toBeInTheDocument();
    expect(autumnTab).toBeInTheDocument();
    expect(winterTab).toBeInTheDocument();

    expect(classicTab).toHaveAttribute("aria-selected", "true");
    expect(autumnTab).toHaveAttribute("aria-selected", "false");
    expect(winterTab).toHaveAttribute("aria-selected", "false");

    expect(screen.getByText("Классический стиль BookStrata")).toBeInTheDocument();
  });

  it("должен переключать табы и отображать соответствующие карточки", () => {
    render(<CreateTierListModal {...defaultProps} />);

    // Переключаемся на вкладку "Осень"
    const autumnTab = screen.getByRole("tab", { name: /осень/i });
    fireEvent.click(autumnTab);

    expect(autumnTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Золотой листопад")).toBeInTheDocument();
    expect(screen.getByText("Осенний дождь")).toBeInTheDocument();

    // Переключаемся на вкладку "Зима"
    const winterTab = screen.getByRole("tab", { name: /зима/i });
    fireEvent.click(winterTab);

    expect(winterTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Морозные узоры")).toBeInTheDocument();
    expect(screen.getByText("Северное сияние")).toBeInTheDocument();
  });

  it("должен выбирать тему 'autumn-leaves' для администратора и передавать её в onCreate", () => {
    render(<CreateTierListModal {...defaultProps} createTitle="Мой осенний список" isAdmin={true} />);

    // Открываем таб "Осень"
    fireEvent.click(screen.getByRole("tab", { name: /осень/i }));

    // Нажимаем на карточку "Золотой листопад"
    const autumnLeavesCard = screen.getByRole("radio", { name: /золотой листопад/i });
    fireEvent.click(autumnLeavesCard);
    expect(autumnLeavesCard).toHaveAttribute("aria-checked", "true");

    // Нажимаем "Создать"
    const createButton = screen.getByRole("button", { name: /создать/i });
    fireEvent.click(createButton);

    expect(mockOnCreate).toHaveBeenCalledWith("Мой осенний список", "", "autumn-leaves");
  });

  it("должен блокировать тему 'autumn-leaves' и 'winter-newyear' для обычных пользователей", () => {
    render(<CreateTierListModal {...defaultProps} createTitle="Тест блокировки" isAdmin={false} />);

    // Открываем таб "Осень"
    fireEvent.click(screen.getByRole("tab", { name: /осень/i }));

    // Карточка "Золотой листопад" должна быть отключена
    const autumnLeavesCard = screen.getByRole("radio", { name: /золотой листопад/i });
    expect(autumnLeavesCard).toBeDisabled();
    expect(autumnLeavesCard).toHaveAttribute("aria-disabled", "true");

    // По умолчанию в табе Осени для не-админа выбрана открытая "Осенний дождь"
    const autumnRainCard = screen.getByRole("radio", { name: /осенний дождь/i });
    expect(autumnRainCard).toHaveAttribute("aria-checked", "true");

    // Открываем таб "Зима"
    fireEvent.click(screen.getByRole("tab", { name: /зима/i }));
    const newYearCard = screen.getByRole("radio", { name: /новогодняя сказка/i });
    expect(newYearCard).toBeDisabled();
  });

  it("должен выбирать тему 'winter-aurora' и передавать её в onCreate", () => {
    render(<CreateTierListModal {...defaultProps} createTitle="Зимние книги" />);

    // Открываем таб "Зима"
    fireEvent.click(screen.getByRole("tab", { name: /зима/i }));

    // Кликаем по карточке "Северное сияние"
    const auroraCard = screen.getByRole("radio", { name: /северное сияние/i });
    fireEvent.click(auroraCard);
    expect(auroraCard).toHaveAttribute("aria-checked", "true");

    // Нажимаем "Создать"
    const createButton = screen.getByRole("button", { name: /создать/i });
    fireEvent.click(createButton);

    expect(mockOnCreate).toHaveBeenCalledWith("Зимние книги", "", "winter-aurora");
  });

  it("должен выбирать тему 'winter-newyear' в зимнем табе для администратора", () => {
    render(<CreateTierListModal {...defaultProps} createTitle="Новогодние книги" isAdmin={true} />);

    // Открываем таб "Зима"
    fireEvent.click(screen.getByRole("tab", { name: /зима/i }));

    // Кликаем по карточке "Новогодняя сказка"
    const newYearCard = screen.getByRole("radio", { name: /новогодняя сказка/i });
    fireEvent.click(newYearCard);
    expect(newYearCard).toHaveAttribute("aria-checked", "true");

    const createButton = screen.getByRole("button", { name: /создать/i });
    fireEvent.click(createButton);

    expect(mockOnCreate).toHaveBeenCalledWith("Новогодние книги", "", "winter-newyear");
  });

  it("должен инициализировать таб и тему из defaultTheme", () => {
    render(
      <CreateTierListModal
        {...defaultProps}
        createTitle="Уже зимний список"
        defaultTheme="winter-frost"
      />,
    );

    const winterTab = screen.getByRole("tab", { name: /зима/i });
    expect(winterTab).toHaveAttribute("aria-selected", "true");

    const frostCard = screen.getByRole("radio", { name: /морозные узоры/i });
    expect(frostCard).toHaveAttribute("aria-checked", "true");

    const createButton = screen.getByRole("button", { name: /создать/i });
    fireEvent.click(createButton);

    expect(mockOnCreate).toHaveBeenCalledWith("Уже зимний список", "", "winter-frost");
  });
});
