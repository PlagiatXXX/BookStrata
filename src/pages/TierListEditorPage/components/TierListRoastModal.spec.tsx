import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TierListRoastModal } from './TierListRoastModal'
import * as aiLibrarianApi from '@/lib/aiLibrarianApi'

vi.mock('@/lib/aiLibrarianApi', () => ({
  roastTierList: vi.fn(),
}))

vi.mock('sileo', () => ({
  sileo: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('TierListRoastModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    tierListTitle: 'Мой любимый топ',
    tiers: [
      {
        id: 'tier-s',
        title: 'S',
        color: '#ff7f7f',
        bookIds: ['b1', 'b2'],
      },
      {
        id: 'tier-d',
        title: 'D',
        color: '#7fbfff',
        bookIds: ['b3', 'b4'],
      },
    ],
    books: {
      b1: { id: 'b1', title: 'Война и мир', author: 'Лев Толстой', coverImageUrl: '' },
      b2: { id: 'b2', title: 'Преступление и наказание', author: 'Фёдор Достоевский', coverImageUrl: '' },
      b3: { id: 'b3', title: 'Сумерки', author: 'Стефани Майер', coverImageUrl: '' },
      b4: { id: 'b4', title: 'Пятьдесят оттенков серого', author: 'Э. Л. Джеймс', coverImageUrl: '' },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially and then displays roast result', async () => {
    vi.mocked(aiLibrarianApi.roastTierList).mockResolvedValueOnce({
      archetype: 'Сноб-трагик',
      roast: 'Вы выстроили этот рейтинг, чтобы казаться глубже всех.',
      hotTake: 'Сумерки в D-тире — никто не сомневался.',
      cynicismScore: 84,
    })

    render(<TierListRoastModal {...defaultProps} />)

    expect(screen.getByText(/Сканирую/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Сноб-трагик')).toBeInTheDocument()
    })

    expect(screen.getByText(/Вы выстроили этот рейтинг/)).toBeInTheDocument()
    expect(screen.getByText(/Сумерки в D-тире/)).toBeInTheDocument()
    expect(screen.getByText('84%')).toBeInTheDocument()
  })

  it('renders error state and retry button if api fails', async () => {
    vi.mocked(aiLibrarianApi.roastTierList).mockRejectedValueOnce(
      new Error('Букстраж сейчас на перерыве.'),
    )

    render(<TierListRoastModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/Букстраж сейчас на перерыве/i)).toBeInTheDocument()
    })

    const retryBtn = screen.getByRole('button', { name: /Попробовать снова/i })
    expect(retryBtn).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    vi.mocked(aiLibrarianApi.roastTierList).mockReturnValue(new Promise(() => {}))

    render(<TierListRoastModal {...defaultProps} />)

    const closeBtn = screen.getByLabelText(/Закрыть/i)
    fireEvent.click(closeBtn)

    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})
