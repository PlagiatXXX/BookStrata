-- AlterTable
ALTER TABLE "Tier" ADD COLUMN     "label_color" TEXT,
ADD COLUMN     "label_size" TEXT NOT NULL DEFAULT 'sm',
ADD COLUMN     "label_style" TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN     "label_weight" TEXT NOT NULL DEFAULT 'black';
