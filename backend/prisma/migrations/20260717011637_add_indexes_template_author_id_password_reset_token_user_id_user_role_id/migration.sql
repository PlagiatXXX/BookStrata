-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "Template_author_id_idx" ON "Template"("author_id");

-- CreateIndex
CREATE INDEX "User_role_id_idx" ON "User"("role_id");
