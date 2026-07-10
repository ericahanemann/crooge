# Crooge — Design System

## Brand

- **Name:** Crooge (from "Scrooge")
- **Tagline:** Get croogy. Control your finances.
- **Tone:** Playful but minimal. Not childish — confident and fun. Think Monzo meets a bento box.

## Typography

| Font | Variable | Use | Rule |
|------|----------|-----|------|
| Karantina | `font-karantina` | Titles, nav labels, highlights, any prominent text | **ALWAYS UPPERCASE. No exceptions.** |
| Nunito Sans | `font-sans` | Body copy, descriptions, data values, helper text | Normal casing |

### Karantina usage rules
- **Always uppercase** — no mixed case, ever
- **Tracking:** `tracking-wide` — Karantina is a condensed display font; `tracking-widest` is too spaced out, `tracking-wide` (0.025em) is the right amount
- **Nav labels and all card labels:** `text-2xl tracking-wide` — Karantina renders visually smaller than most fonts at the same size; always size up significantly. All Karantina text in cards, stat labels, section titles, and category names uses `text-2xl`.
- **Page titles (in header bar):** `text-5xl tracking-wide`
- **Avoid anything below `text-2xl`** for Karantina — it becomes illegible due to its condensed proportions. Exception: "EN"/"PT" locale labels (`text-base`) since they're only 2 characters.

### Nunito Sans usage rules
- Normal casing
- Data/number values in cards: semibold, larger size
- Helper text: `text-sm text-muted-foreground`

## Layout

- **Structure:** Fixed sidebar (`w-60`, left) + flex-col content area (`flex-1`, right)
- **Content area:** `<main className="flex flex-col flex-1 overflow-hidden min-w-0">`
- **Page structure:** Each page wraps its content in `<div className="flex flex-col flex-1 overflow-hidden">` with a `<PageHeader>` at the top and `<div className="flex-1 overflow-auto p-8">` for the scrollable body
- **Card style:** Bento box grid — asymmetric tiles, varied sizes, tight gutters

## Page Header

Every page has a `<PageHeader title="PAGE NAME" />` that renders a single row:
- **Left:** Page title in Karantina `text-5xl tracking-wide`
- **Right (left to right):** `<LanguageToggle />` → `<ColorThemeToggle />` → `<ThemeToggle />` → `<UserAvatar />`
- Bottom border: `border-b border-border`
- Padding: `px-8 py-5`

## Sidebar

- **Server component.** Only the `NavLink` sub-component is a client component (needs `usePathname` for active state).
- Logo: `public/logo.svg` via `next/image`, `width=130 height=44`
  - Use `className="invert dark:invert-0"` — white SVG inverts to black in light mode
- Nav items: icon (Lucide `size={18} strokeWidth={1.5}`) + label `font-karantina text-2xl tracking-wide`
- Active state: `bg-muted text-foreground`; inactive: `text-muted-foreground`

## User Avatar

Component: `<UserAvatar name="Érica" initials="EH" src={optionalUrl} />`
- Renders as a clickable chip: `border border-border rounded-lg px-3 py-1.5` with a dropdown menu
- Shows `src` image (via `next/image fill`) if provided
- Falls back to initials in `font-karantina text-xl leading-none` inside a `size-8 rounded-full bg-muted` circle
- Shows first name only next to the avatar: `font-karantina text-xl tracking-wide uppercase text-muted-foreground`
- Name is always uppercase (Karantina rule)
- Dropdown items: "My profile" / "Meu perfil" and "Sign out" / "Sair" — translated via `user` namespace

## Color Palette

Using shadcn's CSS variable system (neutral base). All in oklch.

- **Default mode: dark.** Light mode available via toggle (top-right). Preference persisted in a cookie (`theme=dark|light`) so the server can set the correct class before the page renders — no flash.
- Background: `bg-background`
- Card: `bg-card`
- Sidebar: `bg-card` with `border-r border-border`
- Destructive (losses): `--destructive` (red, already in shadcn)

### Brand identity: pink + white

Two primary brand colors: **pink** (highlight) and **white** (neutral/foreground). The brand mascot is a cow — lean into light, pastel pinks.

A `--highlight` CSS variable drives all accent/branding color. Defined in `:root` (default: pink-400) and overridden by `[data-color-theme]` attribute selectors on `<html>`. In Tailwind: `text-highlight`, `bg-highlight`, `bg-highlight/10` etc.

Color theme options (user-selectable via the Palette toggle in the header):

| Key | Color | oklch |
|-----|-------|-------|
| `pink` (default) | pink-400 | `oklch(0.72 0.17 3.0)` |
| `violet` | violet-500 | `oklch(0.67 0.22 293)` |
| `emerald` | emerald-400 | `oklch(0.71 0.17 163)` |
| `amber` | amber-400 | `oklch(0.77 0.17 70)` |
| `sky` | sky-400 | `oklch(0.70 0.14 232)` |

Theme preference persisted via `color-theme` cookie. Server reads it and sets `data-color-theme` on `<html>` before render — no flash.

**Uses `--highlight`:** category icon color (`text-highlight`) + icon bubble bg (`bg-highlight/10 rounded-lg`), income amount in balance card, income transaction amounts.
**Expense amounts:** `text-foreground` (neutral — no red).

## Internationalisation (i18n)

- **Languages:** English (`en`, default) and Portuguese Brazil (`pt-BR`)
- **Detection:** Browser `Accept-Language` header via next-intl middleware. If language isn't EN or PT-BR, default is EN.
- **URL routing:** `/en/...` and `/pt-BR/...` — handled transparently by next-intl middleware
- **Localized pathnames:** route slugs differ per locale — `/en/monthly` becomes `/pt-BR/mensal`. Defined in `src/i18n/routing.ts` under `pathnames`. Internal link href is always the canonical key (e.g. `"/monthly"`); next-intl resolves the locale-specific URL automatically
- **Translation files:** `src/i18n/messages/en.json` and `src/i18n/messages/pt-BR.json`
- **Every UI string must have both EN and PT-BR translations.** No hardcoded strings in components.
- Server components use `useTranslations()` from `next-intl`; client components get messages via `NextIntlClientProvider` in the locale layout
- Language toggle: Globe icon button in the page header (right side, before theme toggle); opens a small dropdown with EN / PT options
- Month names: use `toLocaleString(locale, { month: "long" })` — locale-aware, no translation entry needed

## Buttons

All buttons use Karantina: `font-karantina text-xl tracking-wide uppercase`. No exceptions — this applies to primary, secondary, ghost, and inline action buttons alike.

Standard ghost button style (used for section CTAs like "+ ADD INCOME"):
```
w-full py-3 rounded-lg border border-border font-karantina text-xl tracking-wide uppercase text-muted-foreground hover:text-foreground hover:bg-muted transition-colors
```

## Components & Icons

- All UI primitives: shadcn (style: `base-nova`, Base UI under the hood)
- Icons: Lucide (`lucide-react`)
- No emoji in UI

## Categories

Starter set. All category icons share the app's `--highlight` accent color — no per-category colors. Icon bubble style: `size-9 rounded-lg bg-highlight/10` with icon `text-highlight`.

| Key | Icon |
|-----|------|
| `food` | `Utensils` |
| `groceries` | `ShoppingCart` |
| `transport` | `Car` |
| `rideshare` | `Navigation` |
| `streaming` | `MonitorPlay` |
| `music` | `Music` |
| `health` | `HeartPulse` |
| `shopping` | `ShoppingBag` |
| `utilities` | `Zap` |
| `housing` | `Home` |
| `entertainment` | `Gamepad2` |
| `coffee` | `Coffee` |
| `other` | `Tag` |

Lucide has no brand icons (no Uber/Netflix logos). Use generic category icons — consistent abstraction looks cleaner than mixed logos.

## Pages

| Route | Display Name | Description |
|-------|-------------|-------------|
| `/` | DASHBOARD | Main overview — key metrics, recent transactions |
| `/monthly` | [CURRENT MONTH] | Month-by-month financial breakdown |

### Monthly page layout

Three stacked sections inside a scrollable `p-8 space-y-6` container:

1. **`grid grid-cols-2 gap-6`** — Balance card (left) + Spending card (right)
   - Balance card: current account balance (large) + income this month (secondary) + "+ ADD INCOME" button
   - Spending card: spent this month (large) + DAILY LIMIT (remaining budget ÷ days left in month, as a `/ DAY` figure) + "+ ADD EXPENSE" button

2. **Credit card section** — full-width bento card; left: stylized portrait card visual (gradient bg, card name, brand); right: CURRENT BILL (largest number) + CLOSING DATE + UPCOMING BILLS + VIEW DETAILS button

3. **Transactions list** — full-width; grouped by date (date as `font-sans text-sm uppercase` muted sub-header); each row: highlight-tinted square icon bubble + category name (Karantina `text-2xl`, from `categories` namespace) + description (Nunito Sans sm muted) + amount (`text-foreground` for expenses, `text-highlight` for income)

### Credit card visual

- Aspect ratio: `0.63` (portrait — taller than wide)
- Background: `linear-gradient(150deg, color-mix(in oklch, var(--highlight) 80%, white), var(--highlight))` — adapts to active color theme automatically
- Shine: `bg-gradient-to-b from-white/10 to-transparent` overlay
- Brand: VISA → italic bold white text; Mastercard → two overlapping colored circles; others → Karantina text
- Card name: Karantina `text-2xl` top-left, white/90

## Bento Grid Notes (to evolve)

- Cards should have varied widths: some `col-span-1`, some `col-span-2`
- Each card: `bg-card border border-border rounded-xl p-5`
- Primary card label (section titles, category names): Karantina `text-2xl tracking-wide` uppercase
- Secondary card label (stat names like "INCOME THIS MONTH", "DAILY LIMIT", "CURRENT BILL"): Nunito Sans `text-sm` uppercase, `text-muted-foreground`
- Card value: Nunito Sans, large and bold
- Consider subtle `shadow-sm` on cards for depth
