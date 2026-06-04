import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { PrismaClient } from "@prisma/client";
import authPlugin from "../../plugins/auth.js";
import requestContext from "../../plugins/requestContext.js";

import { authRoutes } from "../../modules/auth/auth.route.js";
import { tierListRoutes } from "../../modules/tier-lists/tierList.route.js";
import { userRoutes } from "../../modules/users/users.route.js";
import { ratingsRoutes } from "../../modules/ratings/ratings.route.js";
import { discussionRoutes } from "../../modules/discussions/discussions.route.js";
import { battleRoutes } from "../../modules/battles/battles.route.js";
import { feedbackRoutes } from "../../modules/feedback/feedback.route.js";
import { forumRoutes } from "../../modules/forum/forum.route.js";
import { newsRoutes } from "../../modules/news/news.route.js";
import { achievementRoutes } from "../../modules/achievements/achievements.route.js";
import { donorRoutes } from "../../modules/donors/donors.route.js";
import { moderationRoutes } from "../../modules/moderation/moderation.route.js";
import { rolesRoutes } from "../../modules/roles/roles.route.js";
import { sitemapRoutes } from "../../modules/sitemap/sitemap.route.js";
import { externalNewsRoutes } from "../../modules/external-news/external-news.route.js";
import { subscriptionsRoutes } from "../../modules/subscriptions/subscriptions.routes.js";
import templatesPlugin from "../../modules/templates/templates.plugin.js";
import { adminCleanupRoutes } from "../../modules/admin/admin-cleanup.route.js";
import adminStatsRoutes from "../../modules/admin-stats/admin-stats.route.js";

export interface TestContext {
  fastify: Fastify.FastifyInstance;
  prisma: PrismaClient;
}

const REQUIRED_ROLES = ["user", "admin", "moderator"];

export async function seedRoles(prisma: PrismaClient) {
  for (const name of REQUIRED_ROLES) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: `Role ${name}` },
    });
  }
}

export async function createTestServer(): Promise<TestContext> {
  const prisma = new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL },
    },
  });

  await seedRoles(prisma);

  const fastify = Fastify({ logger: false });

  await fastify.register(cors, { origin: true });
  await fastify.register(cookie);
  await fastify.register(rateLimit, { max: 1000, timeWindow: "1 minute" });

  fastify.decorate("prisma", prisma);

  await fastify.register(authPlugin);
  await fastify.register(requestContext);

  // Регистрация роутов
  await fastify.register(authRoutes, { prefix: "/api/auth" });
  await fastify.register(tierListRoutes, { prefix: "/api/tier-lists" });
  await fastify.register(userRoutes, { prefix: "/api/users" });
  await fastify.register(ratingsRoutes, { prefix: "/api/ratings" });
  await fastify.register(discussionRoutes, { prefix: "/api/discussions" });
  await fastify.register(battleRoutes, { prefix: "/api/battles" });
  await fastify.register(feedbackRoutes, { prefix: "/api/feedback" });
  await fastify.register(forumRoutes, { prefix: "/api/forum" });
  await fastify.register(newsRoutes, { prefix: "/api/news" });
  await fastify.register(achievementRoutes, { prefix: "/api/achievements" });
  await fastify.register(donorRoutes, { prefix: "/api/donors" });
  await fastify.register(moderationRoutes, { prefix: "/api/moderation" });
  await fastify.register(rolesRoutes, { prefix: "/api" });
  await fastify.register(sitemapRoutes);
  await fastify.register(externalNewsRoutes, { prefix: "/api/external-news" });
  await fastify.register(subscriptionsRoutes, { prefix: "/api/subscriptions" });
  await fastify.register(templatesPlugin, { prisma, prefix: "/api" });
  await fastify.register(adminCleanupRoutes, { prefix: "/api/admin" });
  await fastify.register(adminStatsRoutes, { prefix: "/api/admin" });

  await fastify.ready();

  return { fastify, prisma };
}

export async function cleanupDatabase(prisma: PrismaClient) {
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;

  const tables = tablenames
    .map((t) => t.tablename)
    .filter((t) => t !== "_prisma_migrations");

  for (const table of tables) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "public"."${table}" CASCADE;`,
    );
  }
}

export function registerUser(
  fastify: Fastify.FastifyInstance,
  username: string,
  email: string,
  password: string,
) {
  return fastify.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: {
      username,
      email,
      password,
      acceptedTerms: true,
    },
  });
}

export function loginUser(
  fastify: Fastify.FastifyInstance,
  username: string,
  password: string,
) {
  return fastify.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username, password },
  });
}

export function createTierList(
  fastify: Fastify.FastifyInstance,
  token: string,
  title: string,
) {
  return fastify.inject({
    method: "POST",
    url: "/api/tier-lists",
    headers: { Authorization: `Bearer ${token}` },
    payload: { title },
  });
}

export function getTierList(
  fastify: Fastify.FastifyInstance,
  token: string,
  id: string,
) {
  return fastify.inject({
    method: "GET",
    url: `/api/tier-lists/${id}`,
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function deleteTierList(
  fastify: Fastify.FastifyInstance,
  token: string,
  id: string,
) {
  return fastify.inject({
    method: "DELETE",
    url: `/api/tier-lists/${id}`,
    headers: { Authorization: `Bearer ${token}` },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractToken(response: any): string {
  const body = JSON.parse(response.body);
  const data = body.data || body;
  return data.accessToken || data.token || "";
}

export function getMe(fastify: Fastify.FastifyInstance, token: string) {
  return fastify.inject({
    method: "GET",
    url: "/api/users/me",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateUsername(fastify: Fastify.FastifyInstance, token: string, username: string) {
  return fastify.inject({
    method: "PUT",
    url: "/api/users/me",
    headers: { Authorization: `Bearer ${token}` },
    payload: { username },
  });
}

export function changePassword(
  fastify: Fastify.FastifyInstance,
  token: string,
  currentPassword: string,
  newPassword: string,
) {
  return fastify.inject({
    method: "PUT",
    url: "/api/users/me/password",
    headers: { Authorization: `Bearer ${token}` },
    payload: { current_password: currentPassword, new_password: newPassword },
  });
}
