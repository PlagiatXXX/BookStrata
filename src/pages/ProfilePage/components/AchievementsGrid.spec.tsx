import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AchievementsGrid } from './AchievementsGrid';

const mockAchievements = [
  { id: '1', title: 'Achievement A', description: 'Desc A', xpValue: 10, isEarned: false, earnedAt: null, isSecret: false },
  { id: '2', title: 'Achievement B', description: 'Desc B', xpValue: 10, isEarned: true, earnedAt: '2023-01-01', isSecret: false },
  { id: '3', title: 'Achievement C', description: 'Desc C', xpValue: 10, isEarned: false, earnedAt: null, isSecret: false },
  { id: '4', title: 'Achievement D', description: 'Desc D', xpValue: 10, isEarned: true, earnedAt: '2023-01-01', isSecret: false },
  { id: '5', title: 'Achievement E', description: 'Desc E', xpValue: 10, isEarned: false, earnedAt: null, isSecret: false },
  { id: '6', title: 'Achievement F', description: 'Desc F', xpValue: 10, isEarned: true, earnedAt: '2023-01-01', isSecret: false },
  { id: '7', title: 'Achievement G', description: 'Desc G', xpValue: 10, isEarned: false, earnedAt: null, isSecret: false },
  { id: '8', title: 'Achievement H', description: 'Desc H', xpValue: 10, isEarned: false, earnedAt: null, isSecret: false },
];

describe('AchievementsGrid', () => {
  it('should render loading state', () => {
    render(<AchievementsGrid achievements={[]} isLoading={true} />);
    const loaders = document.querySelectorAll('.animate-pulse');
    expect(loaders.length).toBe(6);
  });

  it('should sort earned achievements first and limit to 6 by default', () => {
    render(<AchievementsGrid achievements={mockAchievements} isLoading={false} />);

    // Total 8 achievements, but only 6 should be visible initially
    const visibleAchievementTitles = screen.getAllByRole('heading', { level: 4 });
    expect(visibleAchievementTitles.length).toBe(6);

    // Achievement B, D, F are earned and should be visible
    expect(screen.getByText('Achievement B')).toBeInTheDocument();
    expect(screen.getByText('Achievement D')).toBeInTheDocument();
    expect(screen.getByText('Achievement F')).toBeInTheDocument();

    // Achievement G and H should NOT be visible initially
    expect(screen.queryByText('Achievement G')).not.toBeInTheDocument();
    expect(screen.queryByText('Achievement H')).not.toBeInTheDocument();
  });

  it('should toggle expansion when clicking "Show More"', async () => {
    render(<AchievementsGrid achievements={mockAchievements} isLoading={false} />);

    const toggleButton = screen.getByText('Показать еще');
    fireEvent.click(toggleButton);

    expect(screen.getByText('Скрыть')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 4 }).length).toBe(8);
    expect(screen.getByText('Achievement G')).toBeInTheDocument();
    expect(screen.getByText('Achievement H')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Скрыть'));
    expect(screen.getByText('Показать еще')).toBeInTheDocument();

    // Wait for the exit animation to finish or just check that items are eventually gone
    await waitFor(() => {
        expect(screen.queryByText('Achievement G')).not.toBeInTheDocument();
        expect(screen.queryByText('Achievement H')).not.toBeInTheDocument();
    });

    expect(screen.getAllByRole('heading', { level: 4 }).length).toBe(6);
  });
});
