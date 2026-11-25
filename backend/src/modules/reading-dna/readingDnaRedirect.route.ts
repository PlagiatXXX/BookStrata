import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  findReadingDnaForOg,
  buildReadingDnaOgFallbackHtml,
} from "./readingDnaOg.service.js";

const HTML = "text/html; charset=utf-8";

type ReadingDnaOgQuery = {
  ticket?: string;
  challenge?: string;
  duel?: string;
  compare?: string;
  with?: string;
};

async function handleReadingDnaOg(
  request: FastifyRequest,
  reply: FastifyReply,
  forceChallenge = false,
) {
  const query = request.query as ReadingDnaOgQuery;

  const challenge = query.challenge || query.duel || query.compare || query.with;
  const ticketCode =
    query.challenge || query.duel || (forceChallenge ? query.ticket : undefined) || query.with || query.compare || query.ticket;
  const mode: "ticket" | "challenge" = forceChallenge || challenge ? "challenge" : "ticket";

  const ticket = ticketCode ? await findReadingDnaForOg(ticketCode) : null;
  const html = buildReadingDnaOgFallbackHtml({
    ticket,
    mode,
    queryParamValue: ticketCode,
  });

  return reply
    .header("Cache-Control", "public, max-age=300")
    .type(HTML)
    .send(html);
}

export async function readingDnaRedirectRoutes(fastify: FastifyInstance) {
  fastify.get("/reading-dna", async (request, reply) =>
    handleReadingDnaOg(request, reply, false),
  );
  fastify.get("/reading-dna/duel", async (request, reply) =>
    handleReadingDnaOg(request, reply, true),
  );
}
