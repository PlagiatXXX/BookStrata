import { useCallback, useEffect, useRef } from "react";
import type { ImgHTMLAttributes, SyntheticEvent } from "react";
import { useRetryableImage } from "@/hooks/useRetryableImage";

/** Событие ошибки после исчерпания ретраев: у нового `Event` нет currentTarget,
 *  поэтому переносим актуальный DOM-узел, чтобы onError-обработчики могли
 *  обратиться к обложке (скрыть её и показать фолбэк). */
function createExhaustedEvent(img: HTMLImageElement | null): SyntheticEvent<HTMLImageElement> {
  return {
    currentTarget: img,
    target: img,
    nativeEvent: new Event("error"),
    type: "error",
    bubbles: false,
    cancelable: false,
    defaultPrevented: false,
    preventDefault() {},
    stopPropagation() {},
    isPropagationStopped: () => false,
    timeStamp: 0,
  } as unknown as SyntheticEvent<HTMLImageElement>;
}

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

  // DOM-узел текущего <img> — для onError-обработчиков после исчерпания ретраев
  const imgRef = useRef<HTMLImageElement | null>(null);

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
    onError?.(createExhaustedEvent(imgRef.current));
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
    return <img ref={imgRef} src={fallbackSrc} {...rest} />;
  }

  return <img ref={imgRef} src={imgSrc ?? undefined} onError={handleImgError} onLoad={handleImgLoad} {...rest} />;
}