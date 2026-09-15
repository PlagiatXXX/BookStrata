import { test, expect } from "@playwright/test";

test.describe("Rate Limiting", () => {
  test("7.1 Login rate limit headers", async ({ request }) => {
    const response = await request.post("http://localhost:8080/api/auth/login", {
      data: { username: "test", password: "test" },
    });
    const headers = response.headers();
    expect(headers["x-ratelimit-limit"]).toBeTruthy();
    expect(headers["x-ratelimit-remaining"]).toBeTruthy();
  });

  test("7.2 Register rate limit headers", async ({ request }) => {
    const response = await request.post("http://localhost:8080/api/auth/register", {
      data: { username: "test_ratelimit", email: "test@test.com", password: "Test123!", acceptedTerms: true },
    });
    const headers = response.headers();
    expect(headers["x-ratelimit-limit"]).toBeTruthy();
  });
});
