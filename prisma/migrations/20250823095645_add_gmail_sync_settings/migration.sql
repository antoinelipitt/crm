-- CreateTable
CREATE TABLE "gmail_sync_settings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "max_emails_per_sync" INTEGER NOT NULL DEFAULT 50,
    "sync_from_days" INTEGER NOT NULL DEFAULT 30,
    "use_incremental_sync" BOOLEAN NOT NULL DEFAULT true,
    "auto_sync_enabled" BOOLEAN NOT NULL DEFAULT false,
    "auto_sync_interval" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "gmail_sync_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gmail_sync_settings_organization_id_key" ON "gmail_sync_settings"("organization_id");

-- AddForeignKey
ALTER TABLE "gmail_sync_settings" ADD CONSTRAINT "gmail_sync_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
