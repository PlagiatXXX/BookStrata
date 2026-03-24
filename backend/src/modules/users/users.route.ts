import type { FastifyInstance } from "fastify";
import {
  getMe,
  updateAvatar,
  deleteAvatar,
  getUserById,
  getUserStats,
  updateUser,
  changePassword,
} from "./users.service.js";
import { authMiddleware } from "../auth/auth.middleware.js";

export async function userRoutes(fastify: FastifyInstance) {
  // GET /api/users/me
  fastify.get(
    "/me",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }
      const user = await getMe(userId);
      return reply.code(200).send(user);
    },
  );

  // PUT /api/users/me
  fastify.put<{
    Body: { username: string };
  }>(
    "/me",
    {
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: "object",
          required: ["username"],
          properties: {
            username: { type: "string", minLength: 2, maxLength: 20 },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }
      const user = await updateUser(userId, request.body.username);
      fastify.log.info(
        { userId, username: request.body.username },
        "Username updated",
      );
      return reply.code(200).send(user);
    },
  );

  // GET /api/users/me/stats
  fastify.get(
    "/me/stats",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }
      const stats = await getUserStats(userId);
      return reply.code(200).send(stats);
    },
  );

  // GET /api/users/:id
  fastify.get<{
    Params: { id: string };
  }>("/:id", async (request, reply) => {
    const user = await getUserById(request.params);
    return reply.code(200).send(user);
  });

  // PUT /api/users/me/avatar
  fastify.put<{
    Body: { avatarUrl: string };
  }>(
    "/me/avatar",
    {
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: "object",
          required: ["avatarUrl"],
          properties: {
            avatarUrl: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }
      const user = await updateAvatar(userId, request.body.avatarUrl);
      fastify.log.info(
        { userId, avatar: request.body.avatarUrl },
        "Avatar updated",
      );
      return reply.code(200).send(user);
    },
  );

  // DELETE /api/users/me/avatar
  fastify.delete(
    "/me/avatar",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }
      const user = await deleteAvatar(userId);
      fastify.log.info({ userId }, "Avatar deleted");
      return reply.code(200).send(user);
    },
  );

  // PUT /api/users/me/password
  fastify.put<{
    Body: { current_password: string; new_password: string };
  }>(
    "/me/password",
    {
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: "object",
          required: ["current_password", "new_password"],
          properties: {
            current_password: { type: "string", minLength: 1 },
            new_password: { type: "string", minLength: 6 },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }
      const user = await changePassword(
        userId,
        request.body.current_password,
        request.body.new_password,
      );
      fastify.log.info({ userId }, "Password changed");
      return reply.code(200).send(user);
    },
  );
}
