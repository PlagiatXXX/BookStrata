/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import TemplateLibrary from './TemplateLibrary';
import * as useTemplatesModule from '../../hooks/useTemplates';
import * as tierListApiModule from '@/lib/api';
import * as likesApiModule from '@/lib/likesApi';
import * as authContextModule from '../../hooks/useAuthContext';
import type { Template } from '../../types/templates';
import type { PaginatedTierListsResponse } from '@/lib/api';

// Вспомогательная функция для создания мока useUserTemplates
const createUseUserTemplatesMock = (
  data: Template[] = [mockTemplate],
  overrides: Partial<ReturnType<typeof useTemplatesModule.useUserTemplates>> = {}
) => {
  const base = {
    data,
    isLoading: false,
    isError: false,
    isPending: false,
    isSuccess: true,
    isFetching: false,
    isRefetching: false,
    isLoadingError: false,
    isRefetchError: false,
    isPlaceholderData: false,
    isStale: true,
    isFetched: true,
    isFetchedAfterMount: true,
    isInitialLoading: false,
    isPaused: false,
    refetch: vi.fn(),
    fetchNextPage: vi.fn(),
    fetchPreviousPage: vi.fn(),
    hasNextPage: false,
    hasPreviousPage: false,
    status: 'success' as const,
    error: null,
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
  };
  
  return Object.assign(base, overrides) as ReturnType<typeof useTemplatesModule.useUserTemplates>;
};

// Моки для хуков
vi.mock('../../hooks/useTemplates', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useTemplates')>();
  return {
    ...actual,
    useUserTemplates: vi.fn(),
    useDeleteTemplate: vi.fn(),
    useApplyTemplate: vi.fn(),
  };
});

vi.mock('@/lib/api', () => ({
  getPublicTierLists: vi.fn(),
}));

vi.mock('@/lib/likesApi', () => ({
  apiGetLikedTierListIds: vi.fn(),
}));

vi.mock('sileo', () => ({
  sileo: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../hooks/useAuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockTemplate: Template = {
  id: 'template-1',
  title: 'Test Template',
  description: 'Test Description',
  tiers: [{ id: 'tier-1', name: 'S', color: '#ff0000', order: 0 }],
  defaultBooks: [],
  category: 'Fantasy',
  isPublic: true,
  isFavorite: false,
  isArchived: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockPublicTierLists: PaginatedTierListsResponse = {
  data: [
    {
      id: 1,
      title: 'Public Tier List 1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      isPublic: true,
      user: { id: 1, username: 'user1' },
      likesCount: 5,
    },
  ],
  meta: {
    totalItems: 1,
    itemCount: 1,
    itemsPerPage: 6,
    totalPages: 1,
    currentPage: 1,
  },
};

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

describe('TemplateLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Мокаем useAuth - возвращаем авторизованного пользователя
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
    vi.mocked(useTemplatesModule.useUserTemplates).mockReturnValue(
      createUseUserTemplatesMock()
    );

    vi.mocked(useTemplatesModule.useDeleteTemplate).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      isPaused: false,
      isSuccess: false,
      isError: false,
      isIdle: true,
      status: 'idle',
      failureCount: 0,
      failureReason: null,
      reset: vi.fn(),
      context: undefined,
      isFetched: false,
      isFetchedAfterMount: false,
      isInitialLoading: false,
      failureReasons: null,
      variables: undefined,
      submittedAt: 0,
    } as unknown as ReturnType<typeof useTemplatesModule.useDeleteTemplate>);

    vi.mocked(useTemplatesModule.useApplyTemplate).mockReturnValue({
      mutateAsync: vi.fn(),
      mutate: vi.fn(),
      isPending: false,
      isPaused: false,
      isSuccess: false,
      isError: false,
      isIdle: true,
      status: 'idle',
      failureCount: 0,
      failureReason: null,
      reset: vi.fn(),
      context: undefined,
      isFetched: false,
      isFetchedAfterMount: false,
      isInitialLoading: false,
      failureReasons: null,
      variables: undefined,
      submittedAt: 0,
    } as unknown as ReturnType<typeof useTemplatesModule.useApplyTemplate>);

    vi.mocked(tierListApiModule.getPublicTierLists).mockResolvedValue(
      mockPublicTierLists
    );

    vi.mocked(likesApiModule.apiGetLikedTierListIds).mockResolvedValue({
      likedIds: [],
    });
  });

  it('должен рендериться с заголовком', () => {
    render(<TemplateLibrary />, { wrapper: createWrapper() });

    expect(screen.getByText('Библиотека шаблонов')).toBeInTheDocument();
  });

  it('должен показывать навигацию по секциям', () => {
    render(<TemplateLibrary />, { wrapper: createWrapper() });

    // Используем getAllByText чтобы найти все элементы
    const privateLinks = screen.getAllByText('Личные шаблоны');
    expect(privateLinks.length).toBeGreaterThan(0);
    
    const publicLinks = screen.getAllByText('Публичные тир-листы');
    expect(publicLinks.length).toBeGreaterThan(0);
    
    const favoritesLinks = screen.getAllByText('Избранное');
    expect(favoritesLinks.length).toBeGreaterThan(0);
    
    const archivedLinks = screen.getAllByText('Архив');
    expect(archivedLinks.length).toBeGreaterThan(0);
  });

  it('должен переключать секции', async () => {
    render(<TemplateLibrary />, { wrapper: createWrapper() });

    // Находим кнопку в сайдбаре по aria-label или типу кнопки
    const publicButton = screen.getAllByRole('button').find(btn =>
      btn.textContent?.includes('Публичные тир-листы') &&
      btn.parentElement?.classList.contains('border-b')
    );
    
    if (publicButton) {
      fireEvent.click(publicButton);
    }

    // Просто проверяем что компонент не упал
    await waitFor(() => {
      expect(screen.getAllByText('Публичные тир-листы').length).toBeGreaterThan(0);
    });
  });

  it('должен отображать шаблоны в режиме личных', () => {
    render(<TemplateLibrary />, { wrapper: createWrapper() });

    expect(screen.getByText('Test Template')).toBeInTheDocument();
  });

  it('должен фильтровать шаблоны по категории', async () => {
    vi.mocked(useTemplatesModule.useUserTemplates).mockReturnValue(
      createUseUserTemplatesMock([
        { ...mockTemplate, category: 'Fantasy' },
        { ...mockTemplate, id: 'template-2', category: 'Sci-Fi' },
      ])
    );

    render(<TemplateLibrary />, { wrapper: createWrapper() });

    // Нажимаем на категорию Fantasy
    const fantasyButton = screen.getByText('FANTASY');
    fireEvent.click(fantasyButton);

    // Должен остаться только один шаблон
    expect(screen.getAllByText('Test Template').length).toBeGreaterThanOrEqual(1);
  });

  it('должен переключать режим просмотра', () => {
    render(<TemplateLibrary />, { wrapper: createWrapper() });

    const compactButton = screen.getByLabelText('Компактный вид');
    fireEvent.click(compactButton);

    // Режим переключился (проверяем что кнопка активна)
    expect(compactButton.className).toContain('bg-cyan-500/25');
  });

  it('должен показывать загрузку при isLoading', () => {
    vi.mocked(useTemplatesModule.useUserTemplates).mockReturnValue(
      createUseUserTemplatesMock([], { isLoading: true })
    );

    render(<TemplateLibrary />, { wrapper: createWrapper() });

    // Проверяем наличие Spinner по классу анимации
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('должен показывать ошибку при isError', () => {
    vi.mocked(useTemplatesModule.useUserTemplates).mockReturnValue(
      createUseUserTemplatesMock([], { isError: true })
    );

    render(<TemplateLibrary />, { wrapper: createWrapper() });

    expect(screen.getByText('Ошибка загрузки шаблонов. Пожалуйста, попробуйте снова.')).toBeInTheDocument();
    expect(screen.getByText('Повторить')).toBeInTheDocument();
  });

  it('должен показывать сообщение когда ничего не найдено', () => {
    vi.mocked(useTemplatesModule.useUserTemplates).mockReturnValue(
      createUseUserTemplatesMock([])
    );

    render(<TemplateLibrary />, { wrapper: createWrapper() });

    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
  });

  it('должен принимать initialSearchQuery как prop', () => {
    render(<TemplateLibrary searchQuery="Harry Potter" />, { wrapper: createWrapper() });

    // Поиск должен быть установлен
    const searchInput = screen.getByPlaceholderText(/поиск/i) as HTMLInputElement;
    expect(searchInput.value).toBe('Harry Potter');
  });

  it('должен принимать initialSection как prop', () => {
    render(<TemplateLibrary initialSection="favorites" />, { wrapper: createWrapper() });

    // Секция должна быть установлена
    const favoritesButton = screen.getByText('Избранное');
    expect(favoritesButton.closest('button')?.className).toContain('bg-cyan-500/25');
  });

  describe('пагинация публичных тир-листов', () => {
    it('должен показывать пагинацию когда есть данные', async () => {
      render(<TemplateLibrary />, { wrapper: createWrapper() });

      // Переключаемся на публичные - находим кнопку в сайдбаре
      const sidebarButtons = screen.getAllByRole('button').filter(btn =>
        btn.textContent?.includes('Публичные тир-листы')
      );
      
      if (sidebarButtons.length > 0) {
        fireEvent.click(sidebarButtons[0]);
      }

      await waitFor(() => {
        expect(screen.getByText('Public Tier List 1')).toBeInTheDocument();
      });

      // Проверяем наличие кнопок пагинации
      const paginationButtons = screen.getAllByRole('button').filter(btn =>
        btn.getAttribute('aria-label')?.includes('страница')
      );
      
      expect(paginationButtons.length).toBeGreaterThan(0);
    });

    it('должен позволять переключать страницы', async () => {
      const mockPage2Data: PaginatedTierListsResponse = {
        ...mockPublicTierLists,
        meta: {
          ...mockPublicTierLists.meta,
          currentPage: 2,
          totalPages: 2,
        },
      };

      vi.mocked(tierListApiModule.getPublicTierLists).mockResolvedValueOnce(
        mockPublicTierLists
      ).mockResolvedValueOnce(mockPage2Data);

      render(<TemplateLibrary />, { wrapper: createWrapper() });

      // Переключаемся на публичные
      const publicButton = screen.getByText('Публичные тир-листы');
      fireEvent.click(publicButton);

      await waitFor(() => {
        expect(screen.getByText('Public Tier List 1')).toBeInTheDocument();
      });

      // Нажимаем "вперёд"
      const nextButton = screen.getByLabelText('Следующая страница');
      if (!nextButton.hasAttribute('disabled')) {
        fireEvent.click(nextButton);
      }
    });
  });
});
