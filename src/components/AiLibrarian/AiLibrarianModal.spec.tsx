import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AiLibrarianModal } from './AiLibrarianModal'

const mockUseAiLibrarian = vi.fn()

vi.mock('@/hooks/useAiLibrarian', () => ({
  useAiLibrarian: () => mockUseAiLibrarian(),
}))

vi.mock('@/hooks/useAuthContext', () => ({
  useAuth: () => ({
    user: { avatarUrl: null, username: 'test' },
    isAuthenticated: true,
  }),
}))

function withRouter(ui: ReactNode) {
  return <MemoryRouter>{ui}</MemoryRouter>
}

beforeEach(() => {
  mockUseAiLibrarian.mockReturnValue({
    messages: [],
    isStreaming: false,
    streamingContent: '',
    error: null,
    status: 'online',
    sendMessage: vi.fn(),
    retryLastMessage: vi.fn(),
    editLastMessage: vi.fn(),
    clearMessages: vi.fn(),
    refreshStatus: vi.fn(),
    switchSession: vi.fn(),
    activeSessionKey: '__global',
  })
})

describe('AiLibrarianModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      withRouter(<AiLibrarianModal isOpen={false} onClose={() => {}} />),
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders the modal when open', () => {
    render(withRouter(<AiLibrarianModal isOpen={true} onClose={() => {}} />))
    expect(screen.getByRole('heading', { level: 2 })).toBeDefined()
  })

  it('shows the empty state message', () => {
    render(withRouter(<AiLibrarianModal isOpen={true} onClose={() => {}} />))
    expect(
      screen.getByText(/проанализирую твои тир-листы/i),
    ).toBeDefined()
  })

  it('shows offline state when AI is unavailable', () => {
    mockUseAiLibrarian.mockReturnValue({
      messages: [],
      isStreaming: false,
      streamingContent: '',
      error: null,
      status: 'offline',
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      refreshStatus: vi.fn(),
      switchSession: vi.fn(),
      activeSessionKey: '__global',
    })
    render(withRouter(<AiLibrarianModal isOpen={true} onClose={() => {}} />))
    expect(screen.getByText(/Букстраж недоступен/i)).toBeDefined()
  })

  it('renders the input field', () => {
    render(withRouter(<AiLibrarianModal isOpen={true} onClose={() => {}} />))
    expect(
      screen.getByPlaceholderText('Спроси у библиотекаря...'),
    ).toBeDefined()
  })

  it('shows online status badge', () => {
    render(withRouter(<AiLibrarianModal isOpen={true} onClose={() => {}} />))
    expect(screen.getByText('ONLINE')).toBeDefined()
  })

  it('shows offline status badge when AI is down', () => {
    mockUseAiLibrarian.mockReturnValue({
      messages: [],
      isStreaming: false,
      streamingContent: '',
      error: null,
      status: 'offline',
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      refreshStatus: vi.fn(),
      switchSession: vi.fn(),
      activeSessionKey: '__global',
    })
    render(withRouter(<AiLibrarianModal isOpen={true} onClose={() => {}} />))
    expect(screen.getByText('OFFLINE')).toBeDefined()
  })

  it('renders the send button', () => {
    render(withRouter(<AiLibrarianModal isOpen={true} onClose={() => {}} />))
    expect(screen.getByLabelText('Отправить сообщение')).toBeDefined()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(withRouter(<AiLibrarianModal isOpen={true} onClose={onClose} />))
    fireEvent.click(screen.getByLabelText('Закрыть'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disables send button when input is empty', () => {
    render(withRouter(<AiLibrarianModal isOpen={true} onClose={() => {}} />))
    const sendButton = screen.getByLabelText('Отправить сообщение')
    expect(sendButton).toBeDisabled()
  })

  it('shows clear button when messages exist', () => {
    mockUseAiLibrarian.mockReturnValue({
      messages: [{ role: 'user', content: 'test' }],
      isStreaming: false,
      streamingContent: '',
      error: null,
      status: 'online',
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      refreshStatus: vi.fn(),
      switchSession: vi.fn(),
      activeSessionKey: '__global',
    })
    render(withRouter(<AiLibrarianModal isOpen={true} onClose={() => {}} />))
    expect(screen.getByLabelText('Очистить диалог')).toBeDefined()
  })

  it('shows reconnect button when offline', () => {
    mockUseAiLibrarian.mockReturnValue({
      messages: [],
      isStreaming: false,
      streamingContent: '',
      error: null,
      status: 'offline',
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      refreshStatus: vi.fn(),
      switchSession: vi.fn(),
      activeSessionKey: '__global',
    })
    render(withRouter(<AiLibrarianModal isOpen={true} onClose={() => {}} />))
    expect(screen.getByText('Проверить ещё раз')).toBeDefined()
  })

  it('рендерит интерактивную карточку ошибки с кнопками повтора и редактирования', () => {
    const retryLastMessage = vi.fn()
    const editLastMessage = vi.fn().mockReturnValue('Мой вопрос по книгам')

    mockUseAiLibrarian.mockReturnValue({
      messages: [{ role: 'user', content: 'Мой вопрос по книгам' }],
      isStreaming: false,
      streamingContent: '',
      error: 'Букстраж сейчас на перерыве. Постучись через минуту.',
      status: 'online',
      sendMessage: vi.fn(),
      retryLastMessage,
      editLastMessage,
      clearMessages: vi.fn(),
      refreshStatus: vi.fn(),
      switchSession: vi.fn(),
      activeSessionKey: '__global',
    })

    render(withRouter(<AiLibrarianModal isOpen={true} onClose={() => {}} />))

    expect(screen.getByText(/Букстраж сейчас на перерыве/i)).toBeInTheDocument()
    const retryBtn = screen.getByRole('button', { name: /Повторить запрос/i })
    const editBtn = screen.getByRole('button', { name: /Редактировать/i })

    expect(retryBtn).toBeInTheDocument()
    expect(editBtn).toBeInTheDocument()

    // Клик на повторить
    fireEvent.click(retryBtn)
    expect(retryLastMessage).toHaveBeenCalledTimes(1)

    // Клик на редактировать
    fireEvent.click(editBtn)
    expect(editLastMessage).toHaveBeenCalledTimes(1)
    const textarea = screen.getByPlaceholderText('Спроси у библиотекаря...') as HTMLTextAreaElement
    expect(textarea.value).toBe('Мой вопрос по книгам')
  })

  it('рендерит приветствие и чипсы Книжного ДНК при pageType reading-dna', () => {
    render(
      withRouter(
        <AiLibrarianModal
          isOpen={true}
          onClose={() => {}}
          context={{ pageType: 'reading-dna', ticketNumber: 'DNA-42' }}
        />,
      ),
    )

    expect(screen.getByText(/литературный ДНК/i)).toBeInTheDocument()
    expect(screen.getByText(/Разбери мой читательский архетип/i)).toBeInTheDocument()
    expect(screen.getByText(/Посоветуй книги под мои 6 осей ДНК/i)).toBeInTheDocument()
    expect(screen.getByText(/Что почитать взамен моего криптонита/i)).toBeInTheDocument()
  })

  it('рендерит приветствие и чипсы тир-листа с подсказкой про страницу билета при pageType tier-list', () => {
    render(
      withRouter(
        <AiLibrarianModal
          isOpen={true}
          onClose={() => {}}
          context={{ pageType: 'tier-list', tierListId: 'tl-99' }}
        />,
      ),
    )

    expect(screen.getByText(/книги в этом тир-листе/i)).toBeInTheDocument()
    expect(screen.getByText(/на странице читательского билета/i)).toBeInTheDocument()
    expect(screen.getByText(/Оцени расстановку книг в этом тир-листе/i)).toBeInTheDocument()
  })
})
