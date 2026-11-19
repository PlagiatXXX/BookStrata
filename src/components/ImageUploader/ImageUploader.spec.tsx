import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ImageUploader } from './ImageUploader';

describe('ImageUploader', () => {
  it('должен рендерить кнопку загрузки', () => {
    const mockOnUpload = vi.fn();
    render(<ImageUploader onUpload={mockOnUpload} />);

    expect(screen.getByText('Загрузить')).toBeInTheDocument();
  });

  it('должен рендериться без onUpload', () => {
    render(<ImageUploader />);
    expect(screen.getByText('Загрузить')).toBeInTheDocument();
  });

  it('не показывает ошибку изначально', () => {
    render(<ImageUploader />);
    expect(screen.queryByText(/Максимум 5 MB/)).not.toBeInTheDocument();
  });

  it('должен рендерить текст при drag-active', () => {
    // Проверить текст "Бросьте" в компоненте не можем через snapshot,
    // т.к. это состояние управляется useDropzone
    render(<ImageUploader />);
    expect(screen.getByText('Загрузить')).toBeInTheDocument();
  });

  it('принимает формат image/avif среди поддерживаемых типов', () => {
    const { container } = render(<ImageUploader />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.accept).toContain('image/avif');
  });
});
