"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDestructiveButton,
  DialogSecondaryButton,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Generic destructive-action confirmation dialog — no trigger of its own,
 * controlled entirely by `open`/`onOpenChange` so a row's own Trash2 icon
 * button (rendered elsewhere) can open it programmatically. `onConfirm` may
 * fail (returns `{ ok: false, message }`), in which case the dialog stays
 * open and shows the error inline instead of closing.
 */
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => Promise<{ ok: true } | { ok: false; message: string }>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
}: ConfirmDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    const result = await onConfirm();
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setError(null);
      }}
    >
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <p className="font-sans text-sm text-muted-foreground">{description}</p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex justify-end gap-3">
          <DialogSecondaryButton onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </DialogSecondaryButton>
          <DialogDestructiveButton
            onClick={handleConfirm}
            disabled={submitting}
          >
            {confirmLabel}
          </DialogDestructiveButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
