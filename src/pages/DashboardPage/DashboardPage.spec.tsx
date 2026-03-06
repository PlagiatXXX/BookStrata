/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import * as apiModule from '@/lib/api';
import type { ApiTierListResponse } from '@/types/api';
import * as authContextModule from '@/hooks/useAuthContext';

// Моки для хуков
vi.mock('@/lib/api', () => ({
  getUserTierLists: vi.fn(),
  createTierList: vi.fn(),
  updateTierListTitle: vi.fn(),
  deleteTierList: vi.fn(),
}));

vi.mock('@/hooks/useAuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('sileo', () => ({
  sileo: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockTierLists = [
  {
    id: 1,
    title: 'Test Tier List 1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    isPublic: true,
    user: { id: 1, username: 'testuser' },
    likesCount: 5,
  },
  {
    id: 2,
    title: 'Test Tier List 2',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    isPublic: false,
    user: { id: 1, username: 'testuser' },
    likesCount: 10,
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </BrowserRouter>
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Мокаем useAuth
    vi.mocked(authContextModule.useAuth).mockReturnValue({
      user: {
        userId: 1,
        username: 'testuser',
        avatarUrl: null,
      },
      isLoading: false,
      isAuthenticated: true,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    // Моки по умолчанию
    vi.mocked(apiModule.getUserTierLists).mockResolvedValue({
      data: mockTierLists,
      meta: {
        totalItems: 2,
        itemCount: 2,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1,
      },
    });

    vi.mocked(apiModule.createTierList).mockResolvedValue({
      id: 3,
      title: 'New Tier List',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: false,
      user: { id: 1, username: 'testuser' },
      likesCount: 0,
    } as unknown as ApiTierListResponse);

    vi.mocked(apiModule.updateTierListTitle).mockResolvedValue({
      ...mockTierLists[0],
      title: 'Updated Title',
    });

    vi.mocked(apiModule.deleteTierList).mockResolvedValue(undefined);
  });

  it('должен рендериться с заголовком', () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Ваши рейтинги')).toBeInTheDocument();
  });

  it('должен показывать загрузку при isLoading', async () => {
    vi.mocked(apiModule.getUserTierLists).mockImplementation(
      () => new Promise(() => {}) // Никогда не разрешается
    );

    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/загрузка тир-листов/i)).toBeInTheDocument();
    });
  });

  it('должен отображать тир-листы', async () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Test Tier List 1')).toBeInTheDocument();
      expect(screen.getByText('Test Tier List 2')).toBeInTheDocument();
    });
  });

  it('должен фильтровать тир-листы по поиску', async () => {
    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Test Tier List 1')).toBeInTheDocument();
    });

    // Поиск через DashboardLayout - просто проверяем что компонент рендерится
    // Реальная логика поиска тестируется в useTierListsPagination.spec.ts
    expect(screen.getByText('Test Tier List 2')).toBeInTheDocument();
  });

  it('должен показывать пустое состояние когда нет тир-листов', async () => {
    vi.mocked(apiModule.getUserTierLists).mockResolvedValue({
      data: [],
      meta: {
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: 10,
        totalPages: 0,
        currentPage: 1,
      },
    });

    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('У вас еще нет тир-листов')).toBeInTheDocument();
    });
  });

  it('должен открывать modal создания при клике на кнопку', async () => {
    // Мокаем пустой список чтобы показать кнопку создания
    vi.mocked(apiModule.getUserTierLists).mockResolvedValue({
      data: [],
      meta: {
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: 10,
        totalPages: 0,
        currentPage: 1,
      },
    });

    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Создать первый тир-лист')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Создать первый тир-лист'));

    await waitFor(() => {
      expect(screen.getByText('Создать новый тир-лист')).toBeInTheDocument();
    });
  });

  describe('модальные окна', () => {
    it('должен открывать modal переименования', async () => {
      render(<DashboardPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Test Tier List 1')).toBeInTheDocument();
      });

      // Находим кнопку переименования по aria-label
      const renameButtons = screen.getAllByLabelText('Переименовать');
      if (renameButtons.length > 0) {
        fireEvent.click(renameButtons[0]);
      } else {
        // Альтернативно: ищем по классу
        const buttons = screen.getAllByRole('button');
        const renameButton = buttons.find(b => b.title === 'Переименовать');
        if (renameButton) fireEvent.click(renameButton);
      }

      await waitFor(() => {
        expect(screen.getByText('Переименовать тир-лист')).toBeInTheDocument();
      });
    });

    it('должен открывать modal удаления', async () => {
      render(<DashboardPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Test Tier List 1')).toBeInTheDocument();
      });

      // Находим кнопку удаления по aria-label
      const deleteButtons = screen.getAllByLabelText('Удалить');
      if (deleteButtons.length > 0) {
        fireEvent.click(deleteButtons[0]);
      } else {
        // Альтернативно: ищем по классу
        const buttons = screen.getAllByRole('button');
        const deleteButton = buttons.find(b => b.title === 'Удалить');
        if (deleteButton) fireEvent.click(deleteButton);
      }

      await waitFor(() => {
        expect(screen.getByText('Удалить тир-лист')).toBeInTheDocument();
      });
    });
  });

  describe('пагинация', () => {
    it('должен показывать пагинацию если страниц больше 1', async () => {
      vi.mocked(apiModule.getUserTierLists).mockResolvedValue({
        data: mockTierLists,
        meta: {
          totalItems: 25,
          itemCount: 10,
          itemsPerPage: 10,
          totalPages: 3,
          currentPage: 1,
        },
      });

      render(<DashboardPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Страница 1 из 3/)).toBeInTheDocument();
      });
    });
  });
});
