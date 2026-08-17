-- Модель «личные книги» (решение 18.08):
-- каждая книга из тир-листа принадлежит конкретному пользователю (user_id),
-- каталог (published) всегда user_id = NULL и не пересекается с тир-листами.

-- 1. Владелец личной книги
ALTER TABLE "Book" ADD COLUMN "user_id" INTEGER;

-- 2. FK: удаление пользователя каскадит его личные книги (и их дочерние связи)
ALTER TABLE "Book"
  ADD CONSTRAINT "Book_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Уникальность внешнего ID разделена по мирам:
--    раньше один (source, externalId) был на всех — это запрещало личные копии.
DROP INDEX "Book_source_externalId_key";

-- Каталог (user_id IS NULL): один внешний ID = одна каталоговая книга
CREATE UNIQUE INDEX "books_catalog_ext_key"
  ON "Book"("source", "externalId")
  WHERE "user_id" IS NULL;

-- Личные книги: один внешний ID = одна книга пользователя
CREATE UNIQUE INDEX "books_user_ext_key"
  ON "Book"("user_id", "source", "externalId")
  WHERE "user_id" IS NOT NULL;

-- 4. Быстрая выборка книг владельца (матчинг «своих»)
CREATE INDEX "Book_userId_idx" ON "Book"("user_id");