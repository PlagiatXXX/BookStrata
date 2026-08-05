import { useCallback, useState } from "react";

const RETRY_PARAM = "bs_retry";

/**
 * Добавляет retry-параметр к URL изображения. Без него браузер отдаёт
 * закэшированную ошибку и не делает повторный запрос.
 */
function withRetryParam(url: string, attempt: number): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${RETRY_PARAM}=${attempt}`;
}

/**
 * Загрузка изображения с ретраями.
 *
 * На мобильных сетях первая попытка загрузки часто обрывается, хотя
 * картинка на самом деле доступна. Хук повторяет загрузку, меняя src
 * параметром (чтобы обойти кэш ошибки), и только после `maxRetries`
 * неудач сообщает о провале через `failed`.
 *
 * @param src — итоговый src изображения (уже после proxyImageUrl и т.п.)
 * @param maxRetries — сколько повторных попыток делать (по умолчанию 2)
 */
export function useRetryableImage(src: string | null, maxRetries = 2) {
  const [attempt, setAttempt] = useState(0);
  const [imgSrc, setImgSrc] = useState(src);
  const [failed, setFailed] = useState(false);

  // Сброс при смене src (компонент переиспользуется между книгами и т.п.)
  // Паттерн «storing information from previous renders» из документации React.
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setAttempt(0);
    setImgSrc(src);
    setFailed(false);
  }

  const handleError = useCallback(() => {
    if (failed) return;
    const next = attempt + 1;
    if (next > maxRetries) {
      setFailed(true);
      return;
    }
    if (src) setImgSrc(withRetryParam(src, next));
    setAttempt(next);
  }, [src, maxRetries, failed, attempt]);

  const handleLoad = useCallback(() => {
    // Не возвращаем каноничный src: если картинка загрузилась через ретрай
    // (с ?bs_retry=N), в кэше браузера зафиксирован именно этот URL
    // (Cache-Control: immutable). Оставляем его в DOM, чтобы следующий
    // показ взял обложку из кэша, а не снова падал на каноничном URL.
    setAttempt(0);
    // imgSrc не трогаем — он остаётся текущим (возможно с ?bs_retry=N).
  }, []);

  return { imgSrc, handleError, handleLoad, failed };
}