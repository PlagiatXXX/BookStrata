import "fastify";
import { PrismaClient } from "@prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }

  interface FastifyRequest {
    user: {
      userId: number;
      username: string;
      role?: string;
    } | null;
  }
}
