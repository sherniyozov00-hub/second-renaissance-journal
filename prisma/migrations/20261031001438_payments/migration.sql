-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "fastTrack" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "fastTrack" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "providerData" JSONB;

