-- CreateEnum
CREATE TYPE "BodyType" AS ENUM ('SLIM', 'AVERAGE', 'HEAVY');

-- CreateTable
CREATE TABLE "FittingBody" (
    "id" TEXT NOT NULL,
    "bodyType" "BodyType" NOT NULL,
    "label" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FittingBody_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FittingLayer" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "bodyId" TEXT NOT NULL,
    "colorKey" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FittingLayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FittingBody_bodyType_key" ON "FittingBody"("bodyType");

-- CreateIndex
CREATE INDEX "FittingLayer_bodyId_idx" ON "FittingLayer"("bodyId");

-- CreateIndex
CREATE UNIQUE INDEX "FittingLayer_productId_bodyId_colorKey_key" ON "FittingLayer"("productId", "bodyId", "colorKey");

-- AddForeignKey
ALTER TABLE "FittingLayer" ADD CONSTRAINT "FittingLayer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FittingLayer" ADD CONSTRAINT "FittingLayer_bodyId_fkey" FOREIGN KEY ("bodyId") REFERENCES "FittingBody"("id") ON DELETE CASCADE ON UPDATE CASCADE;
