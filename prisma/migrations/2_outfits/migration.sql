-- An outfit is sold as one line: one product row, with its price list in
-- ProductPiece and the three sizes the buyer picks kept on the cart line.

ALTER TABLE "Product" ADD COLUMN "isOutfit" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ProductPiece" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductPiece_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductPiece_productId_idx" ON "ProductPiece"("productId");

ALTER TABLE "ProductPiece" ADD CONSTRAINT "ProductPiece_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The sizes join the unique key so that the same outfit ordered in two size
-- combinations stays two lines. It is NOT NULL because Postgres treats two
-- NULLs as different values, which would stop ordinary rows from ever merging.
ALTER TABLE "CartItem" ADD COLUMN "sizeNote" TEXT NOT NULL DEFAULT '';

DROP INDEX IF EXISTS "CartItem_cartId_variantId_key";
CREATE UNIQUE INDEX "CartItem_cartId_variantId_sizeNote_key"
    ON "CartItem"("cartId", "variantId", "sizeNote");
