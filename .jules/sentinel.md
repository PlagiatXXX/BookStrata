# Sentinel's Journal 🛡️

## 2026-03-28 - Authentication Hardening (Password Length & Secret Security)
**Vulnerability:** Weak minimum password length (4 characters) and hardcoded `JWT_SECRET` fallbacks in multiple modules.
**Learning:** The application had inconsistent password length requirements (4 for registration, 6 for updates) and insecure default secrets that could be used if environment variables were missing, despite a startup check in `server.ts`.
**Prevention:** Enforce a minimum of 8 characters for all password-related operations via Zod schemas and use non-null assertions or explicit checks for environment secrets to ensure the application fails fast and securely if they are missing.

## 2026-03-30 - Password Hashing DoS Protection
**Vulnerability:** Missing maximum password length limits on login and profile update endpoints, creating a potential bcrypt-based Denial of Service (DoS) vector.
**Learning:** While registration had a 100-character limit, other endpoints (login, password change) did not. Bcrypt hashing is computationally expensive and its cost increases with input length, allowing an attacker to exhaust server CPU by sending extremely long strings.
**Prevention:** Always enforce a reasonable maximum length (e.g., 100 characters) for password fields in all Zod and JSON schemas across all authentication and user management endpoints.

## 2026-03-31 - [Password Recovery Implementation]
**Vulnerability:** Users had no way to recover lost passwords, potentially leading to permanent account loss.
**Learning:** Implemented a secure, token-based password reset flow. Tokens are high-entropy (32 bytes), short-lived (1 hour), and linked to a specific user. Password updates are atomic and clear all existing reset tokens.
**Prevention:** Added `forgot-password` and `reset-password` endpoints and UI pages. Integrated `nodemailer` for delivery.

## 2026-04-01 - Avatar Route Hardening (DoS Protection)
**Vulnerability:** Missing input validation and length limits on avatar generation and upload routes, allowing for potential resource exhaustion and database bloat.
**Learning:** Even though manual validation was present in some service layers, the API layer (Fastify) lacked schemas, allowing oversized payloads (like multi-megabyte base64 strings or extremely long AI prompts) to be processed.
**Prevention:** Use Zod schemas with `zod-to-json-schema` to enforce strict length limits (e.g., 500 chars for prompts, 10MB for base64 avatars) at the routing level. Ensure error messages and comments follow the project's localization standards (Russian in this case).

## 2026-04-03 - News Detail IDOR Protection
**Vulnerability:** Insecure Direct Object Reference (IDOR) in news articles where draft/unpublished content was accessible by ID to anyone.
**Learning:** While the list endpoint (`GET /api/news`) correctly filtered unpublished content, the detail endpoint (`GET /api/news/:id`) did not, allowing unauthenticated users to view sensitive upcoming announcements.
**Prevention:** Always implement "secure-by-default" patterns in service methods (e.g., passing `publishedOnly: true` as a default option) and enforce role-based checks in the routing layer for all detail views. When using Prisma, use `findFirst` instead of `findUnique` to allow combined filtering by ID and visibility status.

## 2026-04-06 - Sensitive Endpoint Rate Limiting
**Vulnerability:** Lack of specific rate limiting on authentication and password recovery endpoints, potentially allowing brute-force or email flooding attacks.
**Learning:** While a global rate limit was present, it was too permissive (100 req/min) for sensitive operations like registration or password resets. Fastify's `@fastify/rate-limit` plugin allows for granular route-level configuration via the `config` object.
**Prevention:** Always apply stricter, specific rate limits to endpoints that involve expensive computations (bcrypt) or external resource usage (email sending).

## 2026-04-07 - Secure Password Reset Restoration & Hardening
**Vulnerability:** Insecure password recovery mechanism that immediately reset user passwords to a temporary plain-text value sent via email, potentially allowing unauthorized account locking or exposure if the email is intercepted.
**Learning:** Reverted from an insecure instant-reset method to a secure, high-entropy token-based confirmation link flow. This ensures passwords are only changed when the user explicitly clicks a short-lived, single-use link. Also addressed email enumeration by using generic success messages in the `forgot-password` route.
**Prevention:** Always use high-entropy (e.g., 32-byte) tokens for sensitive flows like password resets. Avoid revealing account existence in response messages for public endpoints like `forgot-password`. Apply strict rate limits (e.g., 5/hr) to all components of the auth recovery flow.
