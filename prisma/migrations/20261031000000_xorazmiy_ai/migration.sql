-- CreateEnum
CREATE TYPE "AiKnowledgeKind" AS ENUM ('GUIDE', 'CHECKLIST', 'STYLE', 'EXAMPLE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AiCheckType" ADD VALUE 'PLAN';
ALTER TYPE "AiCheckType" ADD VALUE 'ASSIST';
ALTER TYPE "AiCheckType" ADD VALUE 'CITATIONS';
ALTER TYPE "AiCheckType" ADD VALUE 'TRANSLATE';
ALTER TYPE "AiCheckType" ADD VALUE 'CHAT';

-- DropIndex
DROP INDEX "Draft_userId_idx";

-- AlterTable
ALTER TABLE "Draft" ADD COLUMN     "aiFeaturesUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "articleType" "ArticleType" NOT NULL DEFAULT 'RESEARCH',
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "references" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "text" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "wordCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aiCredits" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AiKnowledge" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" "AiKnowledgeKind" NOT NULL,
    "articleType" "ArticleType",
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiKnowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiFeedback" (
    "id" TEXT NOT NULL,
    "aiCheckId" TEXT,
    "userId" TEXT,
    "feature" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "note" TEXT,
    "payload" JSONB,
    "promoted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiKnowledge_key_key" ON "AiKnowledge"("key");

-- CreateIndex
CREATE INDEX "AiKnowledge_active_articleType_idx" ON "AiKnowledge"("active", "articleType");

-- CreateIndex
CREATE INDEX "AiFeedback_feature_createdAt_idx" ON "AiFeedback"("feature", "createdAt");

-- CreateIndex
CREATE INDEX "AiCheck_draftId_type_idx" ON "AiCheck"("draftId", "type");

-- CreateIndex
CREATE INDEX "Draft_userId_updatedAt_idx" ON "Draft"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiKnowledge" ADD CONSTRAINT "AiKnowledge_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiFeedback" ADD CONSTRAINT "AiFeedback_aiCheckId_fkey" FOREIGN KEY ("aiCheckId") REFERENCES "AiCheck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiFeedback" ADD CONSTRAINT "AiFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

