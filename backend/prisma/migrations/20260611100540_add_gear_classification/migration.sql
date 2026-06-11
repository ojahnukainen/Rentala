-- CreateEnum
CREATE TYPE "GearClassification" AS ENUM ('EVENT', 'NON_EVENT');

-- AlterTable
ALTER TABLE "Gear" ADD COLUMN     "classification" "GearClassification" NOT NULL DEFAULT 'EVENT';
