/*
  Warnings:

  - You are about to drop the column `city` on the `homes` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `homes` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `homes` table. All the data in the column will be lost.
  - You are about to drop the column `street_address` on the `homes` table. All the data in the column will be lost.
  - You are about to drop the column `street_address_two` on the `homes` table. All the data in the column will be lost.
  - You are about to drop the column `zip_code` on the `homes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "homes" DROP COLUMN "city",
DROP COLUMN "country",
DROP COLUMN "state",
DROP COLUMN "street_address",
DROP COLUMN "street_address_two",
DROP COLUMN "zip_code";
