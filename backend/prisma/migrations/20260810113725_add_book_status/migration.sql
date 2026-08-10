-- CreateTable
CREATE TABLE "book_statuses" (
    "id" SERIAL NOT NULL,
    "bookId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "book_statuses_userId_status_idx" ON "book_statuses"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "book_statuses_bookId_userId_key" ON "book_statuses"("bookId", "userId");

-- AddForeignKey
ALTER TABLE "book_statuses" ADD CONSTRAINT "book_statuses_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_statuses" ADD CONSTRAINT "book_statuses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
