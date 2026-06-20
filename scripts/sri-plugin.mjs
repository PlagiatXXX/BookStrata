/**
 * Custom SRI (Subresource Integrity) plugin for Vite.
 *
 * Добавляет integrity хеш к <script src> и <link rel="stylesheet" href>.
 * Работает после записи всех файлов на диск (writeBundle), чтобы хеш
 * точно совпадал с тем, что лежит в файле.
 *
 * НЕ добавляет crossorigin для same-origin ресурсов — это необходимо,
 * чтобы не ломать prerender и не требовать CORS-заголовков от nginx.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/** @param {{ publicPath?: string }} opts */
export default function sriPlugin(opts = {}) {
  const { publicPath = "" } = opts;
  let config;

  return {
    name: "bookstrata:sri",
    enforce: "post",
    apply: "build",

    configResolved(resolved) {
      config = resolved;
    },

    closeBundle() {
      const outDir = resolve(config.root, config.build.outDir);
      const htmlPath = resolve(outDir, "index.html");

      let html;
      try {
        html = readFileSync(htmlPath, "utf-8");
      } catch {
        return; // нет index.html — нечего обрабатывать
      }

      // <script src="..."></script>
      html = html.replace(
        /<script\s+([^>]*?)><\/script>/gi,
        (match, attrs) => processScriptTag(match, attrs, outDir, publicPath),
      );

      // <link rel="stylesheet" href="...">
      html = html.replace(
        /<link\s+([^>]*?)>/gi,
        (match, attrs) => processLinkTag(match, attrs, outDir, publicPath),
      );

      writeFileSync(htmlPath, html, "utf-8");
    },
  };
}

function processScriptTag(match, attrs, outDir, publicPath) {
  const src = extractAttr(attrs, "src");
  if (!src) return match;

  const filePath = resolvePath(src, publicPath, outDir);
  const integrity = computeIntegrity(filePath);
  if (!integrity) return match;

  let clean = removeSriAttrs(attrs);
  const crossorigin = isCrossOrigin(src) ? ' crossorigin="anonymous"' : "";

  return `<script ${clean} integrity="${integrity}"${crossorigin}></script>`;
}

function processLinkTag(match, attrs, outDir, publicPath) {
  const rel = extractAttr(attrs, "rel");
  const href = extractAttr(attrs, "href");
  if (rel !== "stylesheet" || !href) return match;

  const filePath = resolvePath(href, publicPath, outDir);
  const integrity = computeIntegrity(filePath);
  if (!integrity) return match;

  let clean = removeSriAttrs(attrs);
  const crossorigin = isCrossOrigin(href) ? ' crossorigin="anonymous"' : "";

  return `<link ${clean} integrity="${integrity}"${crossorigin}>`;
}

function extractAttr(attrs, name) {
  const re = new RegExp(`${name}="([^"]*)"`, "i");
  const m = attrs.match(re);
  return m ? m[1] : null;
}

function resolvePath(url, publicPath, outDir) {
  // Абсолютный путь от publicPath (например, /assets/foo.js)
  // или прямой URL — пропускаем, если это внешний ресурс
  if (isCrossOrigin(url)) return null;
  // Убираем publicPath (обычно "/")
  const relative = publicPath && url.startsWith(publicPath)
    ? url.slice(publicPath.length)
    : url;
  return resolve(outDir, relative);
}

function computeIntegrity(filePath) {
  if (!filePath) return null;
  try {
    const buf = readFileSync(filePath);
    return `sha384-${createHash("sha384").update(buf).digest("base64")}`;
  } catch {
    return null;
  }
}

function isCrossOrigin(url) {
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("//")
  );
}

function removeSriAttrs(attrs) {
  return attrs
    .replace(/\s+integrity="[^"]*"/gi, "")
    .replace(/\s+crossorigin="[^"]*"/gi, "")
    .replace(/\s+crossorigin\b(?!\s*=\s*["'])/gi, "");
}
