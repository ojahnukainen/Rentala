/*
  Warnings:

  - Added the required column `startDate` to the `Loan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "borrowedAt" DROP NOT NULL,
ALTER COLUMN "borrowedAt" DROP DEFAULT;
