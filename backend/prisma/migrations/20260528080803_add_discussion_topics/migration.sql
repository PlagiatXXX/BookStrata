-- DropForeignKey
ALTER TABLE "discussions" DROP CONSTRAINT "discussions_battle_id_fkey";

-- DropIndex
DROP INDEX "discussions_battle_id_key";

-- AlterTable
ALTER TABLE "discussions" ADD COLUMN     "author_id" INTEGER,
ADD COLUMN     "last_message_at" TIMESTAMP(3),
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'topic';

-- CreateIndex
CREATE INDEX "discussions_type_last_message_at_idx" ON "discussions"("type", "last_message_at");

-- AddForeignKey
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
