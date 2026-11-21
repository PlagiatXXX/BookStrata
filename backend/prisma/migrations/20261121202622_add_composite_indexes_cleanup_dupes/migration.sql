-- DropIndex
DROP INDEX "PasswordResetToken_token_idx";

-- DropIndex
DROP INDEX "authors_name_idx";

-- DropIndex
DROP INDEX "reading_dna_guest_token_idx";

-- DropIndex
DROP INDEX "reading_dna_ticket_number_idx";

-- DropIndex
DROP INDEX "reading_dna_user_id_idx";

-- CreateIndex
CREATE INDEX "Book_status_user_id_likesCount_idx" ON "Book"("status", "user_id", "likesCount");

-- CreateIndex
CREATE INDEX "Book_status_is_trending_idx" ON "Book"("status", "is_trending");

-- CreateIndex
CREATE INDEX "analytics_events_event_created_at_idx" ON "analytics_events"("event", "created_at");

-- CreateIndex
CREATE INDEX "celebrities_is_published_order_idx" ON "celebrities"("is_published", "order");

-- CreateIndex
CREATE INDEX "collections_is_published_order_idx" ON "collections"("is_published", "order");

-- CreateIndex
CREATE INDEX "tier_lists_is_public_likes_count_idx" ON "tier_lists"("is_public", "likes_count");

-- CreateIndex
CREATE INDEX "tier_lists_is_public_created_at_idx" ON "tier_lists"("is_public", "created_at");

