-- CreateTable
CREATE TABLE "support_threads" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "guest_token" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "unread_by_user" INTEGER NOT NULL DEFAULT 0,
    "unread_by_admin" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" SERIAL NOT NULL,
    "thread_id" INTEGER NOT NULL,
    "sender_role" TEXT NOT NULL,
    "sender_id" INTEGER,
    "text" TEXT NOT NULL,
    "reply_to_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_threads_user_id_idx" ON "support_threads"("user_id");

-- CreateIndex
CREATE INDEX "support_threads_guest_token_idx" ON "support_threads"("guest_token");

-- CreateIndex
CREATE INDEX "support_threads_status_idx" ON "support_threads"("status");

-- CreateIndex
CREATE INDEX "support_threads_last_message_at_idx" ON "support_threads"("last_message_at");

-- CreateIndex
CREATE INDEX "support_messages_thread_id_idx" ON "support_messages"("thread_id");

-- CreateIndex
CREATE INDEX "support_messages_reply_to_id_idx" ON "support_messages"("reply_to_id");

-- CreateIndex
CREATE INDEX "support_messages_created_at_idx" ON "support_messages"("created_at");

-- AddForeignKey
ALTER TABLE "support_threads" ADD CONSTRAINT "support_threads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "support_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "support_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
