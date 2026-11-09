import { describe, it, expect } from 'vitest'
import { formatEventLabel, getEventBadgeStyle, ALL_EVENT_OPTIONS } from './analyticsEvents'

describe('analyticsEvents', () => {
  it('форматирует известные базовые события', () => {
    expect(formatEventLabel('page_view')).toBe('Просмотр страницы')
    expect(formatEventLabel('tierlist_create')).toBe('Создание тир-листа')
  })

  it('форматирует события кликов cta, nav, ui, auth', () => {
    expect(formatEventLabel('cta.dashboard.create_tierlist')).toBe('Создать тир-лист (дашборд)')
    expect(formatEventLabel('nav.main.ratings_books')).toBe('Меню: Книги')
  })

  it('форматирует динамические шаблоны cta.landing.try_template_*', () => {
    expect(formatEventLabel('cta.landing.try_template_12')).toBe('Шаблон тир-листа #12')
  })

  it('человекопонятно форматирует неизвестные события с точечной нотацией', () => {
    expect(formatEventLabel('cta.custom_block.action_btn')).toBe('[Кнопка] custom block: action btn')
    expect(formatEventLabel('nav.custom_menu.link')).toBe('[Навигация] custom menu: link')
  })

  it('возвращает исходную строку для абсолютно произвольных событий без точек', () => {
    expect(formatEventLabel('unknown_raw_event')).toBe('unknown_raw_event')
  })

  it('возвращает цветовой класс для разных категорий событий', () => {
    expect(getEventBadgeStyle('page_view')).toContain('text-blue-400')
    expect(getEventBadgeStyle('cta.dashboard.create_tierlist')).toContain('text-purple-400')
    expect(getEventBadgeStyle('nav.main.ratings_books')).toContain('text-sky-400')
  })

  it('предоставляет упорядоченный список опций для выпадающего списка', () => {
    expect(ALL_EVENT_OPTIONS.length).toBeGreaterThan(20)
    expect(ALL_EVENT_OPTIONS).toContainEqual({ value: 'cta.dashboard.create_tierlist', label: 'Создать тир-лист (дашборд)' })
  })
})
