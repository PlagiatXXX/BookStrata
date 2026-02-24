-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "avatar_url" TEXT,
    "ai_avatars_generated" INTEGER NOT NULL DEFAULT 0,
    "last_avatar_reset_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "cover_image_url" TEXT NOT NULL,
    "description" TEXT,
    "thoughts" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tier_lists" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tier_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tier" (
    "id" SERIAL NOT NULL,
    "tierListId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#808080',
    "rank" INTEGER NOT NULL,

    CONSTRAINT "Tier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookPlacement" (
    "tierListId" INTEGER NOT NULL,
    "bookId" INTEGER NOT NULL,
    "tierId" INTEGER,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "BookPlacement_pkey" PRIMARY KEY ("tierListId","bookId")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "tiers" JSONB NOT NULL,
    "default_books" JSONB,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "author_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TierListLike" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tierListId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TierListLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateLike" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Tier_tierListId_rank_idx" ON "Tier"("tierListId", "rank");

-- CreateIndex
CREATE INDEX "BookPlacement_tierId_rank_idx" ON "BookPlacement"("tierId", "rank");

-- CreateIndex
CREATE INDEX "TierListLike_tierListId_idx" ON "TierListLike"("tierListId");

-- CreateIndex
CREATE UNIQUE INDEX "TierListLike_userId_tierListId_key" ON "TierListLike"("userId", "tierListId");

-- CreateIndex
CREATE INDEX "TemplateLike_templateId_idx" ON "TemplateLike"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateLike_userId_templateId_key" ON "TemplateLike"("userId", "templateId");

-- AddForeignKey
ALTER TABLE "tier_lists" ADD CONSTRAINT "tier_lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tier" ADD CONSTRAINT "Tier_tierListId_fkey" FOREIGN KEY ("tierListId") REFERENCES "tier_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookPlacement" ADD CONSTRAINT "BookPlacement_tierListId_fkey" FOREIGN KEY ("tierListId") REFERENCES "tier_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookPlacement" ADD CONSTRAINT "BookPlacement_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookPlacement" ADD CONSTRAINT "BookPlacement_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "Tier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierListLike" ADD CONSTRAINT "TierListLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierListLike" ADD CONSTRAINT "TierListLike_tierListId_fkey" FOREIGN KEY ("tierListId") REFERENCES "tier_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateLike" ADD CONSTRAINT "TemplateLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateLike" ADD CONSTRAINT "TemplateLike_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
