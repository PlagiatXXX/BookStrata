-- AlterTable
ALTER TABLE "User" ADD COLUMN     "chat_banned_at" TIMESTAMP(3),
ADD COLUMN     "chat_banned_until" TIMESTAMP(3),
ADD COLUMN     "suspended_at" TIMESTAMP(3),
ADD COLUMN     "suspended_until" TIMESTAMP(3),
ADD COLUMN     "suspension_reason" TEXT;

-- CreateTable
CREATE TABLE "user_warnings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "moderator_id" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_warnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_warnings_user_id_created_at_idx" ON "user_warnings"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "user_warnings" ADD CONSTRAINT "user_warnings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_warnings" ADD CONSTRAINT "user_warnings_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
