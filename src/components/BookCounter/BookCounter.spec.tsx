import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BookCounter } from './BookCounter';

describe('BookCounter', () => {
  it('должен отображать счётчик книг', () => {
    render(<BookCounter booksCount={0} />);

    expect(screen.getByText('Книги в тир-листе')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('должен отображать количество 10 книг', () => {
    render(<BookCounter booksCount={10} />);

    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('должен отображать любое количество книг', () => {
    render(<BookCounter booksCount={100} />);
    expect(screen.getByText('100')).toBeInTheDocument();

    const { rerender } = render(<BookCounter booksCount={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
