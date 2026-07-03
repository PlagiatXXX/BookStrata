// src/components/AuthorInput/AuthorInput.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { searchAuthors, type AuthorResult } from '@/lib/authorsApi'

interface AuthorInputProps {
  value: string
  onChange: (value: string) => void
  maxLength?: number
  className?: string
  placeholder?: string
  inputClass?: string
}

export default function AuthorInput({
  value,
  onChange,
  maxLength = 100,
  className = '',
  placeholder = 'Автор книги',
  inputClass = '',
}: AuthorInputProps) {
  const [suggestions, setSuggestions] = useState<AuthorResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Поиск авторов с debounce
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    setLoading(true)
    try {
      const results = await searchAuthors(query.trim())
      setSuggestions(results)
      setShowDropdown(results.length > 0)
      setActiveIndex(-1)
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChange(val)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300)
  }

  const handleSelect = (author: AuthorResult) => {
    onChange(author.name)
    setShowDropdown(false)
    setSuggestions([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        )
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          handleSelect(suggestions[activeIndex])
        }
        break
      case 'Escape':
        setShowDropdown(false)
        break
    }
  }

  // Клик вне дропдауна закрывает его
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        id="book-author-input"
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setShowDropdown(true)
        }}
        maxLength={maxLength}
        className={`${inputClass} focus-visible:ring-2 focus-visible:ring-cyan-400`}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
          ...
        </span>
      )}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded border-2 border-black bg-[#1a1a1a] shadow-lg"
        >
          {suggestions.map((author, index) => (
            <button
              key={author.id}
              type="button"
              className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                index === activeIndex
                  ? 'bg-cyan-600 text-white'
                  : 'text-gray-200 hover:bg-gray-800'
              }`}
              onClick={() => handleSelect(author)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="font-medium">{author.name}</span>
              <span className="ml-2 text-[10px] text-gray-400">
                {author.bookCount} {author.bookCount === 1 ? 'книга' : author.bookCount < 5 ? 'книги' : 'книг'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
