/**
 * Vite plugin — асинхронная загрузка CSS, не блокирует рендеринг.
 *
 * Преобразует <link rel="stylesheet" href="..."> в:
 *   <link rel="preload" as="style" href="..." onload="this.onload=null;this.rel='stylesheet'">
 *   <noscript><link rel="stylesheet" href="..."></noscript>
 *
 * Должен быть зарегистрирован ПОСЛЕ sri-plugin (чтобы integrity хеш был уже проставлен).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/** @param {{ publicPath?: string }} opts */
export default function asyncCSSPlugin(opts = {}) {
  const { publicPath = "" } = opts;
  let config;

  return {
    name: "bookstrata:async-css",
    enforce: "post",
    apply: "build",

    configResolved(resolved) {
      config = resolved;
    },

    closeBundle() {
      const outDir = resolve(config.root, config.build.outDir);
      // Проверяем spa-index.html (prender мог скопировать index.html → spa-index.html)
      for (const name of ["index.html", "spa-index.html"]) {
        const htmlPath = resolve(outDir, name);
        let html;
        try {
          html = readFileSync(htmlPath, "utf-8");
        } catch {
          continue; // файла нет — пропускаем
        }

        const updated = html.replace(
          /<link\b([^>]*?)rel="stylesheet"([^>]*?)>/gi,
          (_, before, after) => {
            const attrs = `${before}${after}`.trim();
            return (
              `<link rel="preload" as="style" ${attrs} onload="this.onload=null;this.rel='stylesheet'">` +
              `<noscript><link rel="stylesheet" ${attrs}></noscript>`
            );
          },
        );

        if (updated !== html) {
          writeFileSync(htmlPath, updated, "utf-8");
        }
      }
    },
  };
}
