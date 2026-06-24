import { useState, useEffect } from 'react';

/**
 * Хук для компенсации адресной строки внизу на iOS Safari.
 *
 * При скрытии/показе нижней адресной строки layout viewport (window.innerHeight)
 * меняется с задержкой, из-за чего `fixed bottom-0` элементы дёргаются.
 *
 * Формула: offset = window.innerHeight - visualViewport.height
 * - адресная строка видна → offset > 0 (отступ снизу)
 * - адресная строка скрыта → offset = 0
 *
 * @returns отступ в пикселях для `bottom` фиксированных элементов
 */
export function useBottomSafeOffset(): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      setOffset(Math.max(0, window.innerHeight - vv.height));
    };

    update();

    vv.addEventListener('resize', update);

    return () => {
      vv.removeEventListener('resize', update);
    };
  }, []);

  return offset;
}
