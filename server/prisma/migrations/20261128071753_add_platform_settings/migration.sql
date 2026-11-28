-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "activeGateway" TEXT NOT NULL DEFAULT 'MOMO',
    "updatedAt" DATETIME NOT NULL
);
