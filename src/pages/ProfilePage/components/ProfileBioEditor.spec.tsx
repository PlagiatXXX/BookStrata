import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { sileo } from "sileo";
import { ProfileBioEditor } from "./ProfileBioEditor";

const mockUpdateProfile = vi.fn();

vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ updateProfile: mockUpdateProfile }),
}));

vi.mock("@/lib/logger", async () => {
  const actual = await vi.importActual("@/lib/logger");
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
  return {
    ...(actual as object),
    logger: mockLogger,
    createLogger: vi.fn(() => mockLogger),
  };
});

vi.mock("sileo", () => ({
  sileo: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const baseUser = {
  username: "reader",
  bio: "Люблю книги",
  socialLinks: [{ platform: "telegram", url: "https://t.me/reader" }],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProfileBioEditor", () => {
  it("показывает тост с примером корректной ссылки при произвольном тексте в url", async () => {
    render(<ProfileBioEditor user={baseUser} />);
    fireEvent.click(screen.getByText("Соцсети (1/6)"));

    const urlInput = screen.getByPlaceholderText("https://t.me/username");
    fireEvent.change(urlInput, { target: { value: "произвольный текст" } });
    fireEvent.click(screen.getByText("Готово"));

    await waitFor(() => {
      expect(sileo.error).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Некорректная ссылка",
          description: "Это не похоже на ссылку. Пример: https://t.me/username",
        }),
      );
    });
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it("нормализует ссылку без схемы и сохраняет", async () => {
    mockUpdateProfile.mockResolvedValueOnce(baseUser);
    render(<ProfileBioEditor user={baseUser} />);
    fireEvent.click(screen.getByText("Соцсети (1/6)"));

    const urlInput = screen.getByPlaceholderText("https://t.me/username");
    fireEvent.change(urlInput, { target: { value: "t.me/username" } });
    fireEvent.click(screen.getByText("Готово"));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          socialLinks: [{ platform: "telegram", url: "https://t.me/username" }],
        }),
      );
    });
  });
});