-- CreateTable
CREATE TABLE "emails" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "thread_id" TEXT,
    "subject" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT[],
    "cc" TEXT[],
    "bcc" TEXT[],
    "body_text" TEXT,
    "body_html" TEXT,
    "snippet" TEXT,
    "labels" TEXT[],
    "has_attachments" BOOLEAN NOT NULL DEFAULT false,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "received_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_syncs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "last_sync_at" TIMESTAMP(3),
    "sync_status" TEXT NOT NULL DEFAULT 'idle',
    "last_error" TEXT,
    "email_count" INTEGER NOT NULL DEFAULT 0,
    "next_page_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "emails_message_id_key" ON "emails"("message_id");

-- CreateIndex
CREATE INDEX "emails_user_id_idx" ON "emails"("user_id");

-- CreateIndex
CREATE INDEX "emails_organization_id_idx" ON "emails"("organization_id");

-- CreateIndex
CREATE INDEX "emails_received_at_idx" ON "emails"("received_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_syncs_user_id_key" ON "email_syncs"("user_id");

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_syncs" ADD CONSTRAINT "email_syncs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
