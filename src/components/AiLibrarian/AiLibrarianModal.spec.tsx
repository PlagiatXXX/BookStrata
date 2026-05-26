import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AiLibrarianModal } from './AiLibrarianModal'

const mockUseAiLibrarian = vi.fn()

vi.mock('@/hooks/useAiLibrarian', () => ({
  useAiLibrarian: () => mockUseAiLibrarian(),
}))

vi.mock('@/hooks/useAuthContext', () => ({
  useAuth: () => ({
    user: { avatarUrl: null, username: 'test' },
  }),
}))

beforeEach(() => {
  mockUseAiLibrarian.mockReturnValue({
    messages: [],
    isStreaming: false,
    streamingContent: '',
    error: null,
    status: 'online',
    sendMessage: vi.fn(),
    clearMessages: vi.fn(),
    refreshStatus: vi.fn(),
  })
})

describe('AiLibrarianModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <AiLibrarianModal isOpen={false} onClose={() => {}} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders the modal when open', () => {
    render(<AiLibrarianModal isOpen={true} onClose={() => {}} />)
    expect(screen.getByRole('heading', { level: 2 })).toBeDefined()
  })

  it('shows the empty state message', () => {
    render(<AiLibrarianModal isOpen={true} onClose={() => {}} />)
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
    })
    render(<AiLibrarianModal isOpen={true} onClose={() => {}} />)
    expect(screen.getByText(/AI-библиотекарь недоступен/i)).toBeDefined()
  })

  it('renders the input field', () => {
    render(<AiLibrarianModal isOpen={true} onClose={() => {}} />)
    expect(
      screen.getByPlaceholderText('Спроси у библиотекаря...'),
    ).toBeDefined()
  })

  it('shows online status badge', () => {
    render(<AiLibrarianModal isOpen={true} onClose={() => {}} />)
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
    })
    render(<AiLibrarianModal isOpen={true} onClose={() => {}} />)
    expect(screen.getByText('OFFLINE')).toBeDefined()
  })

  it('renders the send button', () => {
    render(<AiLibrarianModal isOpen={true} onClose={() => {}} />)
    expect(screen.getByLabelText('Отправить сообщение')).toBeDefined()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<AiLibrarianModal isOpen={true} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Закрыть'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disables send button when input is empty', () => {
    render(<AiLibrarianModal isOpen={true} onClose={() => {}} />)
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
    })
    render(<AiLibrarianModal isOpen={true} onClose={() => {}} />)
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
    })
    render(<AiLibrarianModal isOpen={true} onClose={() => {}} />)
    expect(screen.getByText('Проверить ещё раз')).toBeDefined()
  })
})
