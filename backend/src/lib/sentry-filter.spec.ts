// Прод: Sentry получал 4xx (401/404/429/валидация) как «ошибки» и топил
// настоящие сбои в шуме. В отчёт должна попадать только серверная поломка.
import { describe, it, expect } from "vitest";
import { z, ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { errorStatusCode, shouldReportToSentry } from "./sentry-filter.js";
import {
  AppError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "./errors.js";

/** Настоящий ZodError: провалившийся parse */
const zodError = (): ZodError =>
  z.object({ email: z.string() }).safeParse({}).error as ZodError;

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("Ошибка Prisma", {
    code,
    clientVersion: "4.16.2",
  });

describe("shouldReportToSentry — что уходит в Sentry", () => {
  it("ожидаемые ошибки клиента не уходят: 401", () => {
    expect(shouldReportToSentry(new AuthenticationError())).toBe(false);
  });

  it("ожидаемые ошибки клиента не уходят: 404", () => {
    expect(shouldReportToSentry(new NotFoundError("Книга не найдена"))).toBe(false);
  });

  it("ожидаемые ошибки клиента не уходят: 429", () => {
    expect(shouldReportToSentry(new RateLimitError())).toBe(false);
  });

  it("ошибка валидации (Zod) не уходит", () => {
    expect(shouldReportToSentry(zodError())).toBe(false);
  });

  it("нарушение уникальности Prisma (409) не уходит", () => {
    expect(shouldReportToSentry(prismaError("P2002"))).toBe(false);
  });

  it("запись не найдена Prisma (404) не уходит", () => {
    expect(shouldReportToSentry(prismaError("P2025"))).toBe(false);
  });

  it("серверная ошибка приложения (500) уходит", () => {
    expect(shouldReportToSentry(new AppError(500, "INTERNAL_ERROR", "Сломалось"))).toBe(true);
  });

  it("неизвестная ошибка без statusCode уходит", () => {
    expect(shouldReportToSentry(new TypeError("undefined is not a function"))).toBe(true);
  });

  it("ошибка со statusCode 503 уходит", () => {
    expect(shouldReportToSentry(Object.assign(new Error("db down"), { statusCode: 503 }))).toBe(
      true,
    );
  });
});

describe("errorStatusCode — статус ответа для классификации", () => {
  it("берёт statusCode из ошибки приложения", () => {
    expect(errorStatusCode(new ValidationError("Неверный email"))).toBe(400);
  });

  it("для ошибки без статуса отдаёт 500", () => {
    expect(errorStatusCode(new Error("что-то"))).toBe(500);
  });

  it("распознаёт 404 у Prisma P2025", () => {
    expect(errorStatusCode(prismaError("P2025"))).toBe(404);
  });
});
