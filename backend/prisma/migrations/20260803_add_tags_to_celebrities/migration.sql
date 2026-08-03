-- Add tags column to celebrities table for SEO interlinking
ALTER TABLE "celebrities" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
