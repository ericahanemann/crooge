import type { Category } from "../../generated/prisma/client.ts";
import { type IconKey, KIND_TO_API } from "./schemas.ts";

export function serializeCategory(category: Category) {
  return {
    id: category.id,
    kind: KIND_TO_API[category.kind],
    label: category.label,
    // `icon` is a plain DB column (not a Postgres enum), validated against
    // `iconKeySchema` only at write time — trusted here, not re-checked.
    icon: category.icon as IconKey,
    isFallback: category.isFallback,
  };
}
