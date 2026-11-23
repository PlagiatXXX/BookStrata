import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  findReadingDnaForOg,
  buildReadingDnaOgFallbackHtml,
} from "./readingDnaOg.service.js";

const HTML = "text/html; charset=utf-8";

export async function readingDnaRedirectRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/reading-dna",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as {
        ticket?: string;
        challenge?: string;
        duel?: string;
      };

      const challenge = query.challenge || query.duel;
      const ticketCode = challenge || query.ticket;
      const mode: "ticket" | "challenge" = challenge ? "challenge" : "ticket";

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
    },
  );
}
