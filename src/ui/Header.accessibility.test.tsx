import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from './Header';
import * as authContextModule from '../hooks/useAuthContext';

vi.mock('../hooks/useAuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('Header Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('должен иметь правильные aria-label для кнопок профиля (авторизован)', () => {
    vi.mocked(authContextModule.useAuth).mockReturnValue({
      user: { userId: 1, username: 'testuser', avatarUrl: null },
      isLoading: false,
      isAuthenticated: true,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // Кнопка профиля (десктоп и мобилка)
    const profileButtons = screen.getAllByLabelText('Профиль');
    expect(profileButtons.length).toBeGreaterThan(0);
  });
});
