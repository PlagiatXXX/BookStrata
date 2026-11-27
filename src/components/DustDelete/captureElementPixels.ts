import type { DustRect } from "./dustEngine";

export interface CapturedPixels {
  rect: DustRect;
  stepPx: number;
  pixels: Float32Array;
  colors: Uint32Array;
}

function parseRadius(radiusStr: string): number {
  const parsed = parseFloat(radiusStr);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function hasVisibleColor(color: string | null | undefined): boolean {
  if (!color) return false;
  if (color === "transparent" || color === "rgba(0, 0, 0, 0)") return false;
  return true;
}

function isImageReadable(img: HTMLImageElement): boolean {
  if (!img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) return false;
  try {
    const probe = document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    const ctx = probe.getContext("2d");
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, 1, 1);
    ctx.getImageData(0, 0, 1, 1);
    return true;
  } catch {
    return false;
  }
}

function resolveThemeFallbackColors(el: HTMLElement): [string, string, string] {
  const style = getComputedStyle(el);
  const bg =
    style.getPropertyValue("--theme-surface-3").trim() ||
    style.getPropertyValue("--tpl-surface").trim() ||
    "#1e293b";
  const accent =
    style.getPropertyValue("--theme-accent-primary").trim() ||
    style.getPropertyValue("--tpl-primary").trim() ||
    "#60a5fa";
  const accent2 =
    style.getPropertyValue("--theme-accent-secondary").trim() ||
    "#a855f7";
  return [bg, accent, accent2];
}

function drawRoundedBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  style: CSSStyleDeclaration,
): void {
  const bg = style.backgroundColor;
  const borderW = parseFloat(style.borderTopWidth) || 0;
  const borderCol = style.borderTopColor;
  const r = Math.min(radius, w / 2, h / 2);

  if (hasVisibleColor(bg)) {
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.fillStyle = bg;
    ctx.fill();
  }

  if (borderW > 0 && hasVisibleColor(borderCol)) {
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x + borderW / 2, y + borderW / 2, Math.max(0, w - borderW), Math.max(0, h - borderW), r);
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.lineWidth = borderW;
    ctx.strokeStyle = borderCol;
    ctx.stroke();
  }
}

/**
 * Синхронно растеризует DOM-элемент (фон, рамки, <img> с CORS-фолбэком, текст)
 * на offscreen-canvas и возвращает координаты + цвета пикселей с шагом stepPx.
 */
export function captureElementPixels(
  el: HTMLElement,
  stepPx = 2,
  maxDpr = 2,
): CapturedPixels | null {
  const domRect = el.getBoundingClientRect();
  if (domRect.width <= 0 || domRect.height <= 0) return null;

  const dpr = Math.min(maxDpr, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(domRect.width * dpr));
  canvas.height = Math.max(1, Math.round(domRect.height * dpr));

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const rootStyle = getComputedStyle(el);
  const rootRadius = parseRadius(rootStyle.borderRadius);

  // Ограничиваем отрисовку в пределах скруглённого контейнера
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(0, 0, domRect.width, domRect.height, rootRadius);
  } else {
    ctx.rect(0, 0, domRect.width, domRect.height);
  }
  ctx.clip();

  drawRoundedBox(ctx, 0, 0, domRect.width, domRect.height, rootRadius, rootStyle);

  // Если у корневого элемента прозрачный фон (например обложка без фона), зальём цветом темы под картинкой
  const [fallbackBg, fallbackAccent, fallbackAccent2] = resolveThemeFallbackColors(el);

  const elements = [el, ...Array.from(el.querySelectorAll<HTMLElement>("*"))];
  for (let i = 1; i < elements.length; i++) {
    const child = elements[i];
    const cs = getComputedStyle(child);
    if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) {
      continue;
    }
    const r = child.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;

    const x = r.left - domRect.left;
    const y = r.top - domRect.top;
    const rad = parseRadius(cs.borderRadius);

    drawRoundedBox(ctx, x, y, r.width, r.height, rad, cs);

    if (child instanceof HTMLImageElement) {
      if (isImageReadable(child)) {
        ctx.save();
        if (rad > 0) {
          ctx.beginPath();
          if (typeof ctx.roundRect === "function") {
            ctx.roundRect(x, y, r.width, r.height, rad);
          } else {
            ctx.rect(x, y, r.width, r.height);
          }
          ctx.clip();
        }
        ctx.drawImage(child, x, y, r.width, r.height);
        ctx.restore();
      } else {
        // Fallback-градиент в цветах темы при CORS-ограничении или ещё не загруженном изображении
        const grad = ctx.createLinearGradient(x, y, x + r.width, y + r.height);
        grad.addColorStop(0, fallbackBg);
        grad.addColorStop(0.6, fallbackAccent);
        grad.addColorStop(1, fallbackAccent2);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, r.width, r.height);
      }
    }
  }

  // Текстовые узлы
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node.textContent?.trim();
    const parent = node.parentElement;
    if (text && parent) {
      const ps = getComputedStyle(parent);
      if (ps.display !== "none" && ps.visibility !== "hidden" && parseFloat(ps.opacity) > 0) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const rects = range.getClientRects();
        if (rects.length > 0) {
          const lineRect = rects[0];
          const tx = lineRect.left - domRect.left;
          const ty = lineRect.top - domRect.top;
          ctx.fillStyle = ps.color || "#ffffff";
          ctx.font = `${ps.fontWeight} ${ps.fontSize} ${ps.fontFamily}`;
          ctx.textBaseline = "top";
          ctx.textAlign = "left";
          // Рисуем построчно по clientRects, если текст перенесён
          if (rects.length === 1) {
            ctx.fillText(node.textContent ?? "", tx, ty, Math.max(1, lineRect.width + 4));
          } else {
            ctx.fillText(text, tx, ty, Math.max(1, domRect.width - tx - 8));
          }
        }
      }
    }
    node = walker.nextNode();
  }

  ctx.restore();

  // На случай, если элемент не дал видимых пикселей (например, пустой контейнер)
  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    return null;
  }

  const d32 = new Uint32Array(imageData.data.buffer);
  const rawPts: number[] = [];
  const rawCols: number[] = [];

  for (let y = 0; y < domRect.height; y += stepPx) {
    for (let x = 0; x < domRect.width; x += stepPx) {
      const ix = Math.round(x * dpr);
      const iy = Math.round(y * dpr);
      if (ix < 0 || ix >= canvas.width || iy < 0 || iy >= canvas.height) continue;
      const col = d32[iy * canvas.width + ix];
      if ((col >>> 24) > 24) {
        rawPts.push(domRect.left + x, domRect.top + y);
        rawCols.push(col);
      }
    }
  }

  if (rawCols.length === 0) {
    // Синтетический fallback из палитры темы, чтобы эффект всегда был заметен
    const w = Math.max(8, Math.round(domRect.width));
    const h = Math.max(8, Math.round(domRect.height));
    const synthCanvas = document.createElement("canvas");
    synthCanvas.width = w;
    synthCanvas.height = h;
    const sg = synthCanvas.getContext("2d");
    if (!sg) return null;
    const grad = sg.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, fallbackBg);
    grad.addColorStop(1, fallbackAccent);
    sg.fillStyle = grad;
    sg.fillRect(0, 0, w, h);
    const s32 = new Uint32Array(sg.getImageData(0, 0, w, h).data.buffer);
    for (let y = 0; y < h; y += stepPx) {
      for (let x = 0; x < w; x += stepPx) {
        const col = s32[y * w + x];
        if ((col >>> 24) > 24) {
          rawPts.push(domRect.left + x, domRect.top + y);
          rawCols.push(col);
        }
      }
    }
  }

  return {
    rect: {
      left: domRect.left,
      top: domRect.top,
      width: domRect.width,
      height: domRect.height,
    },
    stepPx,
    pixels: new Float32Array(rawPts),
    colors: new Uint32Array(rawCols),
  };
}
