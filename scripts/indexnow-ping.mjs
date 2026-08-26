#!/usr/bin/env node
/**
 * IndexNow ping — уведомление поисковиков (Яндекс и др.) о новых/обновлённых
 * страницах сразу после деплоя. Яндекс — участник IndexNow, это ускоряет
 * обход молодых доменов, у которых мало краулингового бюджета.
 *
 * Логика:
 *  1. Берём sitemap (файл или URL).
 *  2. Сравниваем {url → lastmod} с состоянием прошлого пинга (.indexnow-state.json).
 *  3. Новые/изменившиеся URL отправляем в IndexNow API батчами по ≤10k.
 *  4. При успехе сохраняем состояние; при ошибке состояние не трогаем.
 *
 * Ключ лежит в scripts/indexnow.key, его публичная копия — в public/<key>.txt
 * (Yandex проверяет владение хостом по https://bookstrata.ru/<key>.txt).
 *
 * Использование (внутри deploy-server.sh):
 *   node scripts/indexnow-ping.mjs \
 *     --sitemap https://bookstrata.ru/sitemap.xml \
 *     --state .indexnow-state.json
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_URLS_PER_REQUEST = 10_000;

/** Извлекает из sitemap-XML хост и карту {url → lastmod | undefined}. */
export function parseSitemap(xml) {
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  if (locs.length === 0) {
    throw new Error("В sitemap не найдено ни одного <loc>");
  }

  const lastmod = {};
  const urlRe = /<url>([\s\S]*?)<\/url>/g;
  let match;
  while ((match = urlRe.exec(xml)) !== null) {
    const block = match[1];
    const loc = block.match(/<loc>\s*([^<\s]+)\s*<\/loc>/)?.[1];
    if (!loc) continue;
    lastmod[loc] = block.match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/)?.[1];
  }

  let host;
  try {
    host = new URL(locs[0]).host;
  } catch {
    throw new Error(`Не удалось определить хост из URL: ${locs[0]}`);
  }
  return { host, lastmod };
}

/**
 * Возвращает URL, которых не было в прошлом пинге или чей lastmod изменился.
 * previousState === null → первый запуск, пингуем всё.
 */
export function selectChangedUrls(currentLastmod, previousState) {
  if (!previousState || !previousState.lastmod) return Object.keys(currentLastmod);

  const prev = previousState.lastmod;
  return Object.keys(currentLastmod).filter(
    (url) => prev[url] !== currentLastmod[url],
  );
}

/** Режет список на батчи лимита IndexNow. */
export function chunkUrls(urls, size = MAX_URLS_PER_REQUEST) {
  const chunks = [];
  for (let i = 0; i < urls.length; i += size) {
    chunks.push(urls.slice(i, i + size));
  }
  return chunks;
}

export function buildPayload(host, key, urlList) {
  return { host, key, urlList };
}

/** POST в IndexNow API. Возвращает {ok, status}. Не бросает исключений. */
export async function pingIndexNow(payload, fetchImpl = fetch, endpoint = DEFAULT_ENDPOINT) {
  try {
    const res = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    // 200 OK / 202 Accepted — оба означают, что URL приняты
    return { ok: res.status === 200 || res.status === 202, status: res.status };
  } catch (err) {
    console.error(`[indexnow] Сетевая ошибка: ${err.message}`);
    return { ok: false, status: null };
  }
}

function parseArgs(argv) {
  const args = {
    sitemap: "https://bookstrata.ru/sitemap.xml",
    state: join(SCRIPT_DIR, "..", ".indexnow-state.json"),
    key: readFileSync(join(SCRIPT_DIR, "indexnow.key"), "utf8").trim(),
    endpoint: DEFAULT_ENDPOINT,
  };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--sitemap": args.sitemap = argv[++i]; break;
      case "--state": args.state = argv[++i]; break;
      case "--key": args.key = argv[++i]; break;
      case "--endpoint": args.endpoint = argv[++i]; break;
      default:
        throw new Error(`Неизвестный аргумент: ${argv[i]}`);
    }
  }
  return args;
}

async function loadSitemap(source) {
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Sitemap ${source} вернул HTTP ${res.status}`);
    return res.text();
  }
  return readFileSync(source, "utf8");
}

/**
 * Точка входа. Возвращает код процесса: 0 — успех (или нечего пинговать),
 * 1 — ошибка. fetchImpl внедряется для тестов.
 */
export async function main(argv = process.argv.slice(2), fetchImpl = fetch) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    console.error(`[indexnow] ${err.message}`);
    return 1;
  }

  try {
    const xml = await loadSitemap(args.sitemap);
    const { host, lastmod } = parseSitemap(xml);

    let previousState = null;
    try {
      previousState = JSON.parse(readFileSync(args.state, "utf8"));
    } catch {
      // файла состояния нет — первый запуск
    }

    const changed = selectChangedUrls(lastmod, previousState);
    if (changed.length === 0) {
      console.log("[indexnow] Изменений с прошлого пинга нет — запрос не отправлялся");
      return 0;
    }

    const batches = chunkUrls(changed);
    for (const [i, batch] of batches.entries()) {
      const payload = buildPayload(host, args.key, batch);
      const { ok, status } = await pingIndexNow(payload, fetchImpl, args.endpoint);
      if (!ok) {
        console.error(
          `[indexnow] API отклонил батч ${i + 1}/${batches.length} (HTTP ${status}). Состояние не сохранено.`,
        );
        return 1;
      }
      console.log(`[indexnow] Батч ${i + 1}/${batches.length}: отправлено ${batch.length} URL`);
    }

    writeFileSync(
      args.state,
      JSON.stringify({ sentAt: new Date().toISOString(), lastmod }, null, 2),
    );
    console.log(`[indexnow] Готово: всего отправлено ${changed.length} URL, состояние обновлено`);
    return 0;
  } catch (err) {
    console.error(`[indexnow] Ошибка: ${err.message}`);
    return 1;
  }
}

// Запуск как CLI — при импорте из тестов main не выполняется
const isCli = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isCli) {
  main().then((code) => process.exit(code));
}
