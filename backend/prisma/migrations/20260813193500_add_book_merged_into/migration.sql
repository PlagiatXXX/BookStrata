-- DropIndex
DROP INDEX "books_trgm_idx";

-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "mergedIntoId" INTEGER;

