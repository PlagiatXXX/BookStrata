import { useState, useEffect } from 'react';

/**
 * Только iOS нуждается в компенсации: там клавиатура сжимает visualViewport,
 * не меняя layout viewport (window.innerHeight), и `fixed bottom-0` элементы
 * уезжают под клавиатуру. Поднимаем их на величину сжатия.
 *
 * На Android и десктопе хук всегда возвращает 0:
 * - URL-бар Android при скролле сжимает visualViewport, но НЕ перекрывает контент —
 *   браузер сам держит fixed-элементы в видимой области. Попытка «поднять» тулбар
 *   на величину сжатия давала эффект «подвешенного» тулбара при скролле.
 * - Клавиатура Android обрабатывается декларативно через
 *   `interactive-widget=resizes-content` в meta viewport (index.html).
 *
 * Формула (iOS): offset = window.innerHeight - visualViewport.height
 */
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const { userAgent, platform, maxTouchPoints } = navigator;
  return /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
}

export function useBottomSafeOffset(): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!isIOS()) return;

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
