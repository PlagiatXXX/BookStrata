import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BookCounter } from './BookCounter';

describe('BookCounter', () => {
  it('должен отображать счётчик книг для обычного пользователя (0 книг)', () => {
    render(<BookCounter booksCount={0} />);

    expect(screen.getByText('Книги в тир-листе')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('/ 20')).toBeInTheDocument();
    expect(screen.getByText('Можно добавить ещё 20 книг')).toBeInTheDocument();
  });

  it('должен отображать счётчик книг для 10 книг', () => {
    render(<BookCounter booksCount={10} />);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('/ 20')).toBeInTheDocument();
    expect(screen.getByText('Можно добавить ещё 10 книг')).toBeInTheDocument();
  });

  it('должен отображать предупреждение при приближении к лимиту (18 книг)', () => {
    render(<BookCounter booksCount={18} />);

    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('Осталось 2 из 20')).toBeInTheDocument();
  });

  it('должен отображать достижение лимита (20 книг)', () => {
    render(<BookCounter booksCount={20} />);

    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('Достигнут лимит книг')).toBeInTheDocument();
  });

  it('должен отображать Pro бейдж для Pro пользователя', () => {
    render(<BookCounter booksCount={10} isPro={true} />);

    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('∞')).toBeInTheDocument();
    expect(screen.queryByText('/')).not.toBeInTheDocument();
    expect(screen.getByText('Неограниченное количество книг')).toBeInTheDocument();
  });

  it('должен отображать бесконечность для Pro пользователя с любым количеством книг', () => {
    const { rerender } = render(<BookCounter booksCount={100} isPro={true} />);

    expect(screen.getByText('∞')).toBeInTheDocument();
    expect(screen.getByText('Неограниченное количество книг')).toBeInTheDocument();

    rerender(<BookCounter booksCount={5} isPro={true} />);

    expect(screen.getByText('∞')).toBeInTheDocument();
  });

  it('должен показывать правильный прогресс-бар', () => {
    const { container, rerender } = render(<BookCounter booksCount={0} />);

    let progressBar = container.querySelector('[style*="width: 0%"]');
    expect(progressBar).toBeInTheDocument();

    rerender(<BookCounter booksCount={10} />);
    progressBar = container.querySelector('[style*="width: 50%"]');
    expect(progressBar).toBeInTheDocument();

    rerender(<BookCounter booksCount={20} />);
    progressBar = container.querySelector('[style*="width: 100%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('должен показывать cyan прогресс-бар для обычного пользователя', () => {
    const { container } = render(<BookCounter booksCount={5} />);
    const progressBar = container.querySelector('[class*="bg-cyan-500"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('должен показывать amber прогресс-бар при приближении к лимиту', () => {
    const { container } = render(<BookCounter booksCount={18} />);
    const progressBar = container.querySelector('[class*="bg-amber-500"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('должен показывать red прогресс-бар при достижении лимита', () => {
    const { container } = render(<BookCounter booksCount={20} />);
    const progressBar = container.querySelector('[class*="bg-red-500"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('должен показывать amber прогресс-бар для Pro пользователя', () => {
    const { container } = render(<BookCounter booksCount={50} isPro={true} />);
    const progressBar = container.querySelector('[class*="bg-amber-400"]');
    expect(progressBar).toBeInTheDocument();
  });
});
