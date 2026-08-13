-- CreateEnum
CREATE TYPE "BookCatalogStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "BookSource" AS ENUM ('google_books', 'open_library', 'livelib', 'local');

-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "contextChain" JSONB,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "isbn" TEXT,
ADD COLUMN     "likesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "publishedYear" INTEGER,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "source" "BookSource",
ADD COLUMN     "status" "BookCatalogStatus" NOT NULL DEFAULT 'draft',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "BookPlacement" ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "thoughts" TEXT;

-- CreateTable
CREATE TABLE "book_slug_history" (
    "id" SERIAL NOT NULL,
    "oldSlug" TEXT NOT NULL,
    "bookId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_slug_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_comments" (
    "id" SERIAL NOT NULL,
    "bookId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" INTEGER,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_comment_likes" (
    "id" SERIAL NOT NULL,
    "commentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_comment_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_likes" (
    "id" SERIAL NOT NULL,
    "bookId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_books" (
    "id" SERIAL NOT NULL,
    "collectionId" INTEGER NOT NULL,
    "bookId" INTEGER NOT NULL,
    "tierId" TEXT,
    "rank" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "celebrity_books" (
    "id" SERIAL NOT NULL,
    "celebrityId" INTEGER NOT NULL,
    "bookId" INTEGER NOT NULL,
    "tierId" TEXT,
    "rank" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "celebrity_books_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "book_slug_history_oldSlug_key" ON "book_slug_history"("oldSlug");

-- CreateIndex
CREATE INDEX "book_comments_bookId_createdAt_idx" ON "book_comments"("bookId", "createdAt");

-- CreateIndex
CREATE INDEX "book_comments_userId_idx" ON "book_comments"("userId");

-- CreateIndex
CREATE INDEX "book_comment_likes_commentId_idx" ON "book_comment_likes"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "book_comment_likes_commentId_userId_key" ON "book_comment_likes"("commentId", "userId");

-- CreateIndex
CREATE INDEX "book_likes_bookId_idx" ON "book_likes"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "book_likes_bookId_userId_key" ON "book_likes"("bookId", "userId");

-- CreateIndex
CREATE INDEX "collection_books_bookId_idx" ON "collection_books"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "collection_books_collectionId_bookId_key" ON "collection_books"("collectionId", "bookId");

-- CreateIndex
CREATE INDEX "celebrity_books_bookId_idx" ON "celebrity_books"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "celebrity_books_celebrityId_bookId_key" ON "celebrity_books"("celebrityId", "bookId");

-- CreateIndex
CREATE UNIQUE INDEX "Book_slug_key" ON "Book"("slug");

-- CreateIndex
CREATE INDEX "Book_status_idx" ON "Book"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Book_source_externalId_key" ON "Book"("source", "externalId");

-- AddForeignKey
ALTER TABLE "book_slug_history" ADD CONSTRAINT "book_slug_history_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_comments" ADD CONSTRAINT "book_comments_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_comments" ADD CONSTRAINT "book_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_comments" ADD CONSTRAINT "book_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "book_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_comment_likes" ADD CONSTRAINT "book_comment_likes_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "book_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_comment_likes" ADD CONSTRAINT "book_comment_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_likes" ADD CONSTRAINT "book_likes_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_likes" ADD CONSTRAINT "book_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_books" ADD CONSTRAINT "collection_books_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_books" ADD CONSTRAINT "collection_books_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celebrity_books" ADD CONSTRAINT "celebrity_books_celebrityId_fkey" FOREIGN KEY ("celebrityId") REFERENCES "celebrities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celebrity_books" ADD CONSTRAINT "celebrity_books_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Raw SQL: GIN-индекс триграмм для fuzzy-матчинга (Фаза 1.1, seobook.md)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX books_trgm_idx ON "Book" USING gin (title gin_trgm_ops, author gin_trgm_ops);
