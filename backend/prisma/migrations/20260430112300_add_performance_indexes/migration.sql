-- CreateIndex
CREATE INDEX "BookPlacement_bookId_idx" ON "BookPlacement"("bookId");

-- CreateIndex
CREATE INDEX "User_xp_idx" ON "User"("xp");

-- CreateIndex
CREATE INDEX "tier_lists_userId_idx" ON "tier_lists"("userId");

-- CreateIndex
CREATE INDEX "tier_lists_userId_is_public_idx" ON "tier_lists"("userId", "is_public");

-- CreateIndex
CREATE INDEX "tier_lists_created_at_idx" ON "tier_lists"("created_at");

-- CreateIndex
CREATE INDEX "tier_lists_likes_count_idx" ON "tier_lists"("likes_count");
