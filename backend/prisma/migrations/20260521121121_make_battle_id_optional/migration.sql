-- DropIndex
DROP INDEX "battle_applications_user_id_battle_id_key";

-- AlterTable
ALTER TABLE "battle_applications" ALTER COLUMN "battle_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "battle_applications_user_id_status_idx" ON "battle_applications"("user_id", "status");
