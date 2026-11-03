-- AlterTable
ALTER TABLE "User" ADD COLUMN "premiumUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PremiumWork" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "firstUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PremiumWork_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PremiumWork_userId_key_key" ON "PremiumWork"("userId", "key");

-- CreateIndex
CREATE INDEX "PremiumWork_userId_firstUsedAt_idx" ON "PremiumWork"("userId", "firstUsedAt");

-- AddForeignKey
ALTER TABLE "PremiumWork" ADD CONSTRAINT "PremiumWork_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
