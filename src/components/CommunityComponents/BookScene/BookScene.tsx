import { motion } from "framer-motion";
import { useRef, useCallback, useEffect, useMemo, memo, type RefObject } from "react";
import { useBookController } from "./useBookController";
import "./BookScene.css";

const APHORISMS: string[] = [
  "Книги — корабли мысли, странствующие по волнам времени и бережно несущие свой драгоценный груз от поколения к поколению.",
  "Чтение — это диалог с мудрецами, в котором мы слышим только то, что готовы услышать.",
  "В книгах мы ищем не ответы, а вопросы, которые не решались задать себе.",
  "Хорошая книга — это сад, что умещается в кармане, цветущий круглый год.",
  "Читатель проживает тысячу жизней, прежде чем умрёт. Человек, который никогда не читает, проживает всего одну.",
  "Книга — это приключение, которое начинается с первого слова и никогда не заканчивается.",
  "В каждой книге спрятан ключ к двери, о существовании которой ты даже не подозревал.",
  "Чтение делает человека знающим, беседа — находчивым, а привычка записывать — точным.",
  "Книги — это зеркала: в них мы видим не только автора, но и себя.",
  "Тот, кто не читает хорошие книги, не имеет преимущества перед тем, кто не умеет читать.",
  "Книга — это тот друг, который никогда не предаст, всегда рядом и готов поделиться мудростью.",
  "Чтение — это не просто хобби, это способ замедлить время и расширить границы своей Вселенной.",
  "В мире, где всё кричит, книга остаётся тихим голосом, который стоит услышать.",
  "История, прочитанная в детстве, остаётся с тобой навсегда, становясь частью твоего мира.",
  "Книги учат нас тому, что истинная сила — не в мышцах, а в знаниях и сострадании.",
  "Чтение хороших книг — это разговор с самыми лучшими людьми прошлых времён.",
  "Каждая прочитанная книга — это ещё одна прожитая жизнь, ещё один урок, ещё одна вселенная.",
  "В тишине библиотеки слышен самый громкий разговор — диалог читателя с автором через века.",
  "Книга — это единственное место, где ты можешь побывать, не выходя из дома.",
  "Слово — самый сильный инструмент, а книга — бесконечная мастерская, где этот инструмент обретает форму.",
]

function getDailyAphorism(): { text: string; pageNumber: number } {
  const now = new Date()
  const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
  let hash = 0
  for (let i = 0; i < dayKey.length; i++) {
    hash = ((hash << 5) - hash) + dayKey.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % APHORISMS.length
  const pageNumber = 1 + Math.abs(hash ^ 42) % 999
  return { text: APHORISMS[index], pageNumber }
}

interface BookSceneProps {
  containerRef: RefObject<HTMLDivElement | null>;
}

const BookScene = memo(({ containerRef }: BookSceneProps) => {
  const dailyAphorism = useMemo(() => getDailyAphorism(), [])
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    rotateX,
    rotateY,
    coverTransform,
    firstPageTransform,
    secondPageTransform,
    pointerX,
    pointerY,
    open,
  } = useBookController(containerRef);

  const scheduleClose = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      open.set(0);
      pointerX.set(0);
      pointerY.set(0);
    }, 150);
  }, [open, pointerX, pointerY]);

  const cancelClose = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const handleEnter = useCallback(() => {
    cancelClose();
    open.set(1);
  }, [open, cancelClose]);

  const handleLeave = useCallback(() => {
    scheduleClose();
  }, [scheduleClose]);

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (open.get() !== 1) return;
      if (!rootRef.current) return;

      const rect = rootRef.current.getBoundingClientRect();

      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;

      pointerX.set((px - 0.5) * 12);
      pointerY.set(-(py - 0.5) * 12);
    },
    [pointerX, pointerY, open],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const next = open.get() === 0 ? 1 : 0;
        open.set(next);

        if (next === 0) {
          pointerX.set(0);
          pointerY.set(0);
        }
      }
    },
    [open, pointerX, pointerY],
  );

  // Cleanup таймера при размонтировании
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const isOpen = open.get() === 1;

  return (
    <div
      ref={rootRef}
      className="book-root"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onMouseMove={handleMove}
      onFocus={handleEnter}
      onBlur={handleLeave}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={isOpen}
      aria-label="Интерактивная 3D книга"
    >
      <motion.div
        className="book-scene"
        style={{ rotateX, rotateY }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="book">
          {/* Задняя обложка */}
          <div className="backCover" />

          {/* Стопка страниц (фон) */}
          <div className="pagesStack" />

          {/* Дополнительные слои страниц для объёма */}
          <div className="page-layer page-layer-5" />
          <div className="page-layer page-layer-4" />
          <div className="page-layer page-layer-3" />
          <div className="page-layer page-layer-2" />

          {/* Левая страница (внутренняя сторона обложки) */}
          <motion.div
            className="firstPage"
            style={{ transform: firstPageTransform }}
          />

          {/* Правая страница с цитатой */}
          <motion.div
            className="secondPage"
            style={{ transform: secondPageTransform }}
          >
            <div className="quote">
              <span className="quote-drop-cap">{dailyAphorism.text[0]}</span>
              {dailyAphorism.text.slice(1)}
            </div>
            <div className="pageNumber">{dailyAphorism.pageNumber}</div>
          </motion.div>

          {/* Передняя обложка */}
          <motion.div
            className="frontCover"
            style={{ transform: coverTransform }}
          >
            {/* Золотые декоративные уголки */}
            <div className="goldCorner goldCorner--tl" />
            <div className="goldCorner goldCorner--tr" />
            <div className="goldCorner goldCorner--bl" />
            <div className="goldCorner goldCorner--br" />

            {/* Декоративное тиснение на фоне */}
            <svg
              className="embossedOrnament"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="#d4af37"
                strokeWidth="0.5"
                opacity="0.4"
              />
              <circle
                cx="50"
                cy="50"
                r="35"
                stroke="#d4af37"
                strokeWidth="0.5"
                opacity="0.3"
              />
              <circle
                cx="50"
                cy="50"
                r="25"
                stroke="#d4af37"
                strokeWidth="0.5"
                opacity="0.2"
              />
              <path
                d="M50 5 L50 15 M50 85 L50 95 M5 50 L15 50 M85 50 L95 50"
                stroke="#d4af37"
                strokeWidth="0.5"
                opacity="0.3"
              />
              <path
                d="M18 18 L25 25 M75 75 L82 82 M18 82 L25 75 M75 25 L82 18"
                stroke="#d4af37"
                strokeWidth="0.5"
                opacity="0.25"
              />
            </svg>

            <div className="cover-title" data-text="BookStrata">
              BookStrata
            </div>
            <div className="cover-subtitle">PRO</div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
});

export default BookScene;
