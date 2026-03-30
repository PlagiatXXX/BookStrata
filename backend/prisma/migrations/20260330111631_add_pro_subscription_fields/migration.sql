-- AlterTable
ALTER TABLE "User" ADD COLUMN     "is_pro" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pro_expires_at" TIMESTAMP(3);
