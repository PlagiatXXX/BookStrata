// backend/src/modules/bookPages/bookRedirect.route.ts
// Публичный GET /books/:slug (без /api префикса). nginx проксирует /books/* на бэк:
// пререндеренные книги отдаёт статикой (try_files), всё остальное — сюда:
//   1) старый slug (BookSlugHistory) → 301 на актуальный,
//   2) книга без пререндера → SEO-фолбэк (meta из БД + spa-каркас),
//   3) неизвестный/draft slug → 404 (noindex).
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  isSafeSlug,
  resolveSlugRedirect,
  findPublishedBookBySlug,
  getPrerenderedBookPage,
  buildSeoFallbackHtml,
  buildNotFoundHtml,
} from "./bookRedirect.service.js";

const HTML = "text/html; charset=utf-8";

export async function bookRedirectRoutes(fastify: FastifyInstance) {
  fastify.get("/books/:slug", async (request: FastifyRequest, reply: FastifyReply) => {
    const { slug } = request.params as { slug: string };
    if (!isSafeSlug(slug)) {
      return reply.code(404).type(HTML).send(buildNotFoundHtml());
    }

    // 1) История slug: старый URL не отдаёт 404, а перенаправляет на актуальный.
    const currentSlug = await resolveSlugRedirect(slug);
    if (currentSlug && currentSlug !== slug) {
      return reply.redirect(`/books/${currentSlug}`, 301);
    }

    // 2) Книга должна быть published — иначе 404.
    const book = await findPublishedBookBySlug(slug);
    if (!book) {
      return reply.code(404).type(HTML).send(buildNotFoundHtml());
    }

    // 3) Пререндер (попал в prerender-пайплайн) — отдаём готовый HTML.
    const prerendered = getPrerenderedBookPage(book.slug);
    if (prerendered) {
      return reply.type(HTML).send(prerendered);
    }

    // 4) SEO-фолбэк: корректные title/description/canonical уже в стартовом HTML.
    return reply.type(HTML).send(buildSeoFallbackHtml(book));
  });
}
