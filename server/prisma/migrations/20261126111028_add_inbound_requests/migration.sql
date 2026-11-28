-- CreateTable
CREATE TABLE "InboundRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipientId" TEXT NOT NULL,
    "externalEmail" TEXT NOT NULL,
    "externalName" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "inboundFee" REAL NOT NULL DEFAULT 0,
    "payToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" DATETIME,
    "acceptedAt" DATETIME,
    "declinedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailId" TEXT,
    CONSTRAINT "InboundRequest_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InboundRequest_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

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
    "chatExpiryMonths" INTEGER,
    "inboundFee" REAL NOT NULL DEFAULT 0.0,
    "gmailAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
    "gmailRefreshToken" TEXT,
    "gmailLearnedTopics" TEXT,
    "gmailLastSynced" DATETIME
);
INSERT INTO "new_User" ("age", "autoApprove", "chatExpiryMonths", "country", "createdAt", "email", "gender", "gmailAccessEnabled", "gmailLastSynced", "gmailLearnedTopics", "gmailRefreshToken", "id", "interests", "knoccPrice", "name", "password", "phoneNumber", "requireReason", "riskLevel", "socialPresence", "trustScore", "updatedAt", "verified", "walletBalance") SELECT "age", "autoApprove", "chatExpiryMonths", "country", "createdAt", "email", "gender", "gmailAccessEnabled", "gmailLastSynced", "gmailLearnedTopics", "gmailRefreshToken", "id", "interests", "knoccPrice", "name", "password", "phoneNumber", "requireReason", "riskLevel", "socialPresence", "trustScore", "updatedAt", "verified", "walletBalance" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "InboundRequest_payToken_key" ON "InboundRequest"("payToken");

-- CreateIndex
CREATE UNIQUE INDEX "InboundRequest_emailId_key" ON "InboundRequest"("emailId");

-- CreateIndex
CREATE INDEX "InboundRequest_recipientId_idx" ON "InboundRequest"("recipientId");

-- CreateIndex
CREATE INDEX "InboundRequest_payToken_idx" ON "InboundRequest"("payToken");

-- CreateIndex
CREATE INDEX "InboundRequest_status_idx" ON "InboundRequest"("status");

-- CreateIndex
CREATE INDEX "InboundRequest_externalEmail_idx" ON "InboundRequest"("externalEmail");
