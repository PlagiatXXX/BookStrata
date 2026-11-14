import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import AdminSupportPage from "./AdminSupportPage";
import * as supportApi from "@/lib/supportApi";

vi.mock("@/lib/supportApi", () => ({
  apiAdminGetSupportThreads: vi.fn(),
  apiAdminGetThreadMessages: vi.fn(),
  apiAdminReplySupportThread: vi.fn(),
  apiAdminDeleteSupportMessage: vi.fn(),
  apiAdminDeleteSupportThread: vi.fn(),
  apiAdminUpdateSupportThreadStatus: vi.fn(),
}));

describe("AdminSupportPage", () => {
  let queryClient: QueryClient;

  const renderComponent = () => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminSupportPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supportApi.apiAdminGetSupportThreads).mockResolvedValue({
      threads: [
        {
          id: 1,
          userId: 10,
          guestToken: null,
          status: "open",
          unreadByUser: 0,
          unreadByAdmin: 1,
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: { id: 10, username: "reader123", email: "reader@test.com" },
          messages: [{ id: 100, text: "Вопрос по функционалу", senderRole: "user", createdAt: new Date().toISOString() } as any],
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
    });

    vi.mocked(supportApi.apiAdminGetThreadMessages).mockResolvedValue({
      thread: {
        id: 1,
        userId: 10,
        guestToken: null,
        status: "open",
        unreadByUser: 0,
        unreadByAdmin: 0,
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: { id: 10, username: "reader123", email: "reader@test.com" },
      },
      messages: [
        {
          id: 100,
          threadId: 1,
          senderRole: "user",
          senderId: 10,
          text: "Вопрос по функционалу",
          replyToId: null,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  });

  it("renders page header and thread in the list", async () => {
    renderComponent();

    expect(screen.getByText("Поддержка пользователей")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("reader123")).toBeInTheDocument();
      expect(screen.getByText("Вопрос по функционалу")).toBeInTheDocument();
    });
  });

  it("selects thread and sends reply", async () => {
    vi.mocked(supportApi.apiAdminReplySupportThread).mockResolvedValue({
      message: { id: 101 } as any,
      thread: { id: 1 } as any,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("reader123")).toBeInTheDocument();
    });

    // Кликаем по диалогу
    fireEvent.click(screen.getByText("reader123"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Напишите ответ пользователю/i)).toBeInTheDocument();
    });

    // Вводим ответ
    const input = screen.getByPlaceholderText(/Напишите ответ пользователю/i);
    fireEvent.change(input, { target: { value: "Ответ от админа" } });

    // Отправляем
    const sendBtn = screen.getByLabelText("Отправить ответ");
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(supportApi.apiAdminReplySupportThread).toHaveBeenCalledWith(1, {
        text: "Ответ от админа",
        replyToId: undefined,
      });
    });
  });

  it("allows deleting single message with confirm modal", async () => {
    vi.mocked(supportApi.apiAdminDeleteSupportMessage).mockResolvedValue();

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("reader123")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("reader123"));

    await waitFor(() => {
      expect(screen.getByLabelText("Удалить сообщение")).toBeInTheDocument();
    });

    // Кликаем удалить сообщение
    fireEvent.click(screen.getByLabelText("Удалить сообщение"));

    // Проверяем открытие модалки
    expect(screen.getByText("Удалить сообщение?")).toBeInTheDocument();

    // Подтверждаем
    const confirmBtn = screen.getByRole("button", { name: "Удалить" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(supportApi.apiAdminDeleteSupportMessage).toHaveBeenCalledWith(100);
    });
  });

  it("allows clearing whole thread with confirm modal", async () => {
    vi.mocked(supportApi.apiAdminDeleteSupportThread).mockResolvedValue();

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("reader123")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("reader123"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Очистить чат" })).toBeInTheDocument();
    });

    // Кликаем очистить чат
    fireEvent.click(screen.getByRole("button", { name: "Очистить чат" }));

    // Проверяем открытие модалки
    expect(screen.getByText("Очистить и удалить весь диалог?")).toBeInTheDocument();

    // Подтверждаем
    const confirmBtn = screen.getByRole("button", { name: "Очистить и удалить" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(supportApi.apiAdminDeleteSupportThread).toHaveBeenCalledWith(1);
    });
  });
});
