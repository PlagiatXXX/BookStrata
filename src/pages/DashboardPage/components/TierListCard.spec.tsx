import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TierListCard } from './TierListCard';
import { MAX_BOOKS_PER_TIER_LIST } from '@/constants/limits';

describe('TierListCard', () => {
  const mockTierList = {
    id: 1,
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

  it('renders progress bar with correct ARIA attributes', () => {
    render(<TierListCard {...mockProps} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeDefined();
    expect(progressBar.getAttribute('aria-valuenow')).toBe('5');
    expect(progressBar.getAttribute('aria-valuemin')).toBe('0');
    expect(progressBar.getAttribute('aria-valuemax')).toBe(String(MAX_BOOKS_PER_TIER_LIST));
    expect(progressBar.getAttribute('aria-valuetext')).toBe(`5 из ${MAX_BOOKS_PER_TIER_LIST} книг`);
    expect(progressBar.getAttribute('aria-label')).toBe('Прогресс заполнения тир-листа');
  });
});
