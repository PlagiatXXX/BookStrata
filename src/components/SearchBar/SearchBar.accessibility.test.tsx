import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from './SearchBar';

describe('SearchBar Accessibility', () => {
  it('должен иметь правильные aria-label для поля ввода и кнопки очистки', () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);

    // Поле ввода
    const input = screen.getByLabelText('Поиск');
    expect(input).toBeInTheDocument();

    // Кнопка очистки не должна быть видна когда поле пустое
    expect(screen.queryByLabelText('Очистить поиск')).not.toBeInTheDocument();

    // Когда поле не пустое
    render(<SearchBar value="тест" onChange={onChange} />);
    const clearButton = screen.getByLabelText('Очистить поиск');
    expect(clearButton).toBeInTheDocument();

    // Нажатие на кнопку очистки
    fireEvent.click(clearButton);
    expect(onChange).toHaveBeenCalledWith('');
  });
});
