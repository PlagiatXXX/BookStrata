-- DropForeignKey
ALTER TABLE "battles" DROP CONSTRAINT "battles_template_id_fkey";

-- AlterTable
ALTER TABLE "battles" ALTER COLUMN "template_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "battles" ADD CONSTRAINT "battles_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
