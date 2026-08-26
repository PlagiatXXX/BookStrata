-- AlterTable
ALTER TABLE "BookPlacement" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Бэкфилл: существующие размещения получают дату последнего изменения своего тир-листа
UPDATE "BookPlacement" bp
SET "created_at" = tl."updated_at"
FROM "tier_lists" tl
WHERE bp."tierListId" = tl."id";
