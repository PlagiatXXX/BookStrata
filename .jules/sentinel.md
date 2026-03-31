# Sentinel's Journal 🛡️

## 2026-03-28 - Authentication Hardening (Password Length & Secret Security)
**Vulnerability:** Weak minimum password length (4 characters) and hardcoded `JWT_SECRET` fallbacks in multiple modules.
**Learning:** The application had inconsistent password length requirements (4 for registration, 6 for updates) and insecure default secrets that could be used if environment variables were missing, despite a startup check in `server.ts`.
**Prevention:** Enforce a minimum of 8 characters for all password-related operations via Zod schemas and use non-null assertions or explicit checks for environment secrets to ensure the application fails fast and securely if they are missing.

## 2026-03-30 - Password Hashing DoS Protection
**Vulnerability:** Missing maximum password length limits on login and profile update endpoints, creating a potential bcrypt-based Denial of Service (DoS) vector.
**Learning:** While registration had a 100-character limit, other endpoints (login, password change) did not. Bcrypt hashing is computationally expensive and its cost increases with input length, allowing an attacker to exhaust server CPU by sending extremely long strings.
**Prevention:** Always enforce a reasonable maximum length (e.g., 100 characters) for password fields in all Zod and JSON schemas across all authentication and user management endpoints.
