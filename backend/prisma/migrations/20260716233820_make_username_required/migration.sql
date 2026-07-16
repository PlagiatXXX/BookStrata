/*
  Warnings:

  - Made the column `username` on table `User` required.

*/
-- Убираем NULL-значения на случай, если они есть в production
UPDATE "User" SET username = 'user_' || id WHERE username IS NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
