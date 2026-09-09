"use client";

import { Archive } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { deleteCreditCardAction } from "@/lib/credit-card-actions";

/** Compact icon trigger (matches `AddCreditCardDialog`'s edit pencil) that opens a confirm dialog before archiving the card. */
export function ArchiveCreditCardButton({ cardId }: { cardId: string }) {
  const t = useTranslations("creditCards");
  const tc = useTranslations("dialogs.common");
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        title={t("archiveCard")}
        onClick={() => setOpen(true)}
        className="flex items-center justify-center size-10 rounded-lg bg-muted text-foreground border border-border hover:brightness-125 transition-[filter] cursor-pointer"
      >
        <Archive size={18} strokeWidth={1.5} />
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("archiveTitle")}
        description={t("archiveDescription")}
        confirmLabel={t("archiveCard")}
        cancelLabel={tc("cancel")}
        onConfirm={async () => {
          const result = await deleteCreditCardAction(cardId);
          if (!result.ok) {
            return {
              ok: false,
              message:
                result.code === "has_balance"
                  ? t("archiveErrorBalance")
                  : tc("errorGeneric"),
            };
          }
          router.refresh();
          return { ok: true };
        }}
      />
    </>
  );
}
