-- AlterTable
ALTER TABLE "User" ADD COLUMN     "donated_at" TIMESTAMP(3),
ADD COLUMN     "is_donor" BOOLEAN NOT NULL DEFAULT false;
