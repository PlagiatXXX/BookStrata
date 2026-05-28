-- CreateTable
CREATE TABLE "content_flags" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "flag_type" TEXT NOT NULL DEFAULT 'avatar',
    "target_id" TEXT,
    "nsfw_score" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" INTEGER,

    CONSTRAINT "content_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_flags_user_id_idx" ON "content_flags"("user_id");

-- CreateIndex
CREATE INDEX "content_flags_status_idx" ON "content_flags"("status");

-- AddForeignKey
ALTER TABLE "content_flags" ADD CONSTRAINT "content_flags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_flags" ADD CONSTRAINT "content_flags_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
