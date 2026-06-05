import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TierListCard } from './TierListCard';

vi.mock('@/hooks/useAuthContext', () => ({
  useAuth: () => ({ user: { isPro: false } }),
}));

describe('TierListCard', () => {
  const mockTierList = {
    id: "1",
    title: 'Test Tier List',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPublic: true,
    booksCount: 5,
  };

  const mockProps = {
    tierList: mockTierList,
    onOpen: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
  };

  it('renders tier list card with basic info', () => {
    render(<TierListCard {...mockProps} />);

    expect(screen.getByText('Test Tier List')).toBeDefined();
    expect(screen.getByText('5 книг')).toBeDefined();
    expect(screen.getByText('Публичный')).toBeDefined();
  });
});
