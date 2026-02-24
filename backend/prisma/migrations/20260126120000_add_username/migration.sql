-- AlterTable
ALTER TABLE "User"
ADD COLUMN "username" TEXT NOT NULL DEFAULT 'user_' || "id",
    ADD CONSTRAINT "User_username_key" UNIQUE ("username");