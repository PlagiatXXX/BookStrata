import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TemplateCard from './TemplateCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as authContextModule from '@/hooks/useAuthContext';

vi.mock('@/hooks/useAuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockTemplate = {
  id: '1',
  title: 'Test Template',
  description: 'Test Description',
  tiers: [{ id: '1', name: 'S', color: '#ff0000', order: 0 }],
  defaultBooks: [],
  isPublic: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  likesCount: 0,
};

const queryClient = new QueryClient();

describe('TemplateCard Accessibility', () => {
  it('должен иметь правильные aria-label для кнопок редактирования и удаления', () => {
    vi.mocked(authContextModule.useAuth).mockReturnValue({
      user: { userId: 1, username: 'testuser', avatarUrl: null },
      isLoading: false,
      isAuthenticated: true,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TemplateCard
            template={mockTemplate}
            onEdit={onEdit}
            onDelete={onDelete}
            showEditDelete={true}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByLabelText('Редактировать шаблон')).toBeInTheDocument();
    expect(screen.getByLabelText('Удалить шаблон')).toBeInTheDocument();
  });
});
