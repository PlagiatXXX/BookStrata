-- AlterTable
ALTER TABLE "User" ADD COLUMN     "last_activity_at" TIMESTAMP(3),
ADD COLUMN     "total_active_minutes" INTEGER NOT NULL DEFAULT 0;
