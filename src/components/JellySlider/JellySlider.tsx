import { useEffect, useRef, useId, useCallback } from "react";

export interface JellySliderProps {
  value: number; // 0..100
  onChange: (value: number) => void;
  theme?: "dark" | "craft";
  ariaLabel?: string;
  className?: string;
  caption?: React.ReactNode;
}

interface SpringState {
  x: number;
  v: number;
  t: number;
  k: number;
  c: number;
}

const createSpring = (x: number, k = 400, c = 30): SpringState => ({
  x,
  v: 0,
  t: x,
  k,
  c,
});

const tuneSpring = (s: SpringState, k: number, c: number) => {
  s.k = k;
  s.c = c;
};

const stepSpring = (s: SpringState, dt: number) => {
  const a = -s.k * (s.x - s.t) - s.c * s.v;
  s.v += a * dt;
  s.x += s.v * dt;
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const rubber = (x: number, min: number, max: number, d = 18) =>
  x < min
    ? min - (1 - 1 / (((min - x) * 0.55) / d + 1)) * d
    : x > max
      ? max + (1 - 1 / (((x - max) * 0.55) / d + 1)) * d
      : x;

// Токены жесткости и демпфирования пружин (Motion tokens)
const T = {
  follow: [900, 50] as const,
  bubble: [420, 22] as const,
  release: [300, 14] as const,
  glide: [420, 34] as const,
  dropLag: [260, 18] as const,
  press: [520, 16] as const,
  sink: [260, 24] as const, // Плавное и вязкое втягивание капли в покое
};

const R = 12; // Радиус ползунка
const TR = 14; // Половина отрисованного размера ползунка (28px, размытие съедает 2px)
const D = 14; // Радиус капли (28px — аккуратный компактный размер)
const OX = 40; // Смещение по X для слоя goo
const OY = 80; // Смещение по Y для слоя goo
const CY = 16; // Центр трека по вертикали
const RISE = -32; // Высота всплытия капли
const HIDE_DELAY = 1500; // Задержка перед скрытием капли в покое (1.5 сек)

export function JellySlider({
  value,
  onChange,
  theme = "dark",
  ariaLabel = "Ползунок",
  className = "",
  caption,
}: JellySliderProps) {
  const rawId = useId();
  const filterId = `jelly-goo-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const isDark = theme === "dark";

  const railRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const dropLabelRef = useRef<HTMLDivElement>(null);
  const hitRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Хранилище ссылок на анимацию и геометрию
  const stateRef = useRef({
    width: 0,
    dragging: false,
    hover: false,
    lifted: false,
    focused: false,
    X: createSpring(R, ...T.follow),
    DX: createSpring(R, ...T.dropLag),
    DY: createSpring(CY, ...T.sink),
    DS: createSpring(0.4, ...T.sink),
    PS: createSpring(1, ...T.press),
    value,
    lastReportedValue: value,
  });

  const span = useCallback((w: number) => Math.max(w - 2 * R, 1), []);
  const toX = useCallback(
    (v: number, w: number) => R + (v / 100) * span(w),
    [span]
  );
  const toV = useCallback(
    (x: number, w: number) => clamp((x - R) / span(w), 0, 1) * 100,
    [span]
  );

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  // Синхронизация целевых положений пружин
  const syncSprings = useCallback(() => {
    const s = stateRef.current;
    const isUp = s.lifted || s.dragging || s.hover || s.focused;
    if (isUp) {
      tuneSpring(s.DY, ...T.bubble);
      tuneSpring(s.DS, ...T.bubble);
      s.DY.t = CY + RISE;
      s.DS.t = s.dragging ? 1.08 : 1;
    } else {
      tuneSpring(s.DY, ...T.sink);
      tuneSpring(s.DS, ...T.sink);
      s.DY.t = CY;
      s.DS.t = 0.4;
    }
    s.PS.t = s.dragging ? 1.16 : s.hover ? 1.08 : 1;
  }, []);

  const wakeDrop = useCallback(() => {
    clearHideTimer();
    stateRef.current.lifted = true;
    syncSprings();
  }, [clearHideTimer, syncSprings]);

  const scheduleHide = useCallback(
    (delay = HIDE_DELAY) => {
      clearHideTimer();
      hideTimerRef.current = setTimeout(() => {
        const s = stateRef.current;
        if (s.dragging || s.hover || s.focused) return;
        s.lifted = false;
        syncSprings();
      }, delay);
    },
    [clearHideTimer, syncSprings]
  );

  useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, [clearHideTimer]);

  // Синхронизация внешнего значения
  useEffect(() => {
    const s = stateRef.current;
    if (!s.dragging && s.width > 0) {
      const targetX = toX(value, s.width);
      if (Math.abs(s.X.t - targetX) > 1) {
        tuneSpring(s.X, ...T.glide);
        s.X.t = targetX;
        s.value = value;
        wakeDrop();
        scheduleHide(HIDE_DELAY);
      }
    }
  }, [value, toX, wakeDrop, scheduleHide]);

  // Запуск цикла физики requestAnimationFrame
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 1 / 30);
      lastTime = now;

      const s = stateRef.current;
      s.DX.t = s.X.x;

      // 4 субшага физики для максимальной плавности
      const sub = 4;
      for (let k = 0; k < sub; k++) {
        stepSpring(s.X, dt / sub);
        stepSpring(s.DX, dt / sub);
        stepSpring(s.DY, dt / sub);
        stepSpring(s.DS, dt / sub);
        stepSpring(s.PS, dt / sub);
      }

      // Отрисовка
      const x = s.X.x;
      const v = Math.round(toV(x, s.width));
      s.value = v;

      if (v !== s.lastReportedValue && s.dragging) {
        s.lastReportedValue = v;
        onChange(v);
      }

      // Ползунок: растягивается вдоль трека от скорости (squash & stretch)
      const st = 1 + Math.min(Math.abs(s.X.v) / 2400, 0.4);
      if (thumbRef.current) {
        thumbRef.current.style.transform = `translate(${x - TR + OX}px, ${
          CY - TR + OY
        }px) scale(${st * s.PS.x}, ${s.PS.x / st})`;
      }

      // Капля: всплывает, наклоняется в сторону движения
      const tilt = clamp((s.DX.x - s.X.x) * 0.9, -28, 28);
      const dTr = `translate(${s.DX.x - D}px, ${s.DY.x - D}px) rotate(${tilt}deg) scale(${s.DS.x})`;
      if (dropRef.current) {
        dropRef.current.style.transform = `translate(${OX}px, ${OY}px) ${dTr}`;
      }
      if (dropLabelRef.current) {
        dropLabelRef.current.style.transform = dTr;
        // Прозрачность цифры плавно нарастает по мере всплытия капли из ползунка
        const liftProgress = clamp((CY - s.DY.x) / (-RISE), 0, 1);
        const labelOpacity = liftProgress > 0.35 ? (liftProgress - 0.35) / 0.65 : 0;
        dropLabelRef.current.style.opacity = labelOpacity.toFixed(2);
        dropLabelRef.current.textContent = String(v);
      }

      // Заполненная часть трека
      if (fillRef.current) {
        const fillW =
          clamp(x, 0, Math.max(s.width, 0)) * clamp((x - R) / R, 0, 1);
        fillRef.current.style.width = `${fillW}px`;
      }

      // Элемент фокуса и ARIA
      if (hitRef.current) {
        hitRef.current.style.left = `${x - R}px`;
        hitRef.current.setAttribute("aria-valuenow", String(v));
      }

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [toV, onChange]);

  // Отслеживание размера rail
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const measure = (w: number) => {
      if (w > 0) {
        const s = stateRef.current;
        s.width = w;
        const initialX = toX(s.value, w);
        s.X.x = s.X.t = initialX;
        s.DX.x = s.DX.t = initialX;
        s.DY.x = s.DY.t = CY;
        s.DS.x = s.DS.t = 0.4;
        s.X.v = s.DX.v = s.DY.v = s.DS.v = 0;
      }
    };

    // Немедленное измерение при маунте
    const rect = rail.getBoundingClientRect();
    if (rect.width > 0) {
      measure(rect.width);
    }

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        measure(w);
      }
    });

    ro.observe(rail);
    return () => ro.disconnect();
  }, [toX]);

  // Обработчики мыши/тача (Pointer Events)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    if (!rail) return;

    wakeDrop();
    const s = stateRef.current;
    s.dragging = true;
    try {
      rail.setPointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    tuneSpring(s.X, ...T.follow);
    const rect = rail.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    s.X.t = rubber(localX, R, s.width - R);
    syncSprings();
    hitRef.current?.focus({ preventScroll: true });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = stateRef.current;
    if (!s.dragging || !railRef.current) return;
    wakeDrop();
    const rect = railRef.current.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    s.X.t = rubber(localX, R, s.width - R);
  };

  const handlePointerUp = () => {
    const s = stateRef.current;
    if (!s.dragging) return;
    s.dragging = false;
    tuneSpring(s.X, ...T.release);
    s.X.t = clamp(s.X.t, R, s.width - R);
    const finalV = Math.round(toV(s.X.t, s.width));
    s.value = finalV;
    onChange(finalV);
    syncSprings();
    scheduleHide(HIDE_DELAY);
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") {
      stateRef.current.hover = true;
      wakeDrop();
    }
  };

  const handlePointerLeave = () => {
    stateRef.current.hover = false;
    syncSprings();
    scheduleHide(HIDE_DELAY);
  };

  // Управление с клавиатуры
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const s = stateRef.current;
    let next: number | undefined;

    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = clamp(s.value + 5, 0, 100);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = clamp(s.value - 5, 0, 100);
    else if (e.key === "PageUp") next = clamp(s.value + 10, 0, 100);
    else if (e.key === "PageDown") next = clamp(s.value - 10, 0, 100);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 100;

    if (next !== undefined) {
      e.preventDefault();
      wakeDrop();
      tuneSpring(s.X, ...T.glide);
      s.X.t = toX(next, s.width);
      s.value = next;
      onChange(next);
      syncSprings();
      scheduleHide(HIDE_DELAY);
    }
  };

  const handleFocus = () => {
    stateRef.current.focused = true;
    wakeDrop();
  };

  const handleBlur = () => {
    stateRef.current.focused = false;
    syncSprings();
    scheduleHide(HIDE_DELAY);
  };

  return (
    <div className={`w-full select-none ${className}`}>
      {/* SVG Goo-фильтр: размытие + контраст альфа-канала */}
      <svg
        width="0"
        height="0"
        style={{ position: "absolute", pointerEvents: "none" }}
        aria-hidden="true"
      >
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5.4" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 21 -10"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </svg>

      {/* Интерактивный рельс */}
      <div
        ref={railRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        className="relative h-8 touch-none cursor-pointer"
      >
        {/* Дорожка трека */}
        <div
          className={`absolute left-0 right-0 top-3.25 h-1.5 rounded-full overflow-hidden ${
            isDark ? "bg-white/10" : "bg-stone-300"
          }`}
        >
          {/* Заполненная часть */}
          <div
            ref={fillRef}
            className={`absolute left-0 top-0 bottom-0 rounded-full ${
              isDark
                ? "bg-linear-to-r from-amber-500 to-amber-400"
                : "bg-linear-to-r from-amber-700 to-amber-600"
            }`}
            style={{ width: `${value}%` }}
          />
        </div>

        {/* Слой Goo: капля и ползунок сливаются в единую форму */}
        <div
          className="absolute -left-10 -right-10 -top-20 h-35 pointer-events-none"
          style={{ filter: `url(#${filterId})` }}
        >
          {/* Всплывающая капля (уменьшенный аккуратный размер 28x28px) */}
          <div
            ref={dropRef}
            className={`absolute left-0 top-0 w-7 h-7 rounded-full will-change-transform ${
              isDark ? "bg-amber-400" : "bg-amber-600"
            }`}
          />
          {/* Ползунок на треке */}
          <div
            ref={thumbRef}
            className={`absolute left-0 top-0 w-7 h-7 rounded-full will-change-transform ${
              isDark ? "bg-amber-400 shadow-md" : "bg-amber-600 shadow-md"
            }`}
          />
        </div>

        {/* Текст цифры внутри капли */}
        <div
          ref={dropLabelRef}
          className={`absolute left-0 top-0 w-7 h-7 grid place-items-center text-[11px] font-mono font-bold pointer-events-none will-change-transform transition-opacity ${
            isDark ? "text-slate-950" : "text-white"
          }`}
        >
          {value}
        </div>

        {/* Скрытый интерактивный элемент для фокуса и доступности (ARIA slider) */}
        <div
          ref={hitRef}
          role="slider"
          tabIndex={0}
          aria-label={ariaLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="absolute top-1 w-6 h-6 rounded-full outline-hidden focus-visible:ring-2 focus-visible:ring-amber-400"
        />
      </div>

      {/* Строка на одном уровне: 0 слева, пояснение по центру, 100 справа */}
      <div className="flex items-center justify-between gap-3 text-xs mt-1.5 select-none min-h-6">
        <button
          type="button"
          aria-label="Отметка 0"
          onClick={() => {
            const s = stateRef.current;
            const w = s.width || 300;
            tuneSpring(s.X, ...T.glide);
            s.X.t = toX(0, w);
            s.value = 0;
            onChange(0);
            syncSprings();
          }}
          className="font-mono text-[11px] font-medium opacity-60 cursor-pointer transition-transform hover:scale-115 focus:outline-hidden shrink-0"
        >
          0
        </button>

        {caption && (
          <div className="flex-1 text-center truncate px-2">
            {caption}
          </div>
        )}

        <button
          type="button"
          aria-label="Отметка 100"
          onClick={() => {
            const s = stateRef.current;
            const w = s.width || 300;
            tuneSpring(s.X, ...T.glide);
            s.X.t = toX(100, w);
            s.value = 100;
            onChange(100);
            syncSprings();
          }}
          className="font-mono text-[11px] font-medium opacity-60 cursor-pointer transition-transform hover:scale-115 focus:outline-hidden shrink-0"
        >
          100
        </button>
      </div>
    </div>
  );
}
