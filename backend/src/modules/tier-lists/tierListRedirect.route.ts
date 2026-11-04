// backend/src/modules/tier-lists/tierListRedirect.route.ts
// Публичный GET /tier-lists/:slug (без /api префикса).
// nginx проксирует сюда запросы /tier-lists/*, если на диске нет статического файла пререндера:
//   1) /tier-lists/new → SPA-каркас создания тир-листа (200),
//   2) несуществующий/удалённый slug → 404 со статусом 404 и noindex (не 200 Soft 404!),
//   3) запрос по UUID при наличии slug → 301 редирект на канонический /tier-lists/:slug,
//   4) приватный тир-лист (isPublic: false) или 0 книг → SPA-каркас с noindex, nofollow,
//   5) актуальный пререндеренный тир-лист → готовый статический HTML,
//   6) свежий публичный тир-лист без пререндера → SEO-фолбэк (meta из БД + spa-каркас).
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  isSafeSlug,
  isUuid,
  findTierListBySlugOrId,
  getPrerenderedTierListPage,
  getSpaIndexHtml,
  buildNotFoundHtml,
  buildPrivateOrEmptyTierListHtml,
  buildTierListSeoFallbackHtml,
} from "./tierListRedirect.service.js";

const HTML = "text/html; charset=utf-8";

export async function tierListRedirectRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/tier-lists/:slug",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { slug } = request.params as { slug: string };

      if (!isSafeSlug(slug)) {
        return reply.code(404).type(HTML).send(buildNotFoundHtml());
      }

      // 1) Роут создания нового тир-листа — отдаём чистый SPA-каркас
      if (slug === "new") {
        const spa = getSpaIndexHtml();
        return reply.type(HTML).send(spa || buildPrivateOrEmptyTierListHtml());
      }

      // 2) Поиск тир-листа в базе данных
      const tierList = await findTierListBySlugOrId(slug);

      // Не существует или удалён → честный 404 Not Found со статусом 404 и noindex!
      if (!tierList) {
        return reply.code(404).type(HTML).send(buildNotFoundHtml());
      }

      // 3) Запрос по старому UUID, когда у тир-листа есть slug → 301 редирект на канонический URL
      if (isUuid(slug) && tierList.slug && tierList.slug !== slug) {
        return reply.redirect(`/tier-lists/${tierList.slug}`, 301);
      }

      // 4) Приватный тир-лист или пустой (0 книг / Thin content)
      // Владелец в браузере видит SPA, но роботы Google получают noindex, nofollow
      if (!tierList.isPublic || tierList.booksCount === 0) {
        return reply.type(HTML).send(buildPrivateOrEmptyTierListHtml());
      }

      // 5) Готовый пререндер на диске (если попал в пререндер-пайплайн)
      const targetSlug = tierList.slug || tierList.id;
      const prerendered = getPrerenderedTierListPage(targetSlug);
      if (prerendered) {
        return reply.type(HTML).send(prerendered);
      }

      // 6) Свежий тир-лист с книгами без пререндера → SEO-фолбэк
      return reply.type(HTML).send(buildTierListSeoFallbackHtml(tierList));
    },
  );
}
