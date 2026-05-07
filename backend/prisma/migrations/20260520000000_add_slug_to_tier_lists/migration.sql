-- AlterTable
ALTER TABLE "tier_lists" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tier_lists_slug_key" ON "tier_lists"("slug");
