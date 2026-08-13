-- AlterTable
ALTER TABLE "Book" DROP COLUMN "thoughts";


-- Raw SQL: восстановление GIN-индекса триграмм (был удалён diff-миграцией add_book_merged_into,
-- т.к. Prisma diff не знает про raw SQL-индексы; создаём заново — Фаза 1.1)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS books_trgm_idx ON "Book" USING gin (title gin_trgm_ops, author gin_trgm_ops);

-- Raw SQL: partial unique index для локальных книг (решение 12.08)
-- Создаётся ПОСЛЕ дедупликации (dedupe-books.ts): дев 482 → 475, дублей нет.
-- Конкурентная защита: два параллельных INSERT локальной книги → P2002 → retry → link (Фаза 2.1)
CREATE UNIQUE INDEX books_local_identity_idx ON "Book" (lower(trim(title)), COALESCE("authorId", 0)) WHERE source IS NULL;
