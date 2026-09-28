-- Add SEO meta description for author landing pages (/authors/:slug)
ALTER TABLE "authors" ADD COLUMN "seo_description" TEXT;
