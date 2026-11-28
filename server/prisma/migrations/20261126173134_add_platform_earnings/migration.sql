-- CreateTable
CREATE TABLE "PlatformEarning" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "feeAmount" REAL NOT NULL,
    "depositAmount" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "PlatformEarning_source_idx" ON "PlatformEarning"("source");

-- CreateIndex
CREATE INDEX "PlatformEarning_createdAt_idx" ON "PlatformEarning"("createdAt");
