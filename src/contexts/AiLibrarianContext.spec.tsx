import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { AiLibrarianProvider } from "./AiLibrarianContext";
import { useAiLibrarian } from "@/hooks/useAiLibrarian";
import * as api from "@/lib/aiLibrarianApi";

vi.mock("@/lib/aiLibrarianApi", () => ({
  streamAiChat: vi.fn(),
  checkAiStatus: vi.fn().mockResolvedValue({ online: true }),
}));

describe("AiLibrarianContext — retryLastMessage & editLastMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("editLastMessage удаляет последнее сообщение пользователя, сбрасывает ошибку и возвращает текст", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AiLibrarianProvider>{children}</AiLibrarianProvider>
    );
    const { result } = renderHook(() => useAiLibrarian(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("online"));

    // Имитируем падение стриминга
    vi.mocked(api.streamAiChat).mockRejectedValueOnce(new Error("Сетевой сбой"));

    await act(async () => {
      await result.current.sendMessage("Посоветуй антиутопию");
    });

    expect(result.current.error).toBe("Сетевой сбой");
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]?.content).toBe("Посоветуй антиутопию");

    let text: string | null = null;
    act(() => {
      text = result.current.editLastMessage();
    });

    expect(text).toBe("Посоветуй антиутопию");
    expect(result.current.error).toBeNull();
    expect(result.current.messages).toHaveLength(0);
  });

  it("retryLastMessage повторно вызывает streamAiChat без дублирования сообщения пользователя", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AiLibrarianProvider>{children}</AiLibrarianProvider>
    );
    const { result } = renderHook(() => useAiLibrarian(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("online"));

    vi.mocked(api.streamAiChat).mockRejectedValueOnce(new Error("Сетевой сбой"));

    await act(async () => {
      await result.current.sendMessage("Посоветуй киберпанк");
    });

    expect(result.current.error).toBe("Сетевой сбой");
    expect(result.current.messages).toHaveLength(1);

    // Успешный повторный запуск
    vi.mocked(api.streamAiChat).mockImplementation(async (_msgs, onEvent) => {
      onEvent({ type: "done" });
    });

    await act(async () => {
      await result.current.retryLastMessage();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]?.role).toBe("user");
    expect(result.current.messages[1]?.role).toBe("assistant");
    expect(api.streamAiChat).toHaveBeenCalledTimes(2);
  });
});
