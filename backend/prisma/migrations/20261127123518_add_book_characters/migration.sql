-- CreateEnum
CREATE TYPE "CharacterRole" AS ENUM ('protagonist', 'antagonist', 'supporting', 'minor');

-- CreateTable
CREATE TABLE "characters" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "universe_slug" TEXT,
    "traits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_characters" (
    "id" SERIAL NOT NULL,
    "book_id" INTEGER NOT NULL,
    "character_id" INTEGER NOT NULL,
    "role" "CharacterRole" NOT NULL DEFAULT 'supporting',
    "summary" TEXT NOT NULL,
    "traits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "book_characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_character_relations" (
    "id" SERIAL NOT NULL,
    "from_id" INTEGER NOT NULL,
    "to_id" INTEGER NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "book_character_relations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "characters_slug_key" ON "characters"("slug");

-- CreateIndex
CREATE INDEX "characters_name_idx" ON "characters"("name");

-- CreateIndex
CREATE INDEX "characters_universe_slug_idx" ON "characters"("universe_slug");

-- CreateIndex
CREATE INDEX "characters_aliases_idx" ON "characters" USING GIN ("aliases");

-- CreateIndex
CREATE INDEX "book_characters_book_id_sort_order_idx" ON "book_characters"("book_id", "sort_order");

-- CreateIndex
CREATE INDEX "book_characters_character_id_idx" ON "book_characters"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "book_characters_book_id_character_id_key" ON "book_characters"("book_id", "character_id");

-- CreateIndex
CREATE INDEX "book_character_relations_to_id_idx" ON "book_character_relations"("to_id");

-- CreateIndex
CREATE UNIQUE INDEX "book_character_relations_from_id_to_id_label_key" ON "book_character_relations"("from_id", "to_id", "label");

-- AddForeignKey
ALTER TABLE "book_characters" ADD CONSTRAINT "book_characters_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_characters" ADD CONSTRAINT "book_characters_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_character_relations" ADD CONSTRAINT "book_character_relations_from_id_fkey" FOREIGN KEY ("from_id") REFERENCES "book_characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_character_relations" ADD CONSTRAINT "book_character_relations_to_id_fkey" FOREIGN KEY ("to_id") REFERENCES "book_characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

