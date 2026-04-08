/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Middleware to protect routes that require authentication.
 * Relies on request.user being set by the global authPlugin,
 * which validates the token and refreshes the user's role from the DB.
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = (request as any).user;

  if (!user) {
    return reply.code(401).send({ error: "Unauthorized" });
  }
}
