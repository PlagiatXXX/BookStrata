## 2026-03-29 - Hardcoded Secret and Weak Validation
**Vulnerability:** A hardcoded secret fallback for `JWT_SECRET` was found in `auth.service.ts`, and registration schemas had weak password requirements (min 4 chars) and no maximum length limits.
**Learning:** Hardcoded fallbacks undermine "fail-secure" principles. If the environment variable is missing, the application should crash at startup rather than using an insecure default. Missing `max` constraints on Zod schemas can lead to DoS via large payloads.
**Prevention:** Use non-null assertions (`!`) for mandatory environment variables in services after verifying them at startup in the entry point. Always include `max` constraints on string inputs for public-facing APIs.
