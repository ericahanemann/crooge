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
- **Nav labels:** `text-2xl tracking-wide` — Karantina renders visually smaller than most fonts at the same size; always size up significantly
- **Page titles (in header bar):** `text-5xl tracking-wide`
- **Bento card labels:** `text-xs tracking-wide text-muted-foreground`
- **Avoid `text-sm`** for Karantina — it becomes illegible due to its condensed proportions. `text-base` is only acceptable for very short labels (2–3 characters, e.g. "EN" / "PT"); never use it for body text or longer strings

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
- **Right (left to right):** `<LanguageToggle />` → `<ThemeToggle />` → `<UserAvatar />`
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
- Accent: **TBD** — considering warm amber or soft green to signal financial health
- Destructive (losses): `--destructive` (red, already in shadcn)

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

## Components & Icons

- All UI primitives: shadcn (style: `base-nova`, Base UI under the hood)
- Icons: Lucide (`lucide-react`)
- No emoji in UI

## Pages

| Route | Display Name | Description |
|-------|-------------|-------------|
| `/` | DASHBOARD | Main overview — key metrics, recent transactions |
| `/monthly` | [CURRENT MONTH] | Month-by-month financial breakdown |

## Bento Grid Notes (to evolve)

- Cards should have varied widths: some `col-span-1`, some `col-span-2`
- Each card: `bg-card border border-border rounded-xl p-5`
- Card label: Karantina `text-xs tracking-wide text-muted-foreground` (uppercase)
- Card value: Nunito Sans, large and bold
- Consider subtle `shadow-sm` on cards for depth
