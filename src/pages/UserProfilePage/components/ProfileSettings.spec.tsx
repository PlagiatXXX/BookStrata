import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { sileo } from "sileo";
import type { User } from "@/lib/userApi";
import { ProfileSettings } from "./ProfileSettings";

const m = vi.hoisted(() => ({
  state: {
    isEditingUsername: false,
    newUsername: "",
    isSavingUsername: false,
    showPasswordForm: false,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    showPasswords: { current: false, new: false, confirm: false },
    isChangingPassword: false,
  },
  actions: {
    startEditUsername: vi.fn(),
    cancelEditUsername: vi.fn(),
    saveUsername: vi.fn().mockResolvedValue(undefined),
    setNewUsername: vi.fn(),
    togglePasswordForm: vi.fn(),
    cancelPasswordChange: vi.fn(),
    changePassword: vi.fn(),
    setCurrentPassword: vi.fn(),
    setNewPassword: vi.fn(),
    setConfirmPassword: vi.fn(),
    setShowPasswords: vi.fn(),
  },
  updateProfile: vi.fn(),
  apiGetGenrePreferences: vi.fn(),
  apiSetGenrePreferences: vi.fn(),
  onAvatar: vi.fn(),
  onRefresh: vi.fn(),
}));

vi.mock("@/pages/ProfilePage/hooks/useProfileActions", () => ({
  useProfileActions: () => ({ ...m.state, ...m.actions }),
}));

vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ updateProfile: m.updateProfile }),
}));

vi.mock("@/hooks/useAuthContext", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock("@/lib/userApi", () => ({
  apiGetGenrePreferences: m.apiGetGenrePreferences,
  apiSetGenrePreferences: m.apiSetGenrePreferences,
}));

vi.mock("@/components/Avatar", () => ({
  AvatarSelector: () => <div data-testid="avatar-selector">Выбор аватара</div>,
}));

vi.mock("@/components/AmbientSound/AmbientSettingsModal", () => ({
  AmbientSettingsModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="ambient-modal">Настройки плеера</div> : null,
}));

vi.mock("sileo", () => ({
  sileo: { success: vi.fn(), error: vi.fn() },
}));

const user: User = {
  id: 1,
  email: "reader@example.com",
  username: "reader",
  avatarUrl: null,
  bio: "Люблю книги",
  socialLinks: [],
  role: "user",
  isDonor: false,
  createdAt: "2024-01-01T00:00:00.000Z",
};

function renderSettings(initialSection?: "genres" | "social") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ProfileSettings
        user={user}
        onAvatar={m.onAvatar}
        onRefresh={m.onRefresh}
        initialSection={initialSection}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(m.state, {
    isEditingUsername: false,
    newUsername: "",
    isSavingUsername: false,
    showPasswordForm: false,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    showPasswords: { current: false, new: false, confirm: false },
    isChangingPassword: false,
  });
  m.apiGetGenrePreferences.mockResolvedValue([]);
  m.apiSetGenrePreferences.mockResolvedValue([]);
  m.updateProfile.mockResolvedValue(undefined);
});

describe("ProfileSettings", () => {
  it("показывает аккаунт, email, жанры и соцсети", async () => {
    renderSettings();

    expect(screen.getByText("Аккаунт · виден только вам")).toBeInTheDocument();
    expect(screen.getByText("reader@example.com")).toBeInTheDocument();
    expect(screen.getByText("Любимые жанры")).toBeInTheDocument();
    expect(screen.getByTestId("settings-social")).toBeInTheDocument();
    expect(await screen.findByText("0/9")).toBeInTheDocument();
  });

  it("инлайн-редактор ника вызывает экшены и onRefresh после сохранения", async () => {
    m.state.isEditingUsername = true;
    m.state.newUsername = "newreader";
    renderSettings();

    const account = screen.getByTestId("settings-account");
    const input = within(account).getByDisplayValue("newreader");
    fireEvent.change(input, { target: { value: "newname" } });
    expect(m.actions.setNewUsername).toHaveBeenCalledWith("newname");

    fireEvent.click(within(account).getByRole("button", { name: "Сохранить" }));
    expect(m.actions.saveUsername).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(m.onRefresh).toHaveBeenCalledTimes(1));
  });

  it("кнопка «Изменить» ника вызывает startEditUsername", () => {
    renderSettings();

    fireEvent.click(
      within(screen.getByTestId("settings-account")).getByRole("button", {
        name: "Изменить",
      }),
    );
    expect(m.actions.startEditUsername).toHaveBeenCalledTimes(1);
  });

  it("аватар вызывает onAvatar и открывает AvatarSelector", () => {
    renderSettings();

    fireEvent.click(
      within(screen.getByTestId("settings-account")).getByRole("button", {
        name: /Аватар/,
      }),
    );
    expect(m.onAvatar).toHaveBeenCalledTimes(1);
  });

  it("пароль вызывает togglePasswordForm и показывает форму", () => {
    m.state.showPasswordForm = true;
    renderSettings();

    fireEvent.click(
      within(screen.getByTestId("settings-account")).getByRole("button", {
        name: /Пароль/,
      }),
    );
    expect(m.actions.togglePasswordForm).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Смена пароля")).toBeInTheDocument();
  });

  it("плеер открывает AmbientSettingsModal", () => {
    renderSettings();

    fireEvent.click(
      within(screen.getByTestId("settings-account")).getByRole("button", {
        name: /Плеер/,
      }),
    );
    expect(screen.getByTestId("ambient-modal")).toBeInTheDocument();
  });

  it("сохранение соцсетей вызывает updateProfile и onRefresh", async () => {
    renderSettings();

    const social = screen.getByTestId("settings-social");
    fireEvent.click(
      within(social).getByRole("button", { name: /Добавить соцсеть/ }),
    );

    const inputs = within(social).getAllByPlaceholderText("https://t.me/username");
    fireEvent.change(inputs[inputs.length - 1], {
      target: { value: "t.me/newreader" },
    });
    fireEvent.click(within(social).getByRole("button", { name: "Сохранить" }));

    await waitFor(() =>
      expect(m.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          socialLinks: [{ platform: "telegram", url: "https://t.me/newreader" }],
        }),
      ),
    );
    expect(m.onRefresh).toHaveBeenCalled();
    expect(sileo.success).toHaveBeenCalled();
  });

  it("initialSection=\"social\" фокусирует блок соцсетей", async () => {
    renderSettings("social");

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByTestId("settings-social")),
    );
  });

  it("initialSection=\"genres\" фокусирует блок жанров", async () => {
    renderSettings("genres");

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByTestId("settings-genres")),
    );
  });
});
