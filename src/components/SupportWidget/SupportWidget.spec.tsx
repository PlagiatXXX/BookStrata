import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SupportWidget } from "./SupportWidget";
import * as useSupportChatModule from "@/hooks/useSupportChat";
import * as analyticsApi from "@/lib/analyticsApi";

vi.mock("@/lib/analyticsApi", () => ({
  apiTrackEvent: vi.fn(),
}));

describe("SupportWidget", () => {
  const mockSendMessage = vi.fn();
  const mockMarkAsRead = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useSupportChatModule, "useSupportChat").mockReturnValue({
      thread: null,
      messages: [],
      unreadCount: 0,
      isLoading: false,
      refetch: vi.fn(),
      sendMessage: mockSendMessage,
      isSending: false,
      markAsRead: mockMarkAsRead,
    } as any);
  });

  it("renders floating button with correct aria-label", () => {
    render(<SupportWidget />);
    expect(screen.getByLabelText("Поддержка и связь с нами")).toBeInTheDocument();
  });

  it("displays unread badge when unreadCount > 0", () => {
    vi.spyOn(useSupportChatModule, "useSupportChat").mockReturnValue({
      thread: null,
      messages: [],
      unreadCount: 3,
      isLoading: false,
      refetch: vi.fn(),
      sendMessage: mockSendMessage,
      isSending: false,
      markAsRead: mockMarkAsRead,
    } as any);

    render(<SupportWidget />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("opens chat window and tracks analytics on click", () => {
    render(<SupportWidget />);
    const btn = screen.getByLabelText("Поддержка и связь с нами");
    fireEvent.click(btn);

    expect(screen.getByText("Поддержка BookStrata")).toBeInTheDocument();
    expect(analyticsApi.apiTrackEvent).toHaveBeenCalledWith("support.chat_opened");
  });

  it("displays messages, allows reply and sends message", async () => {
    vi.spyOn(useSupportChatModule, "useSupportChat").mockReturnValue({
      thread: null,
      messages: [
        {
          id: 1,
          threadId: 10,
          senderRole: "admin",
          senderId: 1,
          text: "Чем вам помочь?",
          replyToId: null,
          createdAt: new Date().toISOString(),
        },
      ],
      unreadCount: 0,
      isLoading: false,
      refetch: vi.fn(),
      sendMessage: mockSendMessage,
      isSending: false,
      markAsRead: mockMarkAsRead,
    } as any);

    render(<SupportWidget />);
    fireEvent.click(screen.getByLabelText("Поддержка и связь с нами"));

    expect(screen.getByText("Чем вам помочь?")).toBeInTheDocument();
    expect(screen.getByText("Команда BookStrata")).toBeInTheDocument();

    // Нажимаем «Ответить»
    const replyBtn = screen.getByLabelText("Ответить");
    fireEvent.click(replyBtn);

    expect(screen.getByText("Ответ на:")).toBeInTheDocument();

    // Пишем ответ
    const input = screen.getByPlaceholderText("Напишите сообщение...");
    fireEvent.change(input, { target: { value: "Вопрос по сайту" } });

    // Отправляем
    const submitBtn = screen.getByLabelText("Отправить сообщение");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith("Вопрос по сайту", 1);
    });
  });

  it("calls onOpenFeedbackSurvey when survey link is clicked", () => {
    const onOpen = vi.fn();
    render(<SupportWidget onOpenFeedbackSurvey={onOpen} />);
    fireEvent.click(screen.getByLabelText("Поддержка и связь с нами"));

    const surveyBtn = screen.getByText("Оценить сайт или оставить отзыв");
    fireEvent.click(surveyBtn);

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("применяет адаптивные классы позиционирования для кнопки и окна чата", () => {
    render(<SupportWidget />);
    const buttonContainer = screen.getByLabelText("Поддержка и связь с нами").parentElement;
    expect(buttonContainer).toHaveClass("support-widget-bottom");

    // Открываем чат
    fireEvent.click(screen.getByLabelText("Поддержка и связь с нами"));
    const chatWindow = screen.getByText("Поддержка BookStrata").closest(".fixed");
    expect(chatWindow).toHaveClass("support-chat-bottom");
  });
});
