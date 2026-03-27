## 2025-03-27 - Hardened Authentication and JWT Validation
**Vulnerability:** Weak password policy (min 4-6 chars), hardcoded JWT secret fallback, and loose JWT payload validation.
**Learning:** Multiple modules had redundant hardcoded secrets, and type casting (e.g., 'as TokenPayload') bypassed Zod validation for decoded tokens.
**Prevention:** Centralize secret verification in server startup and use Zod schemas (e.g., jwtPayloadSchema) for all deserialized data, even if it's cryptographically signed.
