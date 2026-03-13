import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTierListBooksLimit } from './useTierListBooksLimit';

describe('useTierListBooksLimit', () => {
  it('должен возвращать правильные значения для обычного пользователя (0 книг)', () => {
    const { result } = renderHook(() =>
      useTierListBooksLimit({ booksCount: 0 })
    );

    expect(result.current.booksCount).toBe(0);
    expect(result.current.maxBooks).toBe(20);
    expect(result.current.remainingBooks).toBe(20);
    expect(result.current.isAtLimit).toBe(false);
    expect(result.current.progressPercent).toBe(0);
    expect(result.current.canAddMore).toBe(true);
    expect(result.current.isPro).toBe(false);
  });

  it('должен возвращать правильные значения для 10 книг', () => {
    const { result } = renderHook(() =>
      useTierListBooksLimit({ booksCount: 10 })
    );

    expect(result.current.booksCount).toBe(10);
    expect(result.current.maxBooks).toBe(20);
    expect(result.current.remainingBooks).toBe(10);
    expect(result.current.isAtLimit).toBe(false);
    expect(result.current.progressPercent).toBe(50);
    expect(result.current.canAddMore).toBe(true);
  });

  it('должен возвращать правильные значения при достижении лимита (20 книг)', () => {
    const { result } = renderHook(() =>
      useTierListBooksLimit({ booksCount: 20 })
    );

    expect(result.current.booksCount).toBe(20);
    expect(result.current.maxBooks).toBe(20);
    expect(result.current.remainingBooks).toBe(0);
    expect(result.current.isAtLimit).toBe(true);
    expect(result.current.progressPercent).toBe(100);
    expect(result.current.canAddMore).toBe(false);
  });

  it('должен возвращать правильные значения при превышении лимита', () => {
    const { result } = renderHook(() =>
      useTierListBooksLimit({ booksCount: 25 })
    );

    expect(result.current.booksCount).toBe(25);
    expect(result.current.maxBooks).toBe(20);
    expect(result.current.remainingBooks).toBe(0);
    expect(result.current.isAtLimit).toBe(true);
    expect(result.current.progressPercent).toBe(100);
    expect(result.current.canAddMore).toBe(false);
  });

  it('должен возвращать правильные значения для Pro пользователя (0 книг)', () => {
    const { result } = renderHook(() =>
      useTierListBooksLimit({ booksCount: 0, isPro: true })
    );

    expect(result.current.booksCount).toBe(0);
    expect(result.current.maxBooks).toBe(Infinity);
    expect(result.current.remainingBooks).toBe(Infinity);
    expect(result.current.isAtLimit).toBe(false);
    expect(result.current.progressPercent).toBe(100);
    expect(result.current.canAddMore).toBe(true);
    expect(result.current.isPro).toBe(true);
  });

  it('должен возвращать правильные значения для Pro пользователя (100 книг)', () => {
    const { result } = renderHook(() =>
      useTierListBooksLimit({ booksCount: 100, isPro: true })
    );

    expect(result.current.booksCount).toBe(100);
    expect(result.current.maxBooks).toBe(Infinity);
    expect(result.current.remainingBooks).toBe(Infinity);
    expect(result.current.isAtLimit).toBe(false);
    expect(result.current.progressPercent).toBe(100);
    expect(result.current.canAddMore).toBe(true);
  });

  it('должен обновляться при изменении booksCount', () => {
    const { result, rerender } = renderHook(
      ({ booksCount, isPro }) => useTierListBooksLimit({ booksCount, isPro }),
      { initialProps: { booksCount: 5, isPro: false } }
    );

    expect(result.current.remainingBooks).toBe(15);
    expect(result.current.isAtLimit).toBe(false);

    rerender({ booksCount: 20, isPro: false });

    expect(result.current.remainingBooks).toBe(0);
    expect(result.current.isAtLimit).toBe(true);
  });

  it('должен обновляться при изменении isPro', () => {
    const { result, rerender } = renderHook(
      ({ booksCount, isPro }) => useTierListBooksLimit({ booksCount, isPro }),
      { initialProps: { booksCount: 20, isPro: false } }
    );

    expect(result.current.isAtLimit).toBe(true);
    expect(result.current.canAddMore).toBe(false);

    rerender({ booksCount: 20, isPro: true });

    expect(result.current.isAtLimit).toBe(false);
    expect(result.current.canAddMore).toBe(true);
  });
});
