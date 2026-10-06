-- CreateEnum
CREATE TYPE "ShoppingDealType" AS ENUM ('SALE', 'MULTI_BUY');

-- CreateEnum
CREATE TYPE "InventoryTrackingMode" AS ENUM ('COUNT', 'LEVEL', 'NONE');

-- AlterEnum
ALTER TYPE "ShoppingTripStatus" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "inventory" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "stores" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tracking_mode" "InventoryTrackingMode" NOT NULL DEFAULT 'COUNT';

-- AlterTable
ALTER TABLE "shopping_trip_items" ADD COLUMN     "deal_type" "ShoppingDealType",
ADD COLUMN     "multi_buy_price" DECIMAL(12,2),
ADD COLUMN     "multi_buy_quantity" INTEGER,
ADD COLUMN     "regular_price" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "task" ADD COLUMN     "notes" TEXT;

-- CreateTable
CREATE TABLE "project_materials" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_cost" DECIMAL(12,2),
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "project_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_materials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_materials_project_id_idx" ON "project_materials"("project_id");

-- AddForeignKey
ALTER TABLE "project_materials" ADD CONSTRAINT "project_materials_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
