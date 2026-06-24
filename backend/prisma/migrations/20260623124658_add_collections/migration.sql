-- CreateTable
CREATE TABLE "collections" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT,
    "excerpt" TEXT,
    "cover_image_url" TEXT NOT NULL DEFAULT '',
    "book_covers" TEXT[],
    "tags" TEXT[],
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "tiers" JSONB,
    "tier_order" TEXT[],
    "books" JSONB,
    "unranked_book_ids" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "collections_slug_key" ON "collections"("slug");
