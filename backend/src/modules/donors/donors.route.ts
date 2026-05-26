import type { FastifyInstance } from 'fastify'
import { authMiddleware } from '../auth/auth.middleware.js'
import { requireRole } from '../../middleware/requireRole.js'
import { ErrorCodes, createApiError } from '../../lib/api-response.js'
import { getDonors, addDonor, deleteDonor } from './donors.service.js'

export async function donorRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, reply) => {
    const donors = await getDonors()
    return reply.code(200).send({ data: donors })
  })

  fastify.post(
    '/',
    {
      preHandler: [authMiddleware, requireRole('admin')],
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { name } = request.body as { name: string }
      const donor = await addDonor(name)
      return reply.code(201).send({ data: donor })
    },
  )

  fastify.delete(
    '/:id',
    {
      preHandler: [authMiddleware, requireRole('admin')],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: number }
      try {
        await deleteDonor(id)
        return reply.code(204).send()
      } catch {
        return reply.code(404).send(createApiError(ErrorCodes.NOT_FOUND, 'Донатер не найден'))
      }
    },
  )
}
