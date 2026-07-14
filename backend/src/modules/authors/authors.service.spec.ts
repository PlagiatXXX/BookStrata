import { describe, it, expect } from 'vitest';
import { looksLikeBookTitle } from './authors.service.js';

describe('looksLikeBookTitle', () => {
  describe('реальные имена авторов — должны вернуть false', () => {
    it('обычное русское имя', () => {
      expect(looksLikeBookTitle('Лев Толстой')).toBe(false);
    });

    it('имя с инициалами', () => {
      expect(looksLikeBookTitle('Ф. М. Достоевский')).toBe(false);
    });

    it('полное имя', () => {
      expect(looksLikeBookTitle('Фёдор Достоевский')).toBe(false);
    });

    it('западное имя', () => {
      expect(looksLikeBookTitle('J.K. Rowling')).toBe(false);
    });

    it('японское имя', () => {
      expect(looksLikeBookTitle('Haruki Murakami')).toBe(false);
    });

    it('длинное имя (до 100 символов)', () => {
      const longName = 'Александр Сергеевич Пушкин';
      expect(longName.length).toBeLessThan(100);
      expect(looksLikeBookTitle(longName)).toBe(false);
    });

    it('апостроф в имени', () => {
      expect(looksLikeBookTitle("O'Brien")).toBe(false);
    });

    it('дефис в имени', () => {
      expect(looksLikeBookTitle('Салтыков-Щедрин')).toBe(false);
    });
  });

  describe('названия книг — должны вернуть true', () => {
    it('кавычки-ёлочки в названии', () => {
      expect(looksLikeBookTitle('Жареные зеленые помидоры в кафе «Полустанок»')).toBe(true);
    });

    it('ещё название с ёлочками', () => {
      expect(looksLikeBookTitle('Повесть о Ферме-На-Холме')).toBe(false);
    });

    it('название с кавычками в начале', () => {
      expect(looksLikeBookTitle('«Война и мир»')).toBe(true);
    });

    it('имя длиннее 100 символов', () => {
      const veryLong = 'Очень длинное название книги, которое явно не является именем автора, потому что никто так не называется, это просто книга с очень длинным названием';
      expect(veryLong.length).toBeGreaterThan(100);
      expect(looksLikeBookTitle(veryLong)).toBe(true);
    });

    it('имя с переносом строки', () => {
      expect(looksLikeBookTitle('Автор\nс переносом')).toBe(true);
    });
  });

  describe('граничные случаи', () => {
    it('пустая строка после trim', () => {
      expect(looksLikeBookTitle('   ')).toBe(false);
    });

    it('пустая строка', () => {
      expect(looksLikeBookTitle('')).toBe(false);
    });

    it('короткое имя', () => {
      expect(looksLikeBookTitle('Имя')).toBe(false);
    });
  });
});
