"use client";

import { Check, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  CATEGORY_ICON_KEYS,
  CATEGORY_ICONS,
  DEFAULT_ICON_KEY,
} from "@/lib/category-icons";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * @prop value - selected category id, or `null` if none chosen yet. Controlled — state lives in the parent dialog.
 * @prop categories - the caller's full category list, pre-scoped to the relevant kind (every category is a real per-user row — seeded starters and user-created ones alike, no built-in/custom split).
 * @prop onAdd - called with a trimmed label + icon key when the user confirms a new category; resolves to the created `Category` on success, `null` on failure (e.g. a duplicate label) — the parent owns the actual create request and its own `categories` state.
 * @prop onEdit - called with `(id, newLabel, newIcon)` when the user confirms a rename/re-icon; resolves to whether it succeeded.
 * @prop onDelete - called with the category `id` when the user deletes it. The parent removes it from its own state (and clears `value` if it was selected).
 */
interface CategorySelectProps {
  value: string | null;
  onChange: (id: string) => void;
  categories: Category[];
  onAdd: (label: string, icon: string) => Promise<Category | null>;
  onEdit: (id: string, label: string, icon: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
}

/**
 * category dropdown used inside add income/expense dialogs. Every row gets
 * hover-revealed rename/delete icons (delete omitted for the seeded
 * "Other" category — it's the delete-protected fallback target — and for
 * any backend-managed `isSystem` category, though callers currently filter
 * those out of the list entirely before it reaches here). Both
 * close the dropdown and swap the whole control into an inline panel
 * (label input + icon grid + confirm/cancel) rather than editing in place
 * inside the open listbox — nesting interactive controls inside a Base UI
 * `Select`'s listbox risks its own keyboard handling (arrow nav, typeahead)
 * fighting the nested inputs.
 */
export function CategorySelect({
  value,
  onChange,
  categories,
  onAdd,
  onEdit,
  onDelete,
}: CategorySelectProps) {
  const t = useTranslations();
  const [selectOpen, setSelectOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(DEFAULT_ICON_KEY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const selected = categories.find((c) => c.id === value) ?? null;
  const SelectedIcon = selected ? (CATEGORY_ICONS[selected.icon] ?? Tag) : null;
  const isEditingInline = isAdding || editingId !== null;

  function startAdding() {
    setSelectOpen(false);
    setIsAdding(true);
    setEditingId(null);
    setLabel("");
    setSelectedIcon(DEFAULT_ICON_KEY);
    setError(null);
  }

  function startEditing(e: React.SyntheticEvent, category: Category) {
    e.stopPropagation();
    e.preventDefault();
    setSelectOpen(false);
    setIsAdding(false);
    setEditingId(category.id);
    setLabel(category.label);
    setSelectedIcon(category.icon);
    setError(null);
  }

  function handleCancelInline() {
    setIsAdding(false);
    setEditingId(null);
    setLabel("");
    setError(null);
  }

  async function handleConfirmInline() {
    const trimmed = label.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);

    if (editingId) {
      const ok = await onEdit(editingId, trimmed, selectedIcon);
      setSubmitting(false);
      if (!ok) {
        setError(t("dialogs.common.categoryDuplicate"));
        return;
      }
      handleCancelInline();
      return;
    }

    const created = await onAdd(trimmed, selectedIcon);
    setSubmitting(false);
    if (!created) {
      setError(t("dialogs.common.categoryDuplicate"));
      return;
    }
    onChange(created.id);
    handleCancelInline();
  }

  async function handleDelete(e: React.SyntheticEvent, category: Category) {
    e.stopPropagation();
    e.preventDefault();
    setDeletingId(category.id);
    await onDelete(category.id);
    setDeletingId(null);
  }

  if (isEditingInline) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("dialogs.common.newCategoryPlaceholder")}
            disabled={submitting}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleConfirmInline();
              }
              if (e.key === "Escape") {
                handleCancelInline();
              }
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 cursor-pointer"
            disabled={submitting}
            onClick={handleConfirmInline}
          >
            <Check size={16} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 cursor-pointer"
            disabled={submitting}
            onClick={handleCancelInline}
          >
            <X size={16} />
          </Button>
        </div>
        <div className="grid grid-cols-8 gap-1">
          {CATEGORY_ICON_KEYS.map((key) => {
            const Icon = CATEGORY_ICONS[key] ?? Tag;
            const active = key === selectedIcon;
            return (
              <button
                key={key}
                type="button"
                disabled={submitting}
                onClick={() => setSelectedIcon(key)}
                aria-pressed={active}
                className={cn(
                  "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors",
                  active
                    ? "border-highlight bg-highlight/10 text-highlight"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon size={14} strokeWidth={1.5} />
              </button>
            );
          })}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        open={selectOpen}
        onOpenChange={setSelectOpen}
        value={value ?? ""}
        onValueChange={(v) => onChange(v as string)}
      >
        <SelectTrigger className="flex-1">
          {selected && SelectedIcon ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-highlight/10">
                <SelectedIcon
                  size={14}
                  className="text-highlight"
                  strokeWidth={1.5}
                />
              </span>
              <span className="truncate font-karantina text-2xl tracking-wide uppercase">
                {selected.label}
              </span>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">
              {t("dialogs.common.category")}
            </span>
          )}
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => {
            const Icon = CATEGORY_ICONS[category.icon] ?? Tag;
            const isDeleting = deletingId === category.id;
            return (
              <SelectItem
                key={category.id}
                value={category.id}
                className="group/item"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-highlight/10">
                  <Icon
                    size={14}
                    className="text-highlight"
                    strokeWidth={1.5}
                  />
                </span>
                <span className="font-karantina text-2xl tracking-wide uppercase truncate">
                  {category.label}
                </span>
                <span className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 group-hover/item:opacity-100 group-focus-within/item:opacity-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="cursor-pointer"
                    aria-label={t("dialogs.common.editCategory")}
                    disabled={isDeleting}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => startEditing(e, category)}
                  >
                    <Pencil size={12} />
                  </Button>
                  {!category.isFallback && !category.isSystem && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="cursor-pointer"
                      aria-label={t("dialogs.common.deleteCategory")}
                      disabled={isDeleting}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => handleDelete(e, category)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  )}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 cursor-pointer"
        onClick={startAdding}
        aria-label={t("dialogs.common.addCategory")}
      >
        <Plus size={16} />
      </Button>
    </div>
  );
}
