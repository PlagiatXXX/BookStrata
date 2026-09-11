// lib/safe-fetch.ts — единая SSRF-защита для всех fetch внешних URL.
// Паттерн вынесен из proxy.route.ts (образцовая реализация) и расширен:
//  - allowlist хостов (опционально)
//  - DNS-resolve с блокировкой private IP (RFC1918/loopback/link-local/metadata)
//  - запрет редиректов (иначе allowlist обходится через 3xx → private IP)
//  - таймаут на fetch + чтение тела
//  - лимит размера скачиваемого тела (анти-DoS по памяти)
import { isIP } from "node:net";
import { promises as dns } from "node:dns";
import { createLogger } from "./logger.js";

const logger = createLogger("SafeFetch", { color: "yellow" });

/** RFC 1918 + loopback + link-local + AWS metadata (169.254.0.0/16) */
export function isPrivateIP(ip: string): boolean {
  // IPv6 loopback и link-local
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::" ) return true;
  if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
  // IPv4-mapped IPv6 (::ffff:10.0.0.1)
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIP(mapped[1]!);

  const parts = ip.split(".").map(Number);
  if (parts.length !== 4) return false;
  const o1 = parts[0]!;
  const o2 = parts[1]!;
  const o3 = parts[2]!;
  const o4 = parts[3]!;
  if (Number.isNaN(o1) || Number.isNaN(o2) || Number.isNaN(o3) || Number.isNaN(o4)) return false;

  // 10.0.0.0/8
  if (o1 === 10) return true;
  // 172.16.0.0/12
  if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
  // 192.168.0.0/16
  if (o1 === 192 && o2 === 168) return true;
  // 127.0.0.0/8 (loopback)
  if (o1 === 127) return true;
  // 169.254.0.0/16 (link-local, AWS/GCP metadata)
  if (o1 === 169 && o2 === 254) return true;
  // 0.0.0.0/8 (this-host)
  if (o1 === 0) return true;

  return false;
}

export interface SafeFetchOptions {
  /** Разрешённые хосты (точное совпадение или поддомен). Пусто = все публичные хосты. */
  allowedHosts?: string[];
  /** Разрешить ли http (по умолчанию только https). */
  allowHttp?: boolean;
  /** Таймаут на fetch + чтение тела, мс. По умолчанию 15000. */
  timeoutMs?: number;
  /** Максимальный размер тела ответа, байт. По умолчанию 20MB. */
  maxBytes?: number;
  /** Разрешить редиректы (по умолчанию запрещены — allowlist обходится через 3xx). */
  allowRedirects?: boolean;
  /** Дополнительные заголовки запроса. */
  headers?: Record<string, string>;
}

class UnsafeUrlError extends Error {
  constructor(url: string) {
    super(`Запрещённый или недопустимый URL: ${url}`);
    this.name = "UnsafeUrlError";
  }
}

export { UnsafeUrlError };

/**
 * Проверяет URL перед fetch: протокол, allowlist, DNS-resolve против private IP.
 * Бросает UnsafeUrlError, если URL не проходит проверки.
 */
export async function assertSafeImageUrl(
  url: string,
  options: SafeFetchOptions = {},
): Promise<void> {
  const {
    allowedHosts,
    allowHttp = false,
  } = options;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new UnsafeUrlError(url);
  }

  // Только http/https (по умолчанию строгий https-only)
  const httpsOk = parsed.protocol === "https:";
  const httpOk = allowHttp && parsed.protocol === "http:";
  if (!httpsOk && !httpOk) {
    throw new UnsafeUrlError(url);
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  // Literal IP — проверяем сразу (DNS-резолв не нужен)
  if (isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      throw new UnsafeUrlError(url);
    }
    if (allowedHosts && !allowedHosts.some((h) => hostname === h)) {
      throw new UnsafeUrlError(url);
    }
    return;
  }

  // Allowlist хостов (если задан)
  if (
    allowedHosts &&
    !allowedHosts.some((h) => hostname === h || hostname.endsWith("." + h))
  ) {
    throw new UnsafeUrlError(url);
  }

  // DNS resolve — defence-in-depth: домен может указывать на private IP
  // (rebinding-защита на уровне резолва; полноценный rebind-гард требует
  // пиннинг IP в fetch, здесь принимаем осознанный компромисс)
  const addresses = await dns.resolve4(hostname).catch(() => [] as string[]);
  for (const addr of addresses) {
    if (isPrivateIP(addr)) {
      logger.warn(`DNS для ${hostname} указывает на private IP ${addr} — блокирую`);
      throw new UnsafeUrlError(url);
    }
  }
}

/**
 * Безопасный fetch внешнего ресурса: assertSafeImageUrl + redirect:"error" +
 * таймаут на всё (включая чтение тела) + лимит размера тела.
 * Возвращает Response с уже прочитанным безопасным буфером (arrayBuffer).
 */
export async function safeFetchToBuffer(
  url: string,
  options: SafeFetchOptions = {},
): Promise<{ buffer: Buffer; contentType: string }> {
  const {
    timeoutMs = 15_000,
    maxBytes = 20 * 1024 * 1024,
    allowRedirects = false,
    headers,
  } = options;

  await assertSafeImageUrl(url, options);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: allowRedirects ? "follow" : "error",
      headers: {
        "User-Agent": "BookStrata/1.0",
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch вернул ${response.status} для ${url}`);
    }

    // Читаем тело стримом со счётчиком байтов — лимит памяти (анти-DoS)
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > maxBytes) {
      throw new Error(`Тело ответа ${url} превышает лимит ${maxBytes} байт`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      const ab = await response.arrayBuffer();
      if (ab.byteLength > maxBytes) {
        throw new Error(`Тело ответа ${url} превышает лимит ${maxBytes} байт`);
      }
      return { buffer: Buffer.from(ab), contentType: response.headers.get("content-type") || "" };
    }

    const chunks: Buffer[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value?.byteLength || 0;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new Error(`Тело ответа ${url} превышает лимит ${maxBytes} байт`);
      }
      chunks.push(Buffer.from(value!));
    }

    return {
      buffer: Buffer.concat(chunks),
      contentType: response.headers.get("content-type") || "",
    };
  } finally {
    clearTimeout(timeout);
  }
}
