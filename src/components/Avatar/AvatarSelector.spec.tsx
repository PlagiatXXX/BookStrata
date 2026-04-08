/// <reference types="vitest/globals" />

import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AvatarSelector } from "./AvatarSelector";
import * as avatarApi from "@/lib/avatarApi";

vi.mock("@/lib/avatarApi", () => ({
  apiGenerateAvatar: vi.fn(),
  apiGetAvatarLimit: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("AvatarSelector", () => {
  const originalImage = globalThis.Image;

  beforeEach(() => {
    vi.clearAllMocks();

    class MockImage {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;

      set src(_value: string) {
        setTimeout(() => {
          this.onload?.();
        }, 0);
      }
    }

    vi.stubGlobal("Image", MockImage);

    vi.mocked(avatarApi.apiGetAvatarLimit).mockResolvedValue({
      used: 0,
      limit: 50,
      remaining: 10,
      isPro: true,
    });
  });

  afterEach(() => {
    vi.stubGlobal("Image", originalImage);
  });

  it("shows loading states for generation and saving", async () => {
    let resolveGenerate:
      | ((value: { success: boolean; imageUrl: string; remaining: number }) => void)
      | undefined;
    let resolveSave: (() => void) | undefined;

    vi.mocked(avatarApi.apiGenerateAvatar).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGenerate = resolve;
        }),
    );

    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    const onClose = vi.fn();

    render(
      <AvatarSelector
        username="tester"
        onSave={onSave}
        onClose={onClose}
      />,
      { wrapper: createWrapper() },
    );

    fireEvent.click(screen.getByRole("tab", { name: /ai генерация/i }));
    fireEvent.change(screen.getByLabelText(/опишите ваш аватар/i), {
      target: { value: "neon fox" },
    });
    fireEvent.click(screen.getByRole("button", { name: /сгенерировать/i }));

    expect(avatarApi.apiGenerateAvatar).toHaveBeenCalledWith("neon fox");
    expect(screen.getAllByText("Генерируем...").length).toBeGreaterThan(0);

    resolveGenerate?.({
      success: true,
      imageUrl: "https://example.com/avatar.png",
      remaining: 9,
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /сохранить/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /сохранить/i }));

    expect(onSave).toHaveBeenCalledWith("https://example.com/avatar.png");
    expect(screen.getAllByText("Сохраняем...").length).toBeGreaterThan(0);

    resolveSave?.();

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
