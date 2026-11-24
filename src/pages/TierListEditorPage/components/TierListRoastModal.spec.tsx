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
    localStorage.clear()
  })

  it('renders loading state initially with friendly disclaimer card, then displays roast result', async () => {
    vi.mocked(aiLibrarianApi.roastTierList).mockResolvedValueOnce({
      archetype: 'Сноб-трагик',
      roast: 'Вы выстроили этот рейтинг, чтобы казаться глубже всех.',
      hotTake: 'Сумерки в D-тире — никто не сомневался.',
      cynicismScore: 84,
    })

    render(<TierListRoastModal {...defaultProps} />)

    expect(screen.getByText(/Сканирую/i)).toBeInTheDocument()
    expect(screen.getByText(/Минутка спокойствия, пока кипят литературные страсти/i)).toBeInTheDocument()
    expect(screen.getByText(/Эта прожарка — чистый юмор/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Сноб-трагик')).toBeInTheDocument()
    })

    expect(screen.getByText(/Вы выстроили этот рейтинг/)).toBeInTheDocument()
    expect(screen.getByText(/Сумерки в D-тире/)).toBeInTheDocument()
    expect(screen.getByText('84%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Перепрожарить тир-лист/i })).toBeInTheDocument()
  })

  it('loads saved roast from localStorage without calling api', () => {
    const savedRoast = {
      archetype: 'Архивный Читатель',
      roast: 'Старая добрая прожарка из памяти.',
      hotTake: 'Слишком предсказуемо.',
      cynicismScore: 60,
    }
    const key = 'bs_roast_id_list-123'
    localStorage.setItem(key, JSON.stringify(savedRoast))

    render(<TierListRoastModal {...defaultProps} tierListId="list-123" />)

    expect(screen.getByText('Архивный Читатель')).toBeInTheDocument()
    expect(screen.getByText(/Старая добрая прожарка из памяти/)).toBeInTheDocument()
    expect(aiLibrarianApi.roastTierList).not.toHaveBeenCalled()
  })

  it('allows re-roast when button clicked', async () => {
    const savedRoast = {
      archetype: 'Первый диагноз',
      roast: 'Старый текст.',
      hotTake: 'Старый тейк.',
      cynicismScore: 50,
    }
    const key = 'bs_roast_id_list-123'
    localStorage.setItem(key, JSON.stringify(savedRoast))

    vi.mocked(aiLibrarianApi.roastTierList).mockResolvedValueOnce({
      archetype: 'Второй диагноз',
      roast: 'Свежий обновлённый вердикт.',
      hotTake: 'Новый тейк.',
      cynicismScore: 75,
    })

    render(<TierListRoastModal {...defaultProps} tierListId="list-123" />)

    const reRoastBtn = screen.getByRole('button', { name: /Перепрожарить тир-лист/i })
    fireEvent.click(reRoastBtn)

    await waitFor(() => {
      expect(screen.getByText('Второй диагноз')).toBeInTheDocument()
    })

    expect(screen.getByText(/Свежий обновлённый вердикт/)).toBeInTheDocument()
    expect(aiLibrarianApi.roastTierList).toHaveBeenCalledTimes(1)
  })

  it('disables re-roast button and displays countdown when cooldown active', () => {
    const savedRoast = {
      archetype: 'Первый диагноз',
      roast: 'Старый текст.',
      hotTake: 'Старый тейк.',
      cynicismScore: 50,
    }
    localStorage.setItem('bs_roast_id_list-123', JSON.stringify(savedRoast))
    // 2 попытки сделаны минуту назад
    const twoMinutesAgo = Date.now() - 60 * 1000
    localStorage.setItem('bs_roast_attempts', JSON.stringify([twoMinutesAgo, twoMinutesAgo]))

    render(<TierListRoastModal {...defaultProps} tierListId="list-123" />)

    const reRoastBtn = screen.getByRole('button', { name: /Перепрожарить \(через/i })
    expect(reRoastBtn).toBeDisabled()
    expect(screen.getByText(/Лимит: 2 попытки подряд/i)).toBeInTheDocument()
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
