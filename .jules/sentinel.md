## 2026-03-28 - Authentication Hardening (Password Length & Secret Security)
**Vulnerability:** Weak minimum password length (4 characters) and hardcoded `JWT_SECRET` fallbacks in multiple modules.
**Learning:** The application had inconsistent password length requirements (4 for registration, 6 for updates) and insecure default secrets that could be used if environment variables were missing, despite a startup check in `server.ts`.
**Prevention:** Enforce a minimum of 8 characters for all password-related operations via Zod schemas and use non-null assertions or explicit checks for environment secrets to ensure the application fails fast and securely if they are missing.
