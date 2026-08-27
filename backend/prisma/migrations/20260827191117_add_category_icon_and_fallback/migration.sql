-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "icon" TEXT NOT NULL DEFAULT 'tag',
ADD COLUMN     "is_fallback" BOOLEAN NOT NULL DEFAULT false;
