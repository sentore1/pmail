-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlatformEarning" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "feeAmount" REAL NOT NULL,
    "depositAmount" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformEarning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PlatformEarning" ("createdAt", "depositAmount", "feeAmount", "id", "referenceId", "source", "userId") SELECT "createdAt", "depositAmount", "feeAmount", "id", "referenceId", "source", "userId" FROM "PlatformEarning";
DROP TABLE "PlatformEarning";
ALTER TABLE "new_PlatformEarning" RENAME TO "PlatformEarning";
CREATE INDEX "PlatformEarning_source_idx" ON "PlatformEarning"("source");
CREATE INDEX "PlatformEarning_createdAt_idx" ON "PlatformEarning"("createdAt");
CREATE INDEX "PlatformEarning_userId_idx" ON "PlatformEarning"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
