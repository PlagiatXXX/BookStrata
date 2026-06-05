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
});
