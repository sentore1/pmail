-- AlterTable
ALTER TABLE "Contact" ADD COLUMN "lastEmailAt" DATETIME;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "chatExpiryMonths" INTEGER;
