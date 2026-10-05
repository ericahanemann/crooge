-- AlterTable
ALTER TABLE "users" ADD COLUMN     "color_theme" TEXT NOT NULL DEFAULT 'pink',
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'BRL',
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "savings_rate" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'dark';
