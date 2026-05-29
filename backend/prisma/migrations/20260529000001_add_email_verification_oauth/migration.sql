-- Add email verification, terms acceptance, and OAuth fields to User
ALTER TABLE "User" ADD COLUMN "email_verified_at" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "email_verification_token" TEXT;
ALTER TABLE "User" ADD COLUMN "email_verification_token_expires_at" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "accepted_terms_at" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "vk_id" TEXT;
ALTER TABLE "User" ADD COLUMN "google_id" TEXT;

-- Set email_verified_at for all existing users (backwards compatibility)
UPDATE "User" SET "email_verified_at" = NOW() WHERE "email_verified_at" IS NULL;

-- Create unique indexes
CREATE UNIQUE INDEX "User_email_verification_token_key" ON "User"("email_verification_token");
CREATE UNIQUE INDEX "User_vk_id_key" ON "User"("vk_id");
CREATE UNIQUE INDEX "User_google_id_key" ON "User"("google_id");
