-- CreateEnum
CREATE TYPE "AuthorAdaptationKind" AS ENUM ('film', 'theatre', 'tv');

-- AlterTable
ALTER TABLE "authors" ADD COLUMN     "about_text" TEXT,
ADD COLUMN     "badge" TEXT,
ADD COLUMN     "hero_image_url" TEXT,
ADD COLUMN     "manifesto_author" TEXT,
ADD COLUMN     "manifesto_quote" TEXT,
ADD COLUMN     "manifesto_role" TEXT,
ADD COLUMN     "motto" TEXT;

-- CreateTable
CREATE TABLE "author_stats" (
    "id" SERIAL NOT NULL,
    "author_id" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "author_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "author_showcase" (
    "id" SERIAL NOT NULL,
    "author_id" INTEGER NOT NULL,
    "book_id" INTEGER NOT NULL,
    "pull_quote" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "author_showcase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "author_adaptations" (
    "id" SERIAL NOT NULL,
    "author_id" INTEGER NOT NULL,
    "kind" "AuthorAdaptationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "meta" TEXT,
    "description" TEXT,
    "url" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "author_adaptations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "author_press_quotes" (
    "id" SERIAL NOT NULL,
    "author_id" INTEGER NOT NULL,
    "quote" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_role" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "author_press_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "author_stats_author_id_idx" ON "author_stats"("author_id");

-- CreateIndex
CREATE INDEX "author_showcase_author_id_idx" ON "author_showcase"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "author_showcase_author_id_book_id_key" ON "author_showcase"("author_id", "book_id");

-- CreateIndex
CREATE INDEX "author_adaptations_author_id_idx" ON "author_adaptations"("author_id");

-- CreateIndex
CREATE INDEX "author_press_quotes_author_id_idx" ON "author_press_quotes"("author_id");

-- AddForeignKey
ALTER TABLE "author_stats" ADD CONSTRAINT "author_stats_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_showcase" ADD CONSTRAINT "author_showcase_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_showcase" ADD CONSTRAINT "author_showcase_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_adaptations" ADD CONSTRAINT "author_adaptations_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_press_quotes" ADD CONSTRAINT "author_press_quotes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
