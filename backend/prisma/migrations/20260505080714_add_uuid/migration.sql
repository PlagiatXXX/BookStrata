/*
  Warnings:

  - The primary key for the `BookPlacement` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `battles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `news_articles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `tier_lists` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "BookPlacement" DROP CONSTRAINT "BookPlacement_tierListId_fkey";

-- DropForeignKey
ALTER TABLE "Tier" DROP CONSTRAINT "Tier_tierListId_fkey";

-- DropForeignKey
ALTER TABLE "TierListLike" DROP CONSTRAINT "TierListLike_tierListId_fkey";

-- DropForeignKey
ALTER TABLE "battle_participants" DROP CONSTRAINT "battle_participants_battle_id_fkey";

-- DropForeignKey
ALTER TABLE "battle_participants" DROP CONSTRAINT "battle_participants_tier_list_id_fkey";

-- DropForeignKey
ALTER TABLE "battle_votes" DROP CONSTRAINT "battle_votes_battle_id_fkey";

-- AlterTable
ALTER TABLE "BookPlacement" DROP CONSTRAINT "BookPlacement_pkey",
ALTER COLUMN "tierListId" SET DATA TYPE TEXT,
ADD CONSTRAINT "BookPlacement_pkey" PRIMARY KEY ("tierListId", "bookId");

-- AlterTable
ALTER TABLE "Tier" ALTER COLUMN "tierListId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "TierListLike" ALTER COLUMN "tierListId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "battle_participants" ALTER COLUMN "battle_id" SET DATA TYPE TEXT,
ALTER COLUMN "tier_list_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "battle_votes" ALTER COLUMN "battle_id" SET DATA TYPE TEXT,
ALTER COLUMN "tier_list_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "battles" DROP CONSTRAINT "battles_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "battles_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "battles_id_seq";

-- AlterTable
ALTER TABLE "news_articles" DROP CONSTRAINT "news_articles_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "news_articles_id_seq";

-- AlterTable
ALTER TABLE "tier_lists" DROP CONSTRAINT "tier_lists_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "tier_lists_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "tier_lists_id_seq";

-- AddForeignKey
ALTER TABLE "Tier" ADD CONSTRAINT "Tier_tierListId_fkey" FOREIGN KEY ("tierListId") REFERENCES "tier_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookPlacement" ADD CONSTRAINT "BookPlacement_tierListId_fkey" FOREIGN KEY ("tierListId") REFERENCES "tier_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_participants" ADD CONSTRAINT "battle_participants_battle_id_fkey" FOREIGN KEY ("battle_id") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_participants" ADD CONSTRAINT "battle_participants_tier_list_id_fkey" FOREIGN KEY ("tier_list_id") REFERENCES "tier_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_votes" ADD CONSTRAINT "battle_votes_battle_id_fkey" FOREIGN KEY ("battle_id") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierListLike" ADD CONSTRAINT "TierListLike_tierListId_fkey" FOREIGN KEY ("tierListId") REFERENCES "tier_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
