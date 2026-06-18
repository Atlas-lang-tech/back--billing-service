-- CreateEnum
CREATE TYPE "invoice_statuses" AS ENUM ('draft', 'pending', 'paid', 'cancelled');

-- CreateTable
CREATE TABLE "invoices" (
    "id" SERIAL NOT NULL,
    "number" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "invoice_statuses" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");
