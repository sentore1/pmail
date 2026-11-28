-- CreateTable
CREATE TABLE "User" (
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
    "autoApprove" BOOLEAN NOT NULL DEFAULT false,
    "requireReason" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Email" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isBin" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Email_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailRecipient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emailId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    CONSTRAINT "EmailRecipient_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmailRecipient_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KnoccRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "message" TEXT,
    "paymentAmount" REAL NOT NULL,
    "paymentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" DATETIME,
    CONSTRAINT "KnoccRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KnoccRequest_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "approvedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Contact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlockedUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "blockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlockedUser_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BlockedUser_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "inviteCode" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" DATETIME,
    CONSTRAINT "Invitation_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Email_senderId_idx" ON "Email"("senderId");

-- CreateIndex
CREATE INDEX "Email_sentAt_idx" ON "Email"("sentAt");

-- CreateIndex
CREATE INDEX "EmailRecipient_emailId_idx" ON "EmailRecipient"("emailId");

-- CreateIndex
CREATE INDEX "EmailRecipient_recipientId_idx" ON "EmailRecipient"("recipientId");

-- CreateIndex
CREATE INDEX "KnoccRequest_senderId_idx" ON "KnoccRequest"("senderId");

-- CreateIndex
CREATE INDEX "KnoccRequest_recipientId_idx" ON "KnoccRequest"("recipientId");

-- CreateIndex
CREATE INDEX "KnoccRequest_status_idx" ON "KnoccRequest"("status");

-- CreateIndex
CREATE INDEX "Contact_userId_idx" ON "Contact"("userId");

-- CreateIndex
CREATE INDEX "Contact_contactId_idx" ON "Contact"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_userId_contactId_key" ON "Contact"("userId", "contactId");

-- CreateIndex
CREATE INDEX "BlockedUser_blockerId_idx" ON "BlockedUser"("blockerId");

-- CreateIndex
CREATE INDEX "BlockedUser_blockedId_idx" ON "BlockedUser"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedUser_blockerId_blockedId_key" ON "BlockedUser"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_inviteCode_key" ON "Invitation"("inviteCode");

-- CreateIndex
CREATE INDEX "Invitation_senderId_idx" ON "Invitation"("senderId");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE INDEX "Invitation_inviteCode_idx" ON "Invitation"("inviteCode");

-- CreateIndex
CREATE INDEX "Invitation_status_idx" ON "Invitation"("status");
