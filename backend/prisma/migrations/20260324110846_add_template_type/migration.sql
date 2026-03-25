-- AlterTable
ALTER TABLE "Template" ADD COLUMN     "type" TEXT;

-- CreateIndex
CREATE INDEX "Template_type_idx" ON "Template"("type");
