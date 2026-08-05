import { useCallback, useEffect, useRef } from "react";
import type { ImgHTMLAttributes, SyntheticEvent } from "react";
import { useRetryableImage } from "@/hooks/useRetryableImage";

interface RetryableImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError" | "onLoad"> {
  src?: string | null;
  /** Сколько повторных попыток загрузки (по умолчанию 2) */
  maxRetries?: number;
  /** Подменяет src после исчерпания попыток (например /images/placeholder.svg) */
  fallbackSrc?: string;
  /** Вызывается один раз после исчерпания всех попыток */
  onExhausted?: () => void;
  /** Вызывается один раз после исчерпания всех попыток (старое поведение onError) */
  onError?: (e: SyntheticEvent<HTMLImageElement>) => void;
  /** Пробрасывается на каждый успешный load */
  onLoad?: (e: SyntheticEvent<HTMLImageElement>) => void;
}

/**
 * `<img>` с ретраями загрузки: на мобильных сетях первая попытка часто
 * обрывается, хотя картинка доступна. Повторяет запрос (меняя src
 * параметром, чтобы обойти кэш ошибки), и только потом:
 * - если задан `fallbackSrc` — подменяет src на него;
 * - иначе вызывает `onError`/`onExhausted` (старое поведение).
 */
export function RetryableImage({
  src,
  maxRetries = 2,
  fallbackSrc,
  onError,
  onExhausted,
  onLoad,
  ...rest
}: RetryableImageProps) {
  const { imgSrc, handleError, handleLoad, failed } = useRetryableImage(src ?? null, maxRetries);

  // Один вызов onError/onExhausted после исчерпания попыток
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (!failed) {
      notifiedRef.current = false;
      return;
    }
    if (notifiedRef.current) return;
    notifiedRef.current = true;
    if (fallbackSrc) return;
    onError?.(new Event("error") as unknown as React.SyntheticEvent<HTMLImageElement>);
    onExhausted?.();
  }, [failed, fallbackSrc, onError, onExhausted]);

  const handleImgError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      if (failed) {
        onError?.(e);
        return;
      }
      handleError();
    },
    [failed, handleError, onError],
  );

  const handleImgLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      handleLoad();
      onLoad?.(e);
    },
    [handleLoad, onLoad],
  );

  if (failed && fallbackSrc) {
    return <img src={fallbackSrc} {...rest} />;
  }

  return <img src={imgSrc ?? undefined} onError={handleImgError} onLoad={handleImgLoad} {...rest} />;
}