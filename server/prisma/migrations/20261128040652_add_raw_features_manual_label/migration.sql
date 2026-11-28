-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SuspiciousActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL DEFAULT '',
    "score" INTEGER NOT NULL,
    "flags" TEXT NOT NULL DEFAULT '',
    "verdict" TEXT NOT NULL,
    "manualLabel" TEXT,
    "shadowBanned" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT NOT NULL DEFAULT '',
    "rawFeatures" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_SuspiciousActivity" ("createdAt", "flags", "id", "ip", "score", "shadowBanned", "userAgent", "username", "verdict") SELECT "createdAt", "flags", "id", "ip", "score", "shadowBanned", "userAgent", "username", "verdict" FROM "SuspiciousActivity";
DROP TABLE "SuspiciousActivity";
ALTER TABLE "new_SuspiciousActivity" RENAME TO "SuspiciousActivity";
CREATE INDEX "SuspiciousActivity_ip_idx" ON "SuspiciousActivity"("ip");
CREATE INDEX "SuspiciousActivity_verdict_idx" ON "SuspiciousActivity"("verdict");
CREATE INDEX "SuspiciousActivity_createdAt_idx" ON "SuspiciousActivity"("createdAt");
CREATE INDEX "SuspiciousActivity_manualLabel_idx" ON "SuspiciousActivity"("manualLabel");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
