// Single source of truth for the `--highlight` accent color options — used
// by both the header's `ColorThemeToggle` and the profile page's
// `PreferencesCard`, so the two never drift out of sync (same swatch set,
// same labels). Labels are deliberately untranslated, matching
// `LanguageToggle`'s "EN"/"PT" — a color name isn't really UI copy, same
// reasoning DESIGN.md already applies to credit card brand names.
export const COLOR_THEME_OPTIONS = [
  { key: "pink", label: "PINK", hex: "#f472b6" },
  { key: "violet", label: "VIOLET", hex: "#8b5cf6" },
  { key: "emerald", label: "EMERALD", hex: "#34d399" },
  { key: "amber", label: "AMBER", hex: "#fbbf24" },
  { key: "sky", label: "SKY", hex: "#38bdf8" },
] as const;

export type ColorThemeKey = (typeof COLOR_THEME_OPTIONS)[number]["key"];
