ALTER TABLE "Project"
ADD COLUMN "healthEndpoint" TEXT,
ADD COLUMN "rateLimitRequests" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN "rateLimitWindowSeconds" INTEGER NOT NULL DEFAULT 60;

ALTER TABLE "RequestLog"
ADD COLUMN "requestId" TEXT,
ADD COLUMN "method" TEXT NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "path" TEXT NOT NULL DEFAULT '/',
ADD COLUMN "ip" TEXT;

UPDATE "RequestLog"
SET "requestId" = 'req_' || md5(random()::text || clock_timestamp()::text || "id")
WHERE "requestId" IS NULL;

ALTER TABLE "RequestLog"
ALTER COLUMN "requestId" SET NOT NULL,
ALTER COLUMN "method" DROP DEFAULT,
ALTER COLUMN "path" DROP DEFAULT;

CREATE UNIQUE INDEX "RequestLog_requestId_key" ON "RequestLog"("requestId");
CREATE INDEX "RequestLog_projectId_path_createdAt_idx" ON "RequestLog"("projectId", "path", "createdAt");
CREATE INDEX "RequestLog_projectId_statusCode_createdAt_idx" ON "RequestLog"("projectId", "statusCode", "createdAt");
