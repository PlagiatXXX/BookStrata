-- AlterTable
ALTER TABLE "analytics_events" ADD COLUMN     "anonymous_id" TEXT,
ADD COLUMN     "browser" TEXT,
ADD COLUMN     "device_type" TEXT,
ADD COLUMN     "os" TEXT,
ADD COLUMN     "referrer" TEXT,
ADD COLUMN     "session_id" TEXT,
ADD COLUMN     "utm_campaign" TEXT,
ADD COLUMN     "utm_medium" TEXT,
ADD COLUMN     "utm_source" TEXT;

-- CreateTable
CREATE TABLE "analytics_daily_stats" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "metric_key" TEXT NOT NULL,
    "dimension" TEXT NOT NULL DEFAULT '',
    "count" INTEGER NOT NULL DEFAULT 0,
    "unique_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "analytics_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_daily_stats_date_idx" ON "analytics_daily_stats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_daily_stats_date_metric_key_dimension_key" ON "analytics_daily_stats"("date", "metric_key", "dimension");

-- CreateIndex
CREATE INDEX "analytics_events_userId_created_at_idx" ON "analytics_events"("userId", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_session_id_created_at_idx" ON "analytics_events"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_anonymous_id_created_at_idx" ON "analytics_events"("anonymous_id", "created_at");
