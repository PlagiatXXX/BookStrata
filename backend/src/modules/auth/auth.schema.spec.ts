import { describe, it, expect } from "vitest";
import { loginBodySchema } from "./auth.schema.js";

describe("loginBodySchema", () => {
  it("принимает email длиной больше 30 символов в поле username (вход по email)", () => {
    const email = `${"a".repeat(40)}@example.com`;

    expect(() =>
      loginBodySchema.parse({ username: email, password: "password123" }),
    ).not.toThrow();
  });

  it("отклоняет пустой username", () => {
    expect(() =>
      loginBodySchema.parse({ username: "", password: "password123" }),
    ).toThrow();
  });

  it("отклоняет username длиннее 255 символов", () => {
    expect(() =>
      loginBodySchema.parse({ username: "a".repeat(256), password: "password123" }),
    ).toThrow();
  });
});
