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
**Prevention:** Use Zod schemas with `zod-to-json-schema` to enforce strict length limits (e.g., 500 chars for prompts, 10MB for base64 avatars) at the routing level. Ensure error messages are consistent with the project's language (English for API errors).
