-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "is_system" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "credit_card_bill_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "transactions_credit_card_bill_id_key" ON "transactions"("credit_card_bill_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_credit_card_bill_id_fkey" FOREIGN KEY ("credit_card_bill_id") REFERENCES "credit_card_bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;
