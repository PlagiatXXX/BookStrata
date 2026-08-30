-- AlterTable
ALTER TABLE "Book" ADD COLUMN "og_image_url" TEXT;

-- Создаём OG-изображения для существующих книг на основе обложек
-- (заполнение будет сделано скриптом после миграции)
