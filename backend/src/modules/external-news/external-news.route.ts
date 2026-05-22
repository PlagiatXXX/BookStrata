import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify"
import { ExternalNewsService } from "./external-news.service.js"
import { createLogger } from "../../lib/logger.js"
import { ErrorCodes, createApiError } from "../../lib/api-response.js"

const logger = createLogger("ExternalNewsRoute", { color: "cyan" })

export async function externalNewsRoutes(fastify: FastifyInstance) {
  const service = new ExternalNewsService()

  /**
   * GET /api/external-news
   * Получить книжные новости из внешних источников (RSS)
   */
  fastify.get(
    "/",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { limit } = request.query as { limit?: string }
        const items = await service.getBooksNews(
          limit ? parseInt(limit, 10) : 6,
        )
        return reply.send({ data: items })
      } catch (error) {
        logger.error("Ошибка получения внешних новостей", { error })
        return reply
          .code(500)
          .send(createApiError(ErrorCodes.EXTERNAL_SERVICE_ERROR, "Ошибка при получении внешних новостей"))
      }
    },
  )
}
