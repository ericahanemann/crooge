import type { CreditCardBill } from "../../generated/prisma/client.ts";
import { billStatus } from "./bill.ts";

/** Matches the frontend's `CreditCardBill` shape (`frontend/src/lib/types.ts`). */
export function serializeCreditCardBill(
  bill: CreditCardBill,
  amount: number,
  currentCycleMonth: string,
) {
  return {
    month: bill.cycleMonth,
    amount,
    status: billStatus(bill, currentCycleMonth),
    closingDate: bill.closingDate.toISOString().slice(0, 10),
    dueDate: bill.dueDate.toISOString().slice(0, 10),
  };
}
