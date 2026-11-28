-- CreateTable
CREATE TABLE "EmailStar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emailId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "starredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailStar_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmailStar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailDelete" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emailId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deletedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailDelete_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmailDelete_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emailId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    CONSTRAINT "Attachment_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Email" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isBin" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Email_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Email" ("body", "id", "isArchived", "isBin", "isStarred", "senderId", "sentAt", "subject") SELECT "body", "id", "isArchived", "isBin", "isStarred", "senderId", "sentAt", "subject" FROM "Email";
DROP TABLE "Email";
ALTER TABLE "new_Email" RENAME TO "Email";
CREATE INDEX "Email_senderId_idx" ON "Email"("senderId");
CREATE INDEX "Email_sentAt_idx" ON "Email"("sentAt");
CREATE INDEX "Email_isDraft_idx" ON "Email"("isDraft");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "EmailStar_userId_idx" ON "EmailStar"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailStar_emailId_userId_key" ON "EmailStar"("emailId", "userId");

-- CreateIndex
CREATE INDEX "EmailDelete_userId_idx" ON "EmailDelete"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailDelete_emailId_userId_key" ON "EmailDelete"("emailId", "userId");

-- CreateIndex
CREATE INDEX "Attachment_emailId_idx" ON "Attachment"("emailId");
