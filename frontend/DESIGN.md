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
- **Buttons:** `text-2xl` — same floor as everything else. (Previously `text-xl` as a documented exception; bumped to `text-2xl` to read as a proper CTA instead of blending into secondary text — see Buttons section.)

### Nunito Sans usage rules
- Normal casing
- Data/number values in cards: semibold, larger size
- Helper text: `text-sm text-muted-foreground`

## Layout

- **Structure:** Fixed sidebar (`w-56` expanded / `w-14` collapsed, left) + flex-col content area (`flex-1`, right)
- **Content area:** `<main className="flex flex-col flex-1 overflow-hidden min-w-0">`
- **Page structure:** Each page wraps its content in `<div className="flex flex-col flex-1 overflow-hidden">` with a `<PageHeader>` at the top and `<div className="flex-1 overflow-auto p-7">` for the scrollable body
- **Card style:** Bento box grid — asymmetric tiles, varied sizes, tight gutters
- **Density:** The app was originally designed on a large external monitor and read as oversized on laptop screens (too little visible without scrolling). First attempt was a global root-font-size media query in `globals.css` — reverted, it didn't reliably apply. Second attempt shrank every font size and padding directly in components — reverted too, it went too far and text became hard to read (Tailwind's text scale has no step between e.g. `text-4xl` and `text-5xl`, so "one size down" is a bigger jump than it looks).

  Landed on a middle ground: **tighten spacing/layout (padding, gaps, sidebar width) to genuine midpoints between the original and the over-shrunk pass, but leave font sizes mostly at their original size.** Font size is what makes things feel "too small" perceptually — spacing is what actually reclaims screen space — so spacing took the cut and text didn't. Where a value could land on a real intermediate Tailwind token (e.g. sidebar `w-60`→`w-52` became `w-56`; page padding `p-8`→`p-6` became `p-7`), use it. Where two sizes are adjacent on the scale with nothing between them, prefer the original (larger) value over introducing an arbitrary in-between value.

## Page Header

Every page has a `<PageHeader title="PAGE NAME" />` that renders a single row:
- **Left:** Page title in Karantina `text-5xl tracking-wide`
- **Right (left to right):** `<LanguageToggle />` → `<ColorThemeToggle />` → `<ThemeToggle />` → `<UserAvatar />`
- Bottom border: `border-b border-border`
- Padding: `px-7 py-7` — vertical padding matches the sidebar's logo-block top padding (`py-7`), so the header and sidebar content start at the same height

## Sidebar

- **Server component** (`AppSidebar`). Client parts are extracted to minimize "use client" surface:
  - `SidebarProvider` — context + localStorage for collapsed state
  - `SidebarShell` — animated width wrapper, logo switcher, toggle button host
  - `SidebarToggle` — collapse/expand icon button at sidebar bottom
  - `NavLink`, `NavGroup`, `NavSubLink` — all client (need `usePathname` + `useSidebar`)
- **Collapsible:** `w-56` expanded ↔ `w-14` collapsed, `transition-[width] duration-300`.
  - State persisted in `localStorage` key `"sidebar-collapsed"`.
  - Toggle button at bottom uses `PanelLeftClose` / `PanelLeftOpen` icons (Lucide).
- **Collapsed logo:** `public/cow-icon.svg` (minimalist white cow silhouette, `width=32 height=32`), same `className="invert dark:invert-0"` treatment as the main logo.
- **Expanded logo:** `public/logo.svg`, `width=120 height=40`, `className="invert dark:invert-0"`.
- **Collapsed nav items:** icon only, centered (`justify-center px-0`). Label span fades with `transition-[opacity,max-width] duration-200`. Tooltip appears to the right on hover (absolute, `left-full ml-2 z-50`, styled `bg-card border border-border shadow-md font-karantina text-xl`). Tooltip is only rendered when collapsed.
- **NavGroup when collapsed:** renders as a Link to the first sub-link, icon only, tooltip shows the group label. Sub-links are hidden.
- Nav items: icon (Lucide `size={17} strokeWidth={1.5}`) + label `font-karantina text-2xl tracking-wide`
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

**Uses `--highlight`:** category icon color (`text-highlight`) + icon bubble bg (`bg-highlight/10 rounded-lg`), the balance figure and income-this-month figure on the Balance card, income transaction amounts, Balance card's accent wash/border (see Monthly page layout), text selection background.
**Expense amounts:** `text-foreground` (neutral — no red).

### Scrollbar & text selection

- **Scrollbar:** thin (`8px`), neutral gray thumb on a transparent track, fully rounded. Colors are theme-aware via `--scrollbar-thumb` / `--scrollbar-thumb-hover` CSS variables (light: light gray `oklch(0.87 0 0)`, dark: dark gray `oklch(0.32 0 0)`) — same "subtle variation from the background" logic as `--border`. Applied globally via `scrollbar-width`/`scrollbar-color` (Firefox) and `::-webkit-scrollbar*` (Chromium/WebKit) in `globals.css`.
- **Text selection:** `::selection` uses `--highlight` as background with white foreground text, instead of the browser default blue.

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

All buttons use Karantina: `font-karantina text-2xl tracking-wide uppercase`. No exceptions — this applies to primary, secondary, ghost, and inline action buttons alike.

Two solid variants, used for the main CTA in a bento card (e.g. "+ ADD INCOME", "+ ADD EXPENSE"). Pick one per card — don't mix within the same card:

Hover on both solid variants uses `brightness` (not `opacity`) — buttons should get *lighter* on hover, never darker/faded:

**Primary** — white bg (`bg-primary`/`text-primary-foreground` already resolve to white-on-dark in dark mode, dark-on-white in light mode). Used for the card that should feel like the "main" action on the page (e.g. Balance card's "+ ADD INCOME"):
```
w-full py-3 rounded-lg bg-primary text-primary-foreground font-karantina text-2xl tracking-wide uppercase hover:brightness-110 transition-[filter]
```

**Secondary** — same treatment as the sidebar's active nav link (`bg-muted text-foreground`), plus a border since it stands alone rather than inside a nav list. Theme-aware automatically (`--muted` swaps light/dark). Used for the card that should feel secondary (e.g. Spending card's "+ ADD EXPENSE"). Its bg is darker/more saturated than Primary's, so it needs a stronger brightness bump (`125` vs `110`) to read as "lighter" on hover:
```
w-full py-3 rounded-lg bg-muted text-foreground border border-border font-karantina text-2xl tracking-wide uppercase hover:brightness-125 transition-[filter]
```

Ghost/inline text button (used for lighter-weight actions like "VIEW DETAILS" in the credit card section):
```
flex items-center gap-1.5 font-karantina text-2xl tracking-wide uppercase text-muted-foreground hover:text-foreground transition-colors
```

## Components & Icons

- All UI primitives: shadcn (style: `base-nova`, Base UI under the hood)
- Icons: Lucide (`lucide-react`)
- No emoji in UI

## Dialogs

Used for the "Add Income" / "Add Expense" forms (triggered from the Balance/Spending card CTAs). Built on shadcn's Base UI-backed `Dialog`/`Select`/`Checkbox`/`Input` primitives in `src/components/ui/`, adapted to this project's tokens (floating panels use `bg-card border border-border shadow-lg`, not the shadcn-default `bg-popover`/ring treatment).

- **Shell:** `rounded-xl border border-border bg-card p-6 shadow-lg`, `gap-5` vertical rhythm between sections, `sm:max-w-xl` (wider than a typical shadcn dialog — these forms have side-by-side fields and, on Add Expense, two option cards that need breathing room). Backdrop: `bg-black/50`.
- **Header:** Title + close button on the same row — the title (`font-karantina text-3xl tracking-wide uppercase`, bumped up from the general `text-2xl` card-label floor since a dialog title is a bigger moment than a card label) sits at the top-left; the close `X` is absolutely positioned top-right (`top-4 right-4`), so it always reads as the same row without needing extra layout.
- **Field labels:** `font-sans text-sm text-muted-foreground uppercase`, matching the card secondary-label convention (e.g. "INCOME THIS MONTH"). Inline validation errors: `text-xs text-destructive` under the field.
- **Side-by-side fields:** fields with short, fixed-width values (amount, date, installment count) pair up in a `grid grid-cols-2 gap-3` row instead of stacking full-width. Fields that need more horizontal room to stay legible (description, category) always get their own full-width row.
- **Footer buttons:** New **auto-width** Primary/Secondary treatment for dialog footers — same Karantina `text-2xl tracking-wide uppercase` + `hover:brightness-110`/`125` convention as the full-width card CTAs, but `px-5 py-2` instead of `w-full py-3` (a dialog footer has two buttons side by side, so full-width doesn't apply). Exposed as `DialogPrimaryButton` / `DialogSecondaryButton` in `src/components/ui/dialog.tsx`.
- **"Keep adding":** a checkbox in the footer, left of Cancel/Add, so a user doing rapid entry (e.g. bulk-adding transactions from a receipt) doesn't have to reopen the dialog. When checked, submitting clears `description`/`amount` (and `installments` count, for expenses) but **keeps** `date`, `category`, payment method/timing/frequency, and any custom categories added this session — those are the fields consecutive entries tend to share. The dialog stays open, refocuses the description field, and shows a brief inline acknowledgment (`Check` icon + "Added", auto-fades after ~1.5s). Unchecked (default), Add validates, submits, and closes.
- **Category picker:** `CategorySelect` (`src/components/monthly/category-select.tsx`) — a `Select` listing category icon + Karantina `text-2xl uppercase` label (`size-6 rounded-md bg-highlight/10` icon bubble, smaller than the `size-9` used in the transactions list since it sits inline in a form row), plus a trailing "+" ghost icon button. Clicking "+" swaps the row for an inline text input with confirm/cancel icon buttons; confirming appends a session-local custom category (generic `Tag` icon, no i18n — it's the user's own typed text) and selects it immediately. Custom categories persist across "keep adding" resets but not across closing and reopening the dialog.
- **Segmented control:** `SegmentedControl` (`src/components/ui/segmented-control.tsx`) — hand-rolled pill toggle (not a Base UI primitive; a plain button group is simpler than fighting `toggle-group`/`tabs` APIs for a 2–3 option single-select). Style: `flex gap-1 rounded-lg bg-muted p-1`, active pill `bg-card text-foreground shadow-sm`, inactive `text-muted-foreground hover:text-foreground`. Used for Add Expense's timing (One-time / Installments / Recurring) — Karantina `text-2xl uppercase` pills like other card/nav labels.
- **Option cards** (payment method): Debit/Pix vs Credit is a bigger decision than timing and benefits from more explanation, so it's two side-by-side cards (`grid grid-cols-2 gap-3`) rather than a segmented-control pill — each is `rounded-lg border p-3` with an icon (`Wallet` / `CreditCard`), the Karantina `text-2xl uppercase` label, and a one-line `text-xs text-muted-foreground` explainer ("Straight from your balance" / "On your credit card") so the distinction is unambiguous. Selected state uses the `--highlight` accent (`border-highlight bg-highlight/10`, icon + label in `text-highlight`/`text-foreground`) instead of the segmented control's neutral `bg-card` — this is the one dialog control that gets the brand accent, since it's the most consequential choice in the form (it decides which balance the expense hits).
- **Frequency (recurring only):** a labeled `Select` (same primitive as the category picker, minus the "+" add affordance), not a segmented control — it's a plain either/or field like category, so it gets the standard field treatment (label above, `Select` below) rather than a pill toggle.
- **Add Expense fields by timing:** One-time → description, then amount+date side by side, then category. Installments → total amount + installment count side by side (live `≈ $X / month` helper text below, recalculated on every keystroke), then description, then date+category side by side. Recurring → frequency select (Monthly/Annual), then description, then amount+date side by side, then category. Payment method and timing are independent — both are always shown regardless of the other's value.
- **No backend yet:** submission is a stub — it validates and closes/resets, but doesn't mutate `mockTransactions` or the visible totals. Real persistence is future work.

## Categories

All category icons share the app's `--highlight` accent color — no per-category colors. Icon bubble style: `size-9 rounded-lg bg-highlight/10` with icon `text-highlight` (in the transactions list; the in-dialog `CategorySelect` uses a smaller `size-6` bubble for the same icon+color treatment). i18n keys live under `categories.expense.*` / `categories.income.*`.

### Expense categories

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

### Income categories

| Key | Icon |
|-----|------|
| `salary` | `Banknote` |
| `freelance` | `Briefcase` |
| `gift` | `Gift` |
| `investment` | `TrendingUp` |
| `other` | `Tag` |

Lucide has no brand icons (no Uber/Netflix logos). Use generic category icons — consistent abstraction looks cleaner than mixed logos. Both category sets, plus any session-added custom categories, are defined in `src/lib/categories.ts` (`CategoryDef`, `defaultExpenseCategories`, `defaultIncomeCategories`) — intentionally decoupled from `mock-monthly.ts`'s `Category` union, since dialog submissions are stubs and never feed back into the mock transactions.

## Pages

| Route | Display Name | Description |
|-------|-------------|-------------|
| `/` | DASHBOARD | Main overview — key metrics, recent transactions |
| `/monthly` | [CURRENT MONTH] | Month-by-month financial breakdown |
| `/login` | — | Sign-in page (no sidebar) |
| `/signup` | — | Sign-up / registration page (no sidebar) |

### Auth pages layout

Login and signup live in a `(auth)` route group inside `[locale]` — same level as `(app)`, but no sidebar and no `AppLayout`. The body's `flex h-full` flow fills the viewport directly.

Two-column split (desktop only, `hidden lg:flex` on left):
- **Left (w-1/2):** `AuthBrandCard` — `bg-card rounded-xl overflow-hidden border border-border`, fills the full column height via `flex flex-col p-7 > flex-1`. Contains the cow pattern image absolutely positioned, and the title/subtitle absolutely positioned at `bottom-7 left-7`.
- **Right (flex-1):** Vertically centered `max-w-sm` column: logo on top → intro paragraph → form fields → primary submit → OR divider → Google button → cross-link.

On mobile the left card is hidden; the right form fills the full viewport.

### Cow Pattern

Image file: `public/cow-pattern.webp` — decorative background overlay inside `AuthBrandCard`.

Rendered with Next.js `<Image fill sizes="50vw" />` inside the card's `relative overflow-hidden` container. Classes: `object-cover opacity-10 dark:invert` — low opacity on top of the card background in light mode; inverted so spots appear light in dark mode.

### Auth brand card titles

- **Signup:** "GET CROOOOOGY" (same in EN and PT-BR — brand language)
- **Login:** "STAY CROOOOOGY" (same in EN and PT-BR)

Subtitles: 6 variants per page per locale, randomly picked server-side with `Math.random()` on each request (no hydration issue — picked in RSC before render). Both EN and PT-BR variants defined in `auth.login.subtitles` / `auth.signup.subtitles` in the i18n JSON files.

### Logo on auth pages

`<Image src="/logo.svg" width={120} height={40} className="invert dark:invert-0" />` — same treatment as the sidebar. Works on `bg-background` in both themes.

### Monthly page layout

Three stacked sections inside a scrollable `p-7 space-y-5` container:

1. **`grid grid-cols-2 gap-5`** — Balance card (left) + Spending card (right)
   - Balance card: current account balance (large, `text-5xl text-highlight`) + income this month (secondary, `text-xl`) + "+ ADD INCOME" **Primary** button (`bg-primary`, white-on-dark). Uses a subtle `--highlight` accent to stand apart from the Spending card: `bg-linear-to-br from-highlight/10 via-card to-card` wash + `border-highlight/20` border.
   - Spending card: spent this month (large, `text-5xl`) + DAILY LIMIT (remaining budget ÷ days left in month, as a `/ DAY` figure, `text-xl`) + "+ ADD EXPENSE" **Secondary** button (`bg-muted text-foreground border border-border`, same treatment as the sidebar's active nav link). Card itself stays neutral (`bg-card`, no highlight wash) — reads as the "cost" counterpart to Balance's "asset" framing.

2. **Credit card section** — full-width bento card; left: stylized portrait card visual (`w-36`, gradient bg, card name, brand); right: CURRENT BILL (largest number, `text-3xl`) + CLOSING DATE + UPCOMING BILLS + VIEW DETAILS button. The card name is not repeated in the right-side info column — it's already shown on the card visual. The right column matches the card visual's height (`flex gap-7` on the row, no `items-start`) and uses `justify-between` so the info rows stay grouped at the top and VIEW DETAILS is pinned to the bottom, level with the card visual's base.

3. **Transactions list** — full-width; grouped by date (date as `font-sans text-sm uppercase` muted sub-header); each row: highlight-tinted square icon bubble (`size-9`) + category name (Karantina `text-2xl`, from `categories` namespace) + description (Nunito Sans sm muted) + amount (`text-foreground` for expenses, `text-highlight` for income)

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
