import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import "./fur.css";

/*
 * Fur. Рисует шерсть на любой фигуре: folder, card, heart, кастомный SVG-путь
 * или строка текста. Всё — маленькие изогнутые пряди на одном canvas плюс
 * бахрома по краям, чтобы читалось как мех, а не шум. Без изображений,
 * текстур и зависимостей.
 *
 * Источник: https://github.com/mortspace/fur (MIT, Copyright (c) mortspace),
 * пакет feral-fur. Адаптировано под проект BookStrata.
 *
 * Фигура растеризуется в альфа-маску один раз. Проверки «внутри» — это
 * обращения к массиву, а бахрома — обход границы маски (поэтому мех растёт
 * даже в дырках букв).
 *
 * Можно гладить: проведите указателем, пряди изогнутся и вернутся обратно.
 * Цикл анимации работает только пока что-то движется, поэтому в покое
 * компонент ничего не стоит.
 */

export type FurShape = "folder" | "card" | "heart";

export interface FurProps {
  /** цвет шерсти, любой CSS-цвет. тени и кончики волос производятся от него. */
  color?: string;
  /** встроенная фигура. игнорируется при переданных path или text. */
  shape?: FurShape;
  /** кастомная фигура — строка SVG-пути в координатах pathBox. */
  path?: string;
  /** координатное пространство пути; масштабируется под размер элемента. */
  pathBox?: { width: number; height: number };
  /** растить мех на тексте вместо фигуры. вписывается в элемент. */
  text?: string;
  /** множитель длины прядей. 1 — стандартный покров. */
  fluff?: number;
  /** множитель количества прядей. ограничен, чтобы большие элементы были дешёвыми. */
  density?: number;
  /** хаос направлений, 0..1. 0 — свежерасчёсан, 1 — «спал в шапке». */
  mess?: number;
  /** одинаковое зерно + одинаковый размер = одинаковый мех. */
  seed?: number;
  /** залить внутренние отверстия фигуры «голой кожей» этого цвета,
   *  например подушечки лап. бахрома всё равно перекрывает края. */
  padColor?: string;
  /** поглаживание указателем. включено по умолчанию, отключается
   *  при prefers-reduced-motion. */
  pettable?: boolean;
  className?: string;
  style?: CSSProperties;
  /** рисуется поверх шерсти: подписи, бумажки, глаза. */
  children?: ReactNode;
}

// хранение прядей: один плоский Float32Array, STRIDE чисел на прядь:
//   [x, y, a (угол покоя), len, bend, d (прогиб), v (скорость прогиба)]
// цвет/толщина живут в бакетах, чтобы штрихи батчились.
const STRIDE = 7;

/** один батченый штрих: order[start..end) разделяет цвет + толщину.
 *  tip-бакеты перерисовывают только внешнюю половину средних прядей;
 *  under-бакеты запекаются в статичную основу и не перерисовываются. */
type Bucket = { c: string; w: number; tip: boolean; under: boolean; start: number; end: number };

type Coat = {
  S: Float32Array; // состояние прядей, STRIDE чисел на каждую
  count: number; // используемых прядей (S может иметь запас ёмкости)
  order: Int32Array; // индексы прядей, сгруппированные по бакетам
  buckets: Bucket[];
  stencil: HTMLCanvasElement; // силуэт, для композитинга основы
  solidStencil: HTMLCanvasElement; // с залитыми дырками, для подложки падов
  padColor: string | null;
  grid: number[][]; // клетка -> индексы динамических прядей (поиск указателем)
  cols: number;
  rows: number;
  cell: number;
  bleed: number;
  w: number;
  h: number;
  base: [h: number, s: number, l: number];
  /** мягкие тени и блики под прядями */
  blots: Array<{ x: number; y: number; r: number; c: string }>;
};

const CELL = 48;
const SVG_NS = "http://www.w3.org/2000/svg";
// константы пружины для прогиба (на кадр 60fps)
const SPRING = 0.1;
const DAMP = 0.88;
const SETTLED = 0.004;

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// модульные кэши, общие для всех экземпляров Fur

let hslProbe: CanvasRenderingContext2D | null = null;

/** привести любой CSS-цвет к HSL через парсер fillStyle у canvas. */
function toHsl(color: string): [number, number, number] {
  if (!hslProbe) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1;
    hslProbe = cv.getContext("2d")!;
  }
  const x = hslProbe;
  x.fillStyle = "#000";
  x.fillStyle = color;
  const std = x.fillStyle as string;
  let r = 0;
  let g = 0;
  let b = 0;
  if (std.startsWith("#")) {
    r = parseInt(std.slice(1, 3), 16);
    g = parseInt(std.slice(3, 5), 16);
    b = parseInt(std.slice(5, 7), 16);
  } else {
    const m = std.match(/[\d.]+/g);
    if (m) [r, g, b] = [Number(m[0]), Number(m[1]), Number(m[2])];
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const dlt = max - min;
  const s = l > 0.5 ? dlt / (2 - max - min) : dlt / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / dlt + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / dlt + 2) / 6;
  else h = ((r - g) / dlt + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function hsl(h: number, s: number, l: number, a = 1): string {
  return `hsl(${h.toFixed(1)} ${Math.max(0, Math.min(100, s)).toFixed(1)}% ${Math.max(0, Math.min(98, l)).toFixed(1)}% / ${a})`;
}

/** фигура «папка»: вкладка сверху слева, скошенное плечо, скруглённый корпус. */
function folderD(w: number, h: number): string {
  const r = Math.min(w, h) * 0.07;
  const rt = r * 0.8;
  const tabW = w * 0.4;
  const tabH = h * 0.16;
  const sl = tabH * 0.55;
  return [
    `M 0 ${h - r}`,
    `L 0 ${rt}`,
    `Q 0 0 ${rt} 0`,
    `L ${tabW - rt} 0`,
    `Q ${tabW} 0 ${tabW + sl * 0.45} ${tabH * 0.45}`,
    `L ${tabW + sl} ${tabH * 0.82}`,
    `Q ${tabW + sl * 1.6} ${tabH} ${tabW + sl * 2.2} ${tabH}`,
    `L ${w - r} ${tabH}`,
    `Q ${w} ${tabH} ${w} ${tabH + r}`,
    `L ${w} ${h - r}`,
    `Q ${w} ${h} ${w - r} ${h}`,
    `L ${r} ${h}`,
    `Q 0 ${h} 0 ${h - r}`,
    "Z",
  ].join(" ");
}

function cardD(w: number, h: number): string {
  const r = Math.min(w, h) * 0.12;
  return [
    `M ${r} 0`,
    `L ${w - r} 0`,
    `Q ${w} 0 ${w} ${r}`,
    `L ${w} ${h - r}`,
    `Q ${w} ${h} ${w - r} ${h}`,
    `L ${r} ${h}`,
    `Q 0 ${h} 0 ${h - r}`,
    `L 0 ${r}`,
    `Q 0 0 ${r} 0`,
    "Z",
  ].join(" ");
}

function heartD(w: number, h: number): string {
  const X = (v: number) => (v * w).toFixed(2);
  const Y = (v: number) => (v * h).toFixed(2);
  return [
    `M ${X(0.5)} ${Y(0.3)}`,
    `C ${X(0.5)} ${Y(0.14)} ${X(0.38)} ${Y(0.05)} ${X(0.26)} ${Y(0.05)}`,
    `C ${X(0.1)} ${Y(0.05)} ${X(0.02)} ${Y(0.18)} ${X(0.02)} ${Y(0.33)}`,
    `C ${X(0.02)} ${Y(0.58)} ${X(0.25)} ${Y(0.78)} ${X(0.5)} ${Y(0.96)}`,
    `C ${X(0.75)} ${Y(0.78)} ${X(0.98)} ${Y(0.58)} ${X(0.98)} ${Y(0.33)}`,
    `C ${X(0.98)} ${Y(0.18)} ${X(0.9)} ${Y(0.05)} ${X(0.74)} ${Y(0.05)}`,
    `C ${X(0.62)} ${Y(0.05)} ${X(0.5)} ${Y(0.14)} ${X(0.5)} ${Y(0.3)}`,
    "Z",
  ].join(" ");
}

const TEXT_FONT = `ui-rounded, 'Hiragino Maru Gothic ProN', Quicksand, 'Segoe UI', system-ui, sans-serif`;

// параметры вписывания текста: участвуют в ключе кэша силуэта, поэтому
// их изменение гарантированно пересобирает маску
const TEXT_FIT_W = 0.98; // доля ширины бокса, занимаемая строкой
const TEXT_FIT_H = 0.95; // доля высоты бокса
const TEXT_LETTER_SPACING = 0.01; // межбуквенный интервал, доля высоты

const TEXT_SHAPE = `t|${TEXT_FIT_W}|${TEXT_FIT_H}|${TEXT_LETTER_SPACING}`;

/** bounding box пути, измеренный одноразовым SVG-элементом, чтобы getBBox
 *  обрабатывал относительные команды и странные координаты. кэшируется по
 *  строке d, поэтому любой путь авто-вписывается без pathBox. */
const bboxCache = new Map<string, DOMRect>();

function getPathBBox(d: string): DOMRect {
  const hit = bboxCache.get(d);
  if (hit) return hit;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  const el = document.createElementNS(SVG_NS, "path") as SVGPathElement;
  el.setAttribute("d", d);
  svg.appendChild(el);
  document.body.appendChild(svg);
  let box: DOMRect;
  try {
    box = el.getBBox();
  } finally {
    svg.remove();
  }
  if (bboxCache.size > 24) bboxCache.clear();
  bboxCache.set(d, box);
  return box;
}

// силуэт — альфа-маска, canvas, на котором он нарисован (переиспользуется
// как трафарет для основы), и его граница с внешними нормалями. обход границы
// маски вместо SVG-пути — это то, что позволяет тексту с дырками в буквах
// растить бахрому; DOM не трогается, поэтому пересборки дешёвые. кэш по ключу.

type Silhouette = {
  mask: Uint8ClampedArray;
  stencil: HTMLCanvasElement;
  /** фигура с залитыми внутренними дырками, подложка для padColor */
  solidStencil: HTMLCanvasElement;
  /** граничные пиксели с внешней нормалью. hole = край внутренней дырки
   *  (подушечки), а не внешний край */
  peri: Array<{ x: number; y: number; nx: number; ny: number; hole: boolean }>;
  insideCount: number;
};

const silCache = new Map<string, Silhouette>();

function getSilhouette(
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): Silhouette {
  const hit = silCache.get(key);
  if (hit) return hit;
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, w);
  cv.height = Math.max(1, h);
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#000";
  draw(ctx);
  const mask = ctx.getImageData(0, 0, cv.width, cv.height).data;
  const W = cv.width;
  const H = cv.height;
  const at = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= w || y >= h ? 0 : mask[(y * w + x) * 4 + 3];

  // заливка «снаружи» от границы через прозрачные пиксели. всё, что не
  // достигнуто — внутренность: фигура или дырка. запускается до сканирования
  // периметра, чтобы каждый граничный пиксель отличал внешний край от дырки.
  const outside = new Uint8Array(W * H);
  const stack: number[] = [];
  const pushIf = (i: number) => {
    if (i >= 0 && i < W * H && !outside[i] && mask[i * 4 + 3] <= 8) {
      outside[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < W; x++) {
    pushIf(x);
    pushIf((H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    pushIf(y * W);
    pushIf(y * W + W - 1);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % W;
    if (x > 0) pushIf(i - 1);
    if (x < W - 1) pushIf(i + 1);
    pushIf(i - W);
    pushIf(i + W);
  }
  const isOutside = (x: number, y: number): boolean =>
    x < 0 || y < 0 || x >= W || y >= H ? true : outside[y * W + x] === 1;

  const peri: Silhouette["peri"] = [];
  let insideCount = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (at(x, y) <= 8) continue;
      insideCount++;
      const l = at(x - 1, y) > 8;
      const r = at(x + 1, y) > 8;
      const u = at(x, y - 1) > 8;
      const dn = at(x, y + 1) > 8;
      if (l && r && u && dn) continue;
      // внешняя нормаль смотрит на отсутствующих соседей
      const nx = (l ? 0 : -1) + (r ? 0 : 1);
      const ny = (u ? 0 : -1) + (dn ? 0 : 1);
      if (!nx && !ny) continue;
      const m = Math.hypot(nx, ny);
      // проба на пару пикселей вдоль нормали: попала в настоящий «наружу» —
      // внешний край; в не-внешний зазор — край внутренней дырки
      const hole = !isOutside(Math.round(x + (nx / m) * 2), Math.round(y + (ny / m) * 2));
      peri.push({ x, y, nx: nx / m, ny: ny / m, hole });
    }
  }

  const solidCv = document.createElement("canvas");
  solidCv.width = W;
  solidCv.height = H;
  const sctx = solidCv.getContext("2d")!;
  const solidImg = sctx.createImageData(W, H);
  const sd = solidImg.data;
  for (let i = 0; i < W * H; i++) {
    if (!outside[i]) {
      sd[i * 4] = sd[i * 4 + 1] = sd[i * 4 + 2] = 0;
      sd[i * 4 + 3] = 255;
    }
  }
  sctx.putImageData(solidImg, 0, 0);

  if (silCache.size > 8) {
    const oldest = silCache.keys().next().value;
    if (oldest !== undefined) silCache.delete(oldest);
  }
  const sil = { mask, stencil: cv, solidStencil: solidCv, peri, insideCount };
  silCache.set(key, sil);
  return sil;
}

// размеры палитры по слоям (under / mid / highlight)
const N0 = 10;
const N1 = 12;
const N2 = 8;
const NBUCKETS = N0 + N1 + N2;

function buildCoat(
  w: number,
  h: number,
  opts: {
    color: string;
    shape: FurShape;
    path?: string;
    pathBox?: { width: number; height: number };
    text?: string;
    fluff: number;
    density: number;
    mess: number;
    seed: number;
    padColor?: string;
  },
  prev: Coat | null,
): Coat {
  const rng = mulberry32(opts.seed);
  const [bh, bs, bl] = toHsl(opts.color);

  // разрешить фигуру в пикселях элемента
  let sil: Silhouette;
  if (opts.text) {
    const text = opts.text;
    sil = getSilhouette(`t|${text}|${w}x${h}|${TEXT_SHAPE}`, w, h, (c) => {
      // небольшой letter-spacing не даёт глифам слипнуться, когда вокруг
      // вырастет бахрома
      type SpacedCtx = CanvasRenderingContext2D & { letterSpacing: string };
      const spaced = c as SpacedCtx;
      try {
        spaced.letterSpacing = `${Math.round(h * TEXT_LETTER_SPACING)}px`;
      } catch {
        /* старые браузеры: без letter-spacing, всё ещё читаемо */
      }
      c.font = `900 100px ${TEXT_FONT}`;
      const tw = Math.max(1, c.measureText(text).width);
      const size = Math.min(((w * TEXT_FIT_W) / tw) * 100, h * TEXT_FIT_H);
      c.font = `900 ${size.toFixed(1)}px ${TEXT_FONT}`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(text, w / 2, h / 2);
    });
  } else if (opts.path) {
    // кастомный путь: авто-вписывание и центрирование с сохранением
    // пропорций. pathBox используется, если задан (масштаб от origin),
    // иначе подгонкой управляет измеренный bbox — путь с любыми
    // координатами работает
    const d = opts.path;
    let m: DOMMatrix;
    if (opts.pathBox) {
      m = new DOMMatrix([w / opts.pathBox.width, 0, 0, h / opts.pathBox.height, 0, 0]);
    } else {
      const bb = getPathBBox(d);
      const pad = 0.92;
      const sc = Math.min((w * pad) / bb.width, (h * pad) / bb.height);
      m = new DOMMatrix([sc, 0, 0, sc, (w - bb.width * sc) / 2 - bb.x * sc, (h - bb.height * sc) / 2 - bb.y * sc]);
    }
    sil = getSilhouette(`p|${d}|${w}x${h}`, w, h, (c) => {
      const scaled = new Path2D();
      scaled.addPath(new Path2D(d), m);
      c.fill(scaled); // nonzero fill — перекрывающиеся подпути читаются сплошными
    });
  } else {
    const d = opts.shape === "card" ? cardD(w, h) : opts.shape === "heart" ? heartD(w, h) : folderD(w, h);
    sil = getSilhouette(`s|${d}|${w}x${h}`, w, h, (c) => c.fill(new Path2D(d)));
  }
  const mask = sil.mask;
  const inside = (x: number, y: number): boolean => {
    const xi = x | 0;
    const yi = y | 0;
    return xi >= 0 && yi >= 0 && xi < w && yi < h && mask[(yi * w + xi) * 4 + 3] > 8;
  };

  const minDim = Math.min(w, h);
  // текст носит более короткую шерсть: длинные пряди проглотят буквы, так
  // что ворс должен читаться как покров на глифах, а не хоронить их
  const lenScale = opts.text ? 0.62 : 1;
  const baseLen = Math.max(4, Math.min(22, minDim * 0.06)) * opts.fluff * lenScale;
  const bleed = Math.ceil(baseLen * 1.6) + 4;
  const mess = Math.max(0, Math.min(1, opts.mess));
  const headroom = Math.max(6, 94 - bl);

  // поле направлений: расчёсано вниз и наружу от вихра сверху, как лежит
  // ворс на вертикальной поверхности. два медленных синусоидальных поля
  // дают волну причёсанного покрова. джиттер мал, чтобы читалось
  // расчёсанным, а mess возвращает его обратно.
  const cowX = w * (0.46 + rng() * 0.08);
  const cowY = h * 0.28;
  const f1 = 0.035 + rng() * 0.02;
  const f2 = 0.03 + rng() * 0.02;
  const p1 = rng() * Math.PI * 2;
  const p2 = rng() * Math.PI * 2;
  const restAngle = (x: number, y: number): number => {
    const fromCow = Math.atan2(y - cowY, x - cowX);
    const clump = (Math.sin(x * f1 + p1) + Math.cos(y * f2 + p2)) * 0.3;
    const dn = Math.PI / 2;
    let a = fromCow + (((dn - fromCow + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 0.5;
    a += clump * (0.5 + mess) + (rng() - 0.5) * (0.3 + mess * 1.6);
    return a;
  };

  // тени пучков и блики — глубинные карманы, где ворс расходится. сидят под
  // прядями и делают большую часть работы, чтобы мех читался плюшевым.
  const blots: Coat["blots"] = [];
  const blotCount = Math.round(sil.insideCount / 1800);
  let blotTries = blotCount * 6;
  while (blots.length < blotCount && blotTries-- > 0) {
    const x = rng() * w;
    const y = rng() * h;
    if (!inside(x, y)) continue;
    const dark = rng() < 0.68;
    blots.push({
      x,
      y,
      r: baseLen * (1.3 + rng() * 1.6),
      c: dark
        ? hsl(bh + (rng() - 0.5) * 4, bs + 8, bl - 18 - rng() * 8, 0.16)
        : hsl(bh, bs * 0.9, bl + headroom * 0.2, 0.11),
    });
  }

  // ёмкость и переиспользуемые буферы. density считает пряди на px2 реальной
  // площади фигуры, поэтому текст (заполняющий малую долю бокса) получает
  // тот же ворс, что и сплошная папка
  const interior = Math.min(20000, Math.round(sil.insideCount * 0.16 * opts.density));
  const densityClamped = Math.max(0.5, Math.min(1.5, opts.density));
  const stride = 1.4 / densityClamped;
  const edgeMax = Math.ceil(sil.peri.length / (stride * 0.7)) + 4;
  const cap = interior + edgeMax;

  let S: Float32Array;
  let order: Int32Array;
  if (prev && prev.S.length >= cap * STRIDE) {
    S = prev.S;
    order = prev.order.length >= cap ? prev.order : new Int32Array(cap);
  } else {
    S = new Float32Array(cap * STRIDE);
    order = new Int32Array(cap);
  }
  // черновик: в каком бакете прядь, пересобирается каждый раз
  const bucketOf = new Uint8Array(cap);

  // палитры. весь покров держится в узкой полосе яркости вокруг базы;
  // широкие полосы читаются как мишура. тени насыщеннее, кончики светлеют
  // только в headroom, чтобы бледные покровы не выгорали. несколько
  // вариантов на слой выглядят как пер-прядный джиттер и позволяют
  // штриховать одним путём одинаковые пряди.
  const palC: string[] = [];
  const palTip: string[] = [];
  const palW: number[] = [];
  for (let v = 0; v < N0; v++) {
    palC.push(hsl(bh + (rng() - 0.5) * 5, bs + 6, bl - 12 - rng() * 9, 0.6));
    palTip.push("");
    palW.push(1.5 + rng() * 1.1);
  }
  for (let v = 0; v < N1; v++) {
    const jh = bh + (rng() - 0.5) * 5;
    const js = bs + (rng() - 0.5) * 8;
    const l = bl - 5 + rng() * 8;
    palC.push(hsl(jh, js, l, 0.8));
    palTip.push(hsl(jh, js * 0.92, l + headroom * (0.12 + rng() * 0.1), 0.8));
    palW.push(0.8 + rng() * 0.6);
  }
  for (let v = 0; v < N2; v++) {
    palC.push(hsl(bh + (rng() - 0.5) * 5, (bs + (rng() - 0.5) * 8) * 0.85, bl + headroom * (0.25 + rng() * 0.12), 0.55));
    palTip.push("");
    palW.push(0.6 + rng() * 0.5);
  }

  // пряди, пишутся сразу в плоский буфер
  let count = 0;
  const place = (x: number, y: number, a: number, edge: boolean, lenMul = 1) => {
    const roll = rng();
    const layer = roll < 0.4 ? 0 : roll < 0.92 ? 1 : 2;
    let len = baseLen * (0.7 + rng() * 0.6) * (edge ? 0.9 : 1) * (layer === 0 ? 0.8 : 1) * lenMul;
    // внутренние пряди не должны залезать на подушечку или за край, поэтому
    // кончик возвращается внутрь фигуры, чтобы края подушечек были чёткими.
    // за границу разрешено выходить только внешней бахроме. дёшево: пара
    // обращений к маске, и только пряди у края укорачиваются.
    if (!edge) {
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      let guard = 0;
      while (len > baseLen * 0.3 && !inside(x + dx * len, y + dy * len) && guard++ < 6) {
        len *= 0.78;
      }
    }
    const o = count * STRIDE;
    S[o] = x;
    S[o + 1] = y;
    S[o + 2] = a;
    S[o + 3] = len;
    S[o + 4] = (rng() - 0.5) * len * (0.7 + mess * 0.7);
    S[o + 5] = 0;
    S[o + 6] = 0;
    bucketOf[count] =
      layer === 0 ? (rng() * N0) | 0 : layer === 1 ? N0 + ((rng() * N1) | 0) : N0 + N1 + ((rng() * N2) | 0);
    count++;
  };

  // внутренние корни, rejection-сэмплинг по маске. плюшевый ворс — это много
  // тонких волосков, а не несколько жирных, так что идём плотно. бюджет
  // попыток масштабируется от того, насколько мало фигура занимает бокс.
  const coverage = Math.max(0.05, sil.insideCount / (w * h));
  let attempts = Math.ceil((interior / coverage) * 1.6);
  let placed = 0;
  while (placed < interior && attempts-- > 0) {
    const x = rng() * w;
    const y = rng() * h;
    if (inside(x, y)) {
      place(x, y, restAngle(x, y), false);
      placed++;
    }
  }

  // краевая бахрома: корни на границе, направлена наружу по нормали,
  // но провисает к «гравитации». короткая и плотная, чтобы фигура держала
  // контур с мягким ореолом, а не превращалась в мишуру. края дырок
  // (подушечки) получают только короткие редкие пучки внутрь — несколько
  // пучков через край, а не длинную бахрому, которая их похоронит.
  const fringePad = !!opts.padColor;
  for (let fi = rng() * stride; fi < sil.peri.length && count < cap; fi += stride * (0.7 + rng() * 0.6)) {
    const p = sil.peri[fi | 0];
    const padRim = fringePad && p.hole;
    if (padRim && rng() > 0.32) continue;
    const out = Math.atan2(p.ny, p.nx);
    const dn = Math.PI / 2;
    let a = out + (((dn - out + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 0.25;
    a += (rng() - 0.5) * (0.35 + mess * (padRim ? 1.6 : 1.1));
    place(p.x, p.y, a, true, padRim ? 0.5 : 1);
  }

  // группировка прядей по бакетам подсчётом, без per-прядных push
  const bucketCount = new Int32Array(NBUCKETS);
  for (let i = 0; i < count; i++) bucketCount[bucketOf[i]]++;
  const bucketStart = new Int32Array(NBUCKETS);
  let acc = 0;
  for (let b = 0; b < NBUCKETS; b++) {
    bucketStart[b] = acc;
    acc += bucketCount[b];
  }
  const cursor = bucketStart.slice();
  for (let i = 0; i < count; i++) order[cursor[bucketOf[i]]++] = i;

  // порядок отрисовки: подшёрсток (запечён), тела средних прядей,
  // светлые кончики, блики
  const buckets: Bucket[] = [];
  for (let v = 0; v < N0; v++) {
    if (bucketCount[v]) buckets.push({ c: palC[v], w: palW[v], tip: false, under: true, start: bucketStart[v], end: bucketStart[v] + bucketCount[v] });
  }
  for (let v = N0; v < N0 + N1; v++) {
    if (bucketCount[v]) buckets.push({ c: palC[v], w: palW[v], tip: false, under: false, start: bucketStart[v], end: bucketStart[v] + bucketCount[v] });
  }
  for (let v = N0; v < N0 + N1; v++) {
    if (bucketCount[v]) buckets.push({ c: palTip[v], w: palW[v] * 0.8, tip: true, under: false, start: bucketStart[v], end: bucketStart[v] + bucketCount[v] });
  }
  for (let v = N0 + N1; v < NBUCKETS; v++) {
    if (bucketCount[v]) buckets.push({ c: palC[v], w: palW[v], tip: false, under: false, start: bucketStart[v], end: bucketStart[v] + bucketCount[v] });
  }

  // грубая пространственная сетка для поиска указателем. в сетку идут только
  // динамические пряди; подшёрсток запечён в основу и погладить его нельзя,
  // что заодно удешевляет каждый кадр поглаживания примерно на 40%. клетки
  // переиспользуются, когда возможно.
  const cols = Math.max(1, Math.ceil((w + bleed * 2) / CELL));
  const rows = Math.max(1, Math.ceil((h + bleed * 2) / CELL));
  let grid: number[][];
  if (prev && prev.cols === cols && prev.rows === rows) {
    grid = prev.grid;
    for (const cellArr of grid) cellArr.length = 0;
  } else {
    grid = Array.from({ length: cols * rows }, () => []);
  }
  for (let i = 0; i < count; i++) {
    if (bucketOf[i] < N0) continue; // подшёрсток: статичный
    const o = i * STRIDE;
    const rch = S[o + 3] + Math.abs(S[o + 4]) + 2;
    const x0 = Math.max(0, Math.floor((S[o] - rch + bleed) / CELL));
    const x1 = Math.min(cols - 1, Math.floor((S[o] + rch + bleed) / CELL));
    const y0 = Math.max(0, Math.floor((S[o + 1] - rch + bleed) / CELL));
    const y1 = Math.min(rows - 1, Math.floor((S[o + 1] + rch + bleed) / CELL));
    for (let gy = y0; gy <= y1; gy++)
      for (let gx = x0; gx <= x1; gx++) grid[gy * cols + gx].push(i);
  }

  return { S, count, order, buckets, stencil: sil.stencil, solidStencil: sil.solidStencil, padColor: opts.padColor ?? null, grid, cols, rows, cell: CELL, bleed, w, h, base: [bh, bs, bl], blots };
}

/** подушечки «голой кожи»: залитая фигура цветом padColor с вертикальной
 *  тенью, чтобы подушечки читались объёмной кожей, а не плоской заливкой. */
function drawPads(ctx: CanvasRenderingContext2D, coat: Coat, padColor: string) {
  const [ph, ps, pl] = toHsl(padColor);
  ctx.drawImage(coat.solidStencil, 0, 0, coat.w, coat.h);
  ctx.globalCompositeOperation = "source-atop";
  const g = ctx.createLinearGradient(0, 0, 0, coat.h);
  g.addColorStop(0, hsl(ph, ps, pl + 6));
  g.addColorStop(1, hsl(ph, ps + 4, pl - 12));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, coat.w, coat.h);
  ctx.globalCompositeOperation = "source-over";
}

function drawBase(ctx: CanvasRenderingContext2D, coat: Coat) {
  const [bh, bs, bl] = coat.base;
  ctx.drawImage(coat.stencil, 0, 0, coat.w, coat.h);
  ctx.globalCompositeOperation = "source-atop";
  const g = ctx.createLinearGradient(0, 0, 0, coat.h);
  g.addColorStop(0, hsl(bh, bs * 0.9, bl - 8));
  g.addColorStop(1, hsl(bh, bs * 0.95, bl - 20));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, coat.w, coat.h);
  for (const b of coat.blots) {
    const rg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    rg.addColorStop(0, b.c);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
  }
  // свет на животе: мягкое свечение сверху, чтобы покров читался круглым
  const r = Math.max(coat.w, coat.h) * 0.55;
  const rg = ctx.createRadialGradient(coat.w / 2, coat.h * 0.42, r * 0.1, coat.w / 2, coat.h * 0.42, r);
  rg.addColorStop(0, "rgba(255,255,255,0.14)");
  rg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, coat.w, coat.h);
  ctx.globalCompositeOperation = "source-over";
}

/** штрих одного слоя бакетов. under = запечённый базовый проход,
 *  остальные — живые кадры. */
function strokeBuckets(ctx: CanvasRenderingContext2D, coat: Coat, under: boolean) {
  ctx.lineCap = "round";
  const S = coat.S;
  const order = coat.order;
  for (const b of coat.buckets) {
    if (b.under !== under) continue;
    ctx.strokeStyle = b.c;
    ctx.lineWidth = b.w;
    ctx.beginPath();
    if (b.tip) {
      for (let k = b.start; k < b.end; k++) {
        const o = order[k] * STRIDE;
        const x = S[o];
        const y = S[o + 1];
        const len = S[o + 3];
        const a = S[o + 2] + S[o + 5];
        const ca = S[o + 2] + S[o + 5] * 0.55;
        const cxp = x + Math.cos(ca) * len * 0.55 - Math.sin(ca) * S[o + 4];
        const cyp = y + Math.sin(ca) * len * 0.55 + Math.cos(ca) * S[o + 4];
        const tx = x + Math.cos(a) * len;
        const ty = y + Math.sin(a) * len;
        // середина квадры в t=0.5, перештриховываем только светлую внешнюю половину
        ctx.moveTo((x + 2 * cxp + tx) / 4, (y + 2 * cyp + ty) / 4);
        ctx.quadraticCurveTo((cxp + tx) / 2, (cyp + ty) / 2, tx, ty);
      }
    } else {
      for (let k = b.start; k < b.end; k++) {
        const o = order[k] * STRIDE;
        const x = S[o];
        const y = S[o + 1];
        const len = S[o + 3];
        const a = S[o + 2] + S[o + 5];
        const ca = S[o + 2] + S[o + 5] * 0.55;
        const cxp = x + Math.cos(ca) * len * 0.55 - Math.sin(ca) * S[o + 4];
        const cyp = y + Math.sin(ca) * len * 0.55 + Math.cos(ca) * S[o + 4];
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(cxp, cyp, x + Math.cos(a) * len, y + Math.sin(a) * len);
      }
    }
    ctx.stroke();
  }
}

/** перерисовка живого покрова. всегда полная; частичные перерисовки с
 *  обрезкой оставляют волосяные швы. основа (запечённый подшёрсток) просто
 *  блиттится. */
function paint(ctx: CanvasRenderingContext2D, coat: Coat, base: HTMLCanvasElement) {
  ctx.clearRect(-coat.bleed, -coat.bleed, coat.w + coat.bleed * 2, coat.h + coat.bleed * 2);
  ctx.drawImage(base, -coat.bleed, -coat.bleed, coat.w + coat.bleed * 2, coat.h + coat.bleed * 2);
  strokeBuckets(ctx, coat, false);
}

export function Fur({
  color = "#f5a8c9",
  shape = "folder",
  path,
  pathBox,
  text,
  fluff = 1,
  density = 1,
  mess = 0.5,
  seed = 7,
  padColor,
  pettable = true,
  className,
  style,
  children,
}: FurProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // хранится между перезапусками эффекта, чтобы каждая пересборка
  // переиспользовала типизированные массивы и базовый canvas прошлого покрова
  const coatRef = useRef<Coat | null>(null);
  const baseCvRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    // обычный контекст. desynchronized снижает инпут-латентность в chromium,
    // но на некоторых мобильных браузерах композитится непрозрачным чёрным
    // до первого репаинта пользователя, что мигает чёрным боксом за мехом
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let coat: Coat | null = coatRef.current;
    let baseCv: HTMLCanvasElement | null = baseCvRef.current;
    let raf = 0;
    let running = false;
    let lastT = 0;
    // пряди, которые сейчас пружинят обратно, по индексу
    const active = new Set<number>();
    let lastPX: number | null = null;
    let lastPY: number | null = null;

    let lastW = 0;
    let lastH = 0;
    const rebuild = () => {
      const r = wrap.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      if (w < 4 || h < 4) return;
      lastW = w;
      lastH = h;
      coat = buildCoat(w, h, { color, shape, path, pathBox, text, fluff, density, mess, seed, padColor }, coat);
      coatRef.current = coat;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const bw = (w + coat.bleed * 2) * dpr;
      const bhh = (h + coat.bleed * 2) * dpr;
      // установка canvas.width перераспределяет backing store, пропускаем, если не изменился
      if (canvas.width !== bw || canvas.height !== bhh) {
        canvas.width = bw;
        canvas.height = bhh;
        canvas.style.inset = `${-coat.bleed}px`;
        canvas.style.width = `${w + coat.bleed * 2}px`;
        canvas.style.height = `${h + coat.bleed * 2}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, coat.bleed * dpr, coat.bleed * dpr);
      // пре-рендер основы и подшёрстка один раз. кадры поглаживания блиттят
      // её обратно и перештриховывают только верхний покров
      if (!baseCv || baseCv.width !== bw || baseCv.height !== bhh) {
        baseCv = document.createElement("canvas");
        baseCv.width = bw;
        baseCv.height = bhh;
      }
      baseCvRef.current = baseCv;
      const bctx = baseCv.getContext("2d")!;
      bctx.setTransform(dpr, 0, 0, dpr, coat.bleed * dpr, coat.bleed * dpr);
      bctx.clearRect(-coat.bleed, -coat.bleed, w + coat.bleed * 2, h + coat.bleed * 2);
      if (coat.padColor) {
        // подушечки заполняют дырки, покров композитится поверх (в дырках
        // он прозрачный), так что подушечки видны, а бахрома перекрывает их
        // края — как на настоящей лапе
        drawPads(bctx, coat, coat.padColor);
        const tmp = document.createElement("canvas");
        tmp.width = bw;
        tmp.height = bhh;
        const tctx = tmp.getContext("2d")!;
        tctx.setTransform(dpr, 0, 0, dpr, coat.bleed * dpr, coat.bleed * dpr);
        drawBase(tctx, coat);
        strokeBuckets(tctx, coat, true);
        bctx.save();
        bctx.setTransform(1, 0, 0, 1, 0, 0);
        bctx.drawImage(tmp, 0, 0);
        bctx.restore();
      } else {
        drawBase(bctx, coat);
        strokeBuckets(bctx, coat, true);
      }
      active.clear();
      paint(ctx, coat, baseCv);
    };

    const frame = (now: number) => {
      if (!coat || !baseCv) {
        running = false;
        return;
      }
      const f = Math.max(0.25, Math.min(3, (now - lastT) / 16.7));
      lastT = now;
      const S = coat.S;
      let any = false;
      for (const i of active) {
        const o = i * STRIDE;
        let v = S[o + 6];
        let dd = S[o + 5];
        v += -SPRING * dd * f;
        v *= Math.pow(DAMP, f);
        dd = Math.max(-1.1, Math.min(1.1, dd + v * f));
        if (Math.abs(dd) < SETTLED && Math.abs(v) < SETTLED) {
          dd = 0;
          v = 0;
          active.delete(i);
        }
        S[o + 5] = dd;
        S[o + 6] = v;
        any = true;
      }
      if (any) paint(ctx, coat, baseCv);
      if (active.size > 0) raf = requestAnimationFrame(frame);
      else running = false;
    };

    const wake = () => {
      if (running) return;
      running = true;
      lastT = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      if (!coat) return;
      const r = wrap.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      if (lastPX !== null && lastPY !== null) {
        const vx = px - lastPX;
        const vy = py - lastPY;
        const speed = Math.hypot(vx, vy);
        if (speed > 0.5) {
          const S = coat.S;
          const R = Math.max(24, Math.min(coat.w, coat.h) * 0.16);
          const R2 = R * R;
          // кандидаты из клеток, которые покрывает круг указателя
          const x0 = Math.max(0, Math.floor((px - R + coat.bleed) / coat.cell));
          const x1 = Math.min(coat.cols - 1, Math.floor((px + R + coat.bleed) / coat.cell));
          const y0 = Math.max(0, Math.floor((py - R + coat.bleed) / coat.cell));
          const y1 = Math.min(coat.rows - 1, Math.floor((py + R + coat.bleed) / coat.cell));
          for (let gy = y0; gy <= y1; gy++) {
            for (let gx = x0; gx <= x1; gx++) {
              for (const i of coat.grid[gy * coat.cols + gx]) {
                const o = i * STRIDE;
                const dx = S[o] - px;
                const dy = S[o + 1] - py;
                const d2 = dx * dx + dy * dy;
                if (d2 > R2) continue;
                const g = 1 - d2 / R2;
                // момент = скорость штриха поперёк направления пряди
                const push = (vx * -Math.sin(S[o + 2]) + vy * Math.cos(S[o + 2])) / S[o + 3];
                S[o + 6] += push * g * 0.55;
                active.add(i);
              }
            }
          }
          if (active.size > 0) wake();
        }
      }
      lastPX = px;
      lastPY = py;
    };
    const onLeave = () => {
      lastPX = null;
      lastPY = null;
    };

    // сборка синхронно при каждом изменении зависимостей. переиспользование
    // буферов (buildCoat принимает coat для рециклинга) делает пересборку
    // дешёвой, а слайдер коммитит примерно раз в кадр, так что пересборки
    // не копятся. синхронно, а не через rAF — изменение цвета/фигуры
    // применяется сразу
    rebuild();

    let resizeRaf = 0;
    const ro = new ResizeObserver(() => {
      // RO стреляет один раз при observe с текущим размером. только реальное
      // изменение размера должно сносить покров, схлопнутое в одну пересборку
      // на кадр
      const r = wrap.getBoundingClientRect();
      if (Math.round(r.width) === lastW && Math.round(r.height) === lastH) return;
      cancelAnimationFrame(raf);
      running = false;
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => rebuild());
    });
    ro.observe(wrap);

    const pets = pettable && !reduce;
    if (pets) {
      wrap.addEventListener("pointermove", onMove);
      wrap.addEventListener("pointerleave", onLeave);
    }

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeRaf);
      if (pets) {
        wrap.removeEventListener("pointermove", onMove);
        wrap.removeEventListener("pointerleave", onLeave);
      }
    };
  }, [color, shape, path, pathBox, text, fluff, density, mess, seed, padColor, pettable]);

  return (
    <div ref={wrapRef} className={className ? `fur ${className}` : "fur"} style={style}>
      <canvas ref={canvasRef} className="fur-canvas" aria-hidden="true" />
      {children != null && <div className="fur-content">{children}</div>}
    </div>
  );
}
