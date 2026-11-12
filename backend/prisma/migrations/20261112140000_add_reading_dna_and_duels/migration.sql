-- CreateTable
CREATE TABLE "reading_dna" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "guest_token" TEXT,
    "ticket_number" TEXT NOT NULL,
    "custom_name" TEXT,
    "archetype" TEXT NOT NULL,
    "archetype_name" TEXT NOT NULL,
    "archetype_desc" TEXT,
    "motto" TEXT,
    "story_focus" INTEGER NOT NULL DEFAULT 50,
    "emotional_weight" INTEGER NOT NULL DEFAULT 50,
    "pace" INTEGER NOT NULL DEFAULT 50,
    "darkness" INTEGER NOT NULL DEFAULT 50,
    "scope" INTEGER NOT NULL DEFAULT 50,
    "complexity" INTEGER NOT NULL DEFAULT 50,
    "favorite_books" JSONB NOT NULL,
    "kryptonite_book" JSONB,
    "favorite_book_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "kryptonite_book_id" INTEGER,
    "liked_genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "disliked_genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "favorite_authors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "share_url" TEXT,
    "short_code" TEXT,
    "qr_code_url" TEXT,
    "ticket_image_url" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "share_count" INTEGER NOT NULL DEFAULT 0,
    "duels_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_dna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_dna_duels" (
    "id" SERIAL NOT NULL,
    "target_dna_id" INTEGER NOT NULL,
    "challenger_dna_id" INTEGER,
    "challenger_name" TEXT,
    "compatibility" INTEGER NOT NULL,
    "verdict" TEXT,
    "breakdown" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reading_dna_duels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reading_dna_user_id_key" ON "reading_dna"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "reading_dna_guest_token_key" ON "reading_dna"("guest_token");

-- CreateIndex
CREATE UNIQUE INDEX "reading_dna_ticket_number_key" ON "reading_dna"("ticket_number");

-- CreateIndex
CREATE UNIQUE INDEX "reading_dna_short_code_key" ON "reading_dna"("short_code");

-- CreateIndex
CREATE INDEX "reading_dna_user_id_idx" ON "reading_dna"("user_id");

-- CreateIndex
CREATE INDEX "reading_dna_guest_token_idx" ON "reading_dna"("guest_token");

-- CreateIndex
CREATE INDEX "reading_dna_ticket_number_idx" ON "reading_dna"("ticket_number");

-- CreateIndex
CREATE INDEX "reading_dna_archetype_idx" ON "reading_dna"("archetype");

-- CreateIndex
CREATE INDEX "reading_dna_is_public_idx" ON "reading_dna"("is_public");

-- CreateIndex
CREATE INDEX "reading_dna_favorite_book_ids_idx" ON "reading_dna" USING GIN ("favorite_book_ids");

-- CreateIndex
CREATE INDEX "reading_dna_kryptonite_book_id_idx" ON "reading_dna"("kryptonite_book_id");

-- CreateIndex
CREATE INDEX "reading_dna_liked_genres_idx" ON "reading_dna" USING GIN ("liked_genres");

-- CreateIndex
CREATE INDEX "reading_dna_disliked_genres_idx" ON "reading_dna" USING GIN ("disliked_genres");

-- CreateIndex
CREATE INDEX "reading_dna_duels_target_dna_id_idx" ON "reading_dna_duels"("target_dna_id");

-- CreateIndex
CREATE INDEX "reading_dna_duels_challenger_dna_id_idx" ON "reading_dna_duels"("challenger_dna_id");

-- AddForeignKey
ALTER TABLE "reading_dna" ADD CONSTRAINT "reading_dna_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_dna_duels" ADD CONSTRAINT "reading_dna_duels_target_dna_id_fkey" FOREIGN KEY ("target_dna_id") REFERENCES "reading_dna"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_dna_duels" ADD CONSTRAINT "reading_dna_duels_challenger_dna_id_fkey" FOREIGN KEY ("challenger_dna_id") REFERENCES "reading_dna"("id") ON DELETE SET NULL ON UPDATE CASCADE;
