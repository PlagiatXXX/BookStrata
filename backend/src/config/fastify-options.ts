/**
 * Опции инстанса Fastify.
 *
 * Вынесены из server.ts, чтобы поведение доверия к прокси было
 * проверяемым тестом, а не зависело от «а вдруг кто-то поменяет в скрипте».
 */
import { config } from "./env.js";

export function buildFastifyOptions() {
  return {
    /**
     * Сервер стоит за одним nginx: без trustProxy Fastify видел адрес
     * контейнера nginx (172.18.0.5) и считал всех пользователей одним
     * клиентом — в том числе в лимите запросов.
     *
     * Значение — число хопов, а не `true`: `true` доверяет заголовку
     * X-Forwarded-For от кого угодно, и клиент подделал бы свой IP.
     */
    trustProxy: config.TRUST_PROXY_HOPS,
    ajv: {
      customOptions: {
        allowUnionTypes: true,
      },
    },
    logger: {
      level: config.NODE_ENV === "production" ? "info" : "debug",
      ...(config.NODE_ENV !== "production" && {
        transport: {
          target: "pino-pretty",
        },
      }),
    },
    bodyLimit: 30 * 1024 * 1024, // 30MB лимит для save-all с base64 изображениями
  };
}
