"use client";

import { Check, Plus, Tag, X } from "lucide-react";
import { useTranslations } from "next-intl";
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
  type CategoryDef,
  categoryLabel,
  defaultExpenseCategories,
  defaultIncomeCategories,
  slugifyCategoryKey,
} from "@/lib/categories";

interface CategorySelectProps {
  kind: "expense" | "income";
  value: string | null;
  onChange: (key: string) => void;
  customCategories: CategoryDef[];
  onAddCustomCategory: (category: CategoryDef) => void;
}

export function CategorySelect({
  kind,
  value,
  onChange,
  customCategories,
  onAddCustomCategory,
}: CategorySelectProps) {
  const t = useTranslations();
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const defaults =
    kind === "expense" ? defaultExpenseCategories : defaultIncomeCategories;
  const allCategories = [...defaults, ...customCategories];
  const selected = allCategories.find((c) => c.key === value) ?? null;
  const SelectedIcon = selected?.icon;

  function handleConfirmAdd() {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    const category: CategoryDef = {
      key: slugifyCategoryKey(trimmed),
      icon: Tag,
      customLabel: trimmed,
    };
    onAddCustomCategory(category);
    onChange(category.key);
    setNewLabel("");
    setIsAdding(false);
  }

  function handleCancelAdd() {
    setIsAdding(false);
    setNewLabel("");
  }

  if (isAdding) {
    return (
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder={t("dialogs.common.newCategoryPlaceholder")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleConfirmAdd();
            }
            if (e.key === "Escape") {
              handleCancelAdd();
            }
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 cursor-pointer"
          onClick={handleConfirmAdd}
        >
          <Check size={16} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 cursor-pointer"
          onClick={handleCancelAdd}
        >
          <X size={16} />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value ?? undefined}
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
                {categoryLabel(selected, t)}
              </span>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">
              {t("dialogs.common.category")}
            </span>
          )}
        </SelectTrigger>
        <SelectContent>
          {allCategories.map((category) => {
            const Icon = category.icon;
            return (
              <SelectItem key={category.key} value={category.key}>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-highlight/10">
                  <Icon
                    size={14}
                    className="text-highlight"
                    strokeWidth={1.5}
                  />
                </span>
                <span className="font-karantina text-2xl tracking-wide uppercase">
                  {categoryLabel(category, t)}
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
        onClick={() => setIsAdding(true)}
        aria-label={t("dialogs.common.addCategory")}
      >
        <Plus size={16} />
      </Button>
    </div>
  );
}
