-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "age" INTEGER,
    "gender" TEXT,
    "country" TEXT,
    "knoccPrice" REAL NOT NULL DEFAULT 1.0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "walletBalance" REAL NOT NULL DEFAULT 0.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "trustScore" REAL DEFAULT 0,
    "riskLevel" TEXT DEFAULT 'UNKNOWN',
    "interests" TEXT,
    "socialPresence" BOOLEAN NOT NULL DEFAULT false,
    "autoApprove" BOOLEAN NOT NULL DEFAULT false,
    "requireReason" BOOLEAN NOT NULL DEFAULT true,
    "gmailAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
    "gmailRefreshToken" TEXT,
    "gmailLearnedTopics" TEXT,
    "gmailLastSynced" DATETIME
);
INSERT INTO "new_User" ("age", "autoApprove", "country", "createdAt", "email", "gender", "id", "interests", "knoccPrice", "name", "password", "phoneNumber", "requireReason", "riskLevel", "socialPresence", "trustScore", "updatedAt", "verified", "walletBalance") SELECT "age", "autoApprove", "country", "createdAt", "email", "gender", "id", "interests", "knoccPrice", "name", "password", "phoneNumber", "requireReason", "riskLevel", "socialPresence", "trustScore", "updatedAt", "verified", "walletBalance" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
