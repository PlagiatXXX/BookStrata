-- CreateTable
CREATE TABLE "battle_applications" (
    "id" SERIAL NOT NULL,
    "battle_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "tier_list_id" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "battle_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "battle_applications_battle_id_status_idx" ON "battle_applications"("battle_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "battle_applications_user_id_battle_id_key" ON "battle_applications"("user_id", "battle_id");

-- AddForeignKey
ALTER TABLE "battle_applications" ADD CONSTRAINT "battle_applications_battle_id_fkey" FOREIGN KEY ("battle_id") REFERENCES "battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_applications" ADD CONSTRAINT "battle_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_applications" ADD CONSTRAINT "battle_applications_tier_list_id_fkey" FOREIGN KEY ("tier_list_id") REFERENCES "tier_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
