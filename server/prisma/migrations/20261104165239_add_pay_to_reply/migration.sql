-- CreateTable
CREATE TABLE "PayToReplyInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emailId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "externalEmail" TEXT NOT NULL,
    "replyFee" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "replyToken" TEXT NOT NULL,
    "paidAt" DATETIME,
    "repliedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayToReplyInvitation_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PayToReplyInvitation_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Email" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "senderId" TEXT,
    "externalSenderEmail" TEXT,
    "externalSenderName" TEXT,
    "payToReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "replyFee" REAL NOT NULL DEFAULT 0,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isBin" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Email_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Email" ("body", "id", "isArchived", "isBin", "isDraft", "isStarred", "senderId", "sentAt", "subject") SELECT "body", "id", "isArchived", "isBin", "isDraft", "isStarred", "senderId", "sentAt", "subject" FROM "Email";
DROP TABLE "Email";
ALTER TABLE "new_Email" RENAME TO "Email";
CREATE INDEX "Email_senderId_idx" ON "Email"("senderId");
CREATE INDEX "Email_sentAt_idx" ON "Email"("sentAt");
CREATE INDEX "Email_isDraft_idx" ON "Email"("isDraft");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PayToReplyInvitation_replyToken_key" ON "PayToReplyInvitation"("replyToken");

-- CreateIndex
CREATE INDEX "PayToReplyInvitation_senderId_idx" ON "PayToReplyInvitation"("senderId");

-- CreateIndex
CREATE INDEX "PayToReplyInvitation_emailId_idx" ON "PayToReplyInvitation"("emailId");

-- CreateIndex
CREATE INDEX "PayToReplyInvitation_replyToken_idx" ON "PayToReplyInvitation"("replyToken");

-- CreateIndex
CREATE INDEX "PayToReplyInvitation_status_idx" ON "PayToReplyInvitation"("status");
