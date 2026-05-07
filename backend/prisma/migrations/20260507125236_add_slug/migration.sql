/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `tier_lists` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "tier_lists" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tier_lists_slug_key" ON "tier_lists"("slug");
