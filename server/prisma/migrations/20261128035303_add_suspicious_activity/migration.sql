-- CreateTable
CREATE TABLE "SuspiciousActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL DEFAULT '',
    "score" INTEGER NOT NULL,
    "flags" TEXT NOT NULL DEFAULT '',
    "verdict" TEXT NOT NULL,
    "shadowBanned" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "SuspiciousActivity_ip_idx" ON "SuspiciousActivity"("ip");

-- CreateIndex
CREATE INDEX "SuspiciousActivity_verdict_idx" ON "SuspiciousActivity"("verdict");

-- CreateIndex
CREATE INDEX "SuspiciousActivity_createdAt_idx" ON "SuspiciousActivity"("createdAt");
