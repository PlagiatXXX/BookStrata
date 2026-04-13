## 2026-04-08 - Privilege Escalation via Stale JWT Roles
**Vulnerability:** Authorization bypass where demoted users (e.g., admin -> user) could still access admin endpoints using stale roles stored in their existing JWTs.
**Learning:** `authMiddleware` was running as a `preHandler` and overwriting the `request.user` object already securely populated by the global `authPlugin` (which fetches the fresh role from the database). By trusting the JWT payload over the database-backed user object, the system effectively ignored role revocations.
**Prevention:** Refactor authentication middlewares to act as guards that only verify the presence of `request.user` rather than re-parsing the JWT. Centralize role-based access control (RBAC) using dedicated middlewares (like `requireRole`) that operate on the already-authenticated user object.

## 2026-04-09 - Broken Object Level Authorization (BOLA) in Book Updates
**Vulnerability:** An authenticated user could modify any book record in the database by directly calling update endpoints with a victim's `bookId`.
**Learning:** The service layer functions `updateBook` and `updateBookCover` lacked relationship verification. They accepted a `bookId` and performed a direct database update without ensuring the book actually belonged to the tier list the user was authorized to edit.
**Prevention:** Enforce relationship checks in the service layer using Prisma's `findUniqueOrThrow` on join tables (like `BookPlacement`) using composite keys (`tierListId_bookId`). This ensures the sub-resource is strictly bound to the authorized parent resource.

## 2026-04-10 - BOLA in Tier List Forking
**Vulnerability:** Broken Object Level Authorization (BOLA) in the `forkTierList` function allowed any authenticated user to create a copy of any other user's private tier list by simply providing its ID.
**Learning:** While `findUniqueOrThrow` ensures the record exists, it doesn't inherently enforce ownership or visibility rules unless combined with a `where` clause that includes those constraints or a manual check after fetching. In this case, the `fork` operation missed a check to ensure the source list was either public or owned by the requester.
**Prevention:** Always implement explicit authorization checks in "copy" or "fork" operations. The target resource must be validated for visibility (e.g., `isPublic`) or ownership before proceeding with the duplication logic.

## 2026-04-11 - Sensitive API Key Leakage via Client-Side URLs
**Vulnerability:** External AI provider API keys (Pollinations) were being leaked to end-users because the backend generated a direct URL containing the secret and sent it to the client's browser.
**Learning:** Returning URLs that contain sensitive parameters (like API keys) directly to the client is a security risk. Even if intended for transient usage, these secrets can be intercepted, logged by the browser, or extracted from the DOM. Additionally, insecure fallbacks in upload utilities (like returning the original URL on error) can bypass security measures.
**Prevention:** Always proxy external media generation through the backend. Fetch the resource on the server, upload it to a secure storage (like Cloudinary), and only return the safe storage URL to the client. Ensure that failure modes (like rate limiting) do not fall back to exposing the original sensitive URL.

## 2026-04-13 - Stored XSS in News/Collections
**Vulnerability:** Malicious scripts could be injected into news article content and executed on the client-side because the frontend used `dangerouslySetInnerHTML` without backend-side HTML sanitization.
**Learning:** Even internal admin-only tools require input sanitization if the resulting data is rendered as raw HTML. Relying on "trusted users" is not a substitute for defense-in-depth.
**Prevention:** Always sanitize HTML content on the backend before saving to the database using a robust library like `sanitize-html`. Ensure the allowed tags list explicitly includes necessary media tags like `img` but excludes sensitive attributes like `id` (to prevent DOM clobbering).

## 2026-04-13 - Lockfile Integrity and Environment Constraints
**Vulnerability:** Inadvertent introduction of multiple lockfiles (`pnpm-lock.yaml` and `package-lock.json`) can lead to version drift and inconsistent builds across environments.
**Learning:** Even if memory says "pnpm exclusively", always verify the current state of the repo (presence of `package-lock.json`). In monorepos with inconsistent tool usage, respect the existing lockfile format to avoid breaking local development workflows.
**Prevention:** Before running install commands, check for existing lockfiles. If the project uses `npm`, use `npm install` to maintain the `package-lock.json`. Avoid using `pnpm` if the root contains a valid `package-lock.json`, unless explicitly migrating.
