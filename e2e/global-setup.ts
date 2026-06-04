import type { FullConfig, Browser } from "@playwright/test";
import { execSync } from "child_process";

const FRONTEND_URL = "http://localhost:5173";
const API_BASE = "http://localhost:8080/api";

interface UserData {
  username: string;
  email: string;
  password: string;
}

async function registerUser(data: UserData) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: data.username,
      email: data.email,
      password: data.password,
      acceptedTerms: true,
    }),
  });

  if (!res.ok && res.status !== 409) {
    const body = await res.json();
    throw new Error(`[Setup] Register failed for ${data.username}: ${JSON.stringify(body)}`);
  }
}

async function loginAndSaveState(
  browser: Browser,
  username: string,
  password: string,
  statePath: string,
) {
  const context = await browser.newContext({ baseURL: FRONTEND_URL });
  const page = await context.newPage();

  await page.goto("/auth", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.waitForSelector("input[name=\"username\"]", { timeout: 10000 });

  await page.fill("input[name=\"username\"]", username);
  await page.fill("input[name=\"password\"]", password);
  await page.click("button[type=\"submit\"]");

  // Ждём редирект на dashboard
  await page.waitForURL("**/dashboard", { timeout: 10000 });

  // Даём время сохранить токен в localStorage
  await page.waitForTimeout(1000);

  // Проверяем, что токен сохранился
  const token = await page.evaluate(() => localStorage.getItem("authToken"));
  if (!token) {
    console.warn(`[Setup] No authToken after login for ${username}`);
  }

  await context.storageState({ path: statePath });
  await context.close();
}

export default async function globalSetup(_config: FullConfig) {
  const { chromium } = await import("playwright");

  const admin = { username: "e2e_chief", email: "e2e_chief@test.com", password: "StrongPass1!" };
  const user = { username: "e2e_member", email: "e2e_member@test.com", password: "StrongPass2!" };

  await registerUser(admin);
  await registerUser(user);

  // Повышаем админа
  try {
    execSync("npx tsx scripts/e2e-promote-admin.ts e2e_chief", {
      cwd: "backend",
      stdio: "pipe",
    });
    console.log("[Setup] Admin user promoted");
  } catch {
    console.warn("[Setup] Admin promotion skipped (maybe already admin)");
  }

  const browser = await chromium.launch();
  await loginAndSaveState(browser, admin.username, admin.password, "e2e/.auth/admin.json");
  await loginAndSaveState(browser, user.username, user.password, "e2e/.auth/user.json");
  await browser.close();

  console.log("[Setup] E2E users seeded and auth states saved");
}
