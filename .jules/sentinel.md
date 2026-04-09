## 2026-04-08 - Privilege Escalation via Stale JWT Roles
**Vulnerability:** Authorization bypass where demoted users (e.g., admin -> user) could still access admin endpoints using stale roles stored in their existing JWTs.
**Learning:** `authMiddleware` was running as a `preHandler` and overwriting the `request.user` object already securely populated by the global `authPlugin` (which fetches the fresh role from the database). By trusting the JWT payload over the database-backed user object, the system effectively ignored role revocations.
**Prevention:** Refactor authentication middlewares to act as guards that only verify the presence of `request.user` rather than re-parsing the JWT. Centralize role-based access control (RBAC) using dedicated middlewares (like `requireRole`) that operate on the already-authenticated user object.

## 2026-04-09 - Broken Object Level Authorization (BOLA) in Book Updates
**Vulnerability:** An authenticated user could modify any book record in the database by directly calling update endpoints with a victim's `bookId`.
**Learning:** The service layer functions `updateBook` and `updateBookCover` lacked relationship verification. They accepted a `bookId` and performed a direct database update without ensuring the book actually belonged to the tier list the user was authorized to edit.
**Prevention:** Enforce relationship checks in the service layer using Prisma's `findUniqueOrThrow` on join tables (like `BookPlacement`) using composite keys (`tierListId_bookId`). This ensures the sub-resource is strictly bound to the authorized parent resource.
