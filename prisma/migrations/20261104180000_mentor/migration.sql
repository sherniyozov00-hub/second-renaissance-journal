
-- CreateEnum
CREATE TYPE "MentorRole" AS ENUM ('AUTHOR', 'MENTOR');

-- AlterEnum
ALTER TYPE "AiCheckType" ADD VALUE 'MENTOR';

-- AlterTable
ALTER TABLE "Draft" ADD COLUMN     "mentorNotes" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "mentorStage" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MentorMessage" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "role" "MentorRole" NOT NULL,
    "text" TEXT NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MentorMessage_draftId_createdAt_idx" ON "MentorMessage"("draftId", "createdAt");

-- AddForeignKey
ALTER TABLE "MentorMessage" ADD CONSTRAINT "MentorMessage_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

