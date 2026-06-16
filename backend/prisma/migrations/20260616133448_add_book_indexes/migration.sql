-- CreateIndex
CREATE INDEX "Book_genre_idx" ON "Book"("genre");

-- CreateIndex
CREATE INDEX "Book_tags_idx" ON "Book" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "Book_title_author_idx" ON "Book"("title", "author");
