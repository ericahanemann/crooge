# Crooge — Design System

## Brand

- **Name:** Crooge (from "Scrooge")
- **Tagline:** Get croogy. Control your finances.
- **Tone:** Playful but minimal. Not childish — confident and fun. Think Monzo meets a bento box.

### Logo assets

Two files, and only these two:

- **`public/crooge-logo.svg`** — the full logo: cow + "CROOGE" wordmark, already combined into one asset. Use it anywhere the wordmark fits (sidebar expanded, mobile menu header, auth pages).
- **`public/cow-icon.svg`** — the cow mark alone. Use it only where the wordmark doesn't fit (sidebar collapsed).

Never rebuild the full logo by putting the cow icon next to a separate wordmark image — that's how it used to work, with a wordmark-only `public/logo.svg`, and that file has been deleted. One place, one `<Image>`.

Both files are solid-white fills, so both always carry `className="invert dark:invert-0"` — black on light backgrounds, white on dark.

**Sizing.** Neither file is square, and the `width`/`height` passed to `next/image` must keep the file's own aspect ratio, or the mark letterboxes inside dead space in its layout box:

- `crooge-logo.svg` — `1951×763`, ratio **2.557**
- `cow-icon.svg` — `706×543`, ratio **1.300**

`crooge-logo.svg` additionally carries empty padding above and below its artwork (its viewBox is `0 0 1951 763`, but the drawing only spans y 119–662), so **the visible mark is only ~71% of whatever height you give it** — a `height=56` box draws a 40px-tall logo. Budget for that when sizing it against neighbouring text; `cow-icon.svg` has no such padding and fills its box.

| Place | Asset | Box | Visible mark height |
|-------|-------|-----|---------------------|
| Sidebar collapsed | `cow-icon.svg` | `35×27` | 27 |
| Sidebar expanded | `crooge-logo.svg` | `143×56` | 40 |
| Mobile menu header | `crooge-logo.svg` | `159×62` | 44 |
| Auth pages | `crooge-logo.svg` | `159×62` | 44 |

The collapsed cow is deliberately *smaller* than the cow inside the expanded logo (27 vs 40), so it doesn't crowd the `w-14` rail — the mark does shrink slightly when the sidebar collapses, and that's the intended look, not a mismatch to "fix".

`alt="Crooge"` on every one of them — since the full logo is now a single image, there's no longer a decorative `alt=""` half to pair with a labelled one.

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
- Padding: `px-7 py-7` — the top padding matches where the sidebar's logo block centres its expanded logo (28px down from the top of its `h-28` box), so the header and sidebar content start at the same height

## Mobile Navigation

Below `lg` (1024px), the sidebar is hidden (`hidden lg:flex` on `SidebarShell`). A **burger menu button** appears in the `PageHeader` on the left, next to the page title. Tapping it opens a full-screen overlay (`MobileMenu`) that covers the entire viewport.

The mobile menu overlay:
- **Header:** full Crooge logo on the left + X close button on the right, same `py-7 border-b` as the desktop page header. `public/crooge-logo.svg` at `width=159 height=62` — same asset as the sidebar's expanded logo, scaled up to match this header's larger type. See Logo assets.
- **Nav links:** Full-width rows with icon + Karantina label. Same active/inactive states as desktop (`bg-muted text-foreground` / `text-muted-foreground`). Sub-links (e.g. under Credit Cards) are always expanded and indented to align with the parent label (`pl-16`)
- **Footer:** LanguageToggle, ColorThemeToggle, ThemeToggle, and UserAvatar — the 4 icons that are hidden from the page header on mobile
- **Closing:** X button, tapping any nav link, or pressing Escape
- **Accessibility:** `role="dialog" aria-modal="true"`, focus trap (Tab cycles within menu), body scroll locked while open, focus moves to X button on open

On mobile, the `PageHeader` shows only the burger button + page title. The 4 action icons are hidden (`hidden lg:flex`).

## Sidebar

- **Server component** (`AppSidebar`). Client parts are extracted to minimize "use client" surface:
  - `SidebarProvider` — context + localStorage for collapsed state
  - `SidebarShell` — animated width wrapper, logo switcher, toggle button host
  - `SidebarToggle` — collapse/expand icon button at sidebar bottom
  - `NavLink`, `NavGroup`, `NavSubLink` — all client (need `usePathname` + `useSidebar`)
- **Collapsible:** `w-56` expanded ↔ `w-14` collapsed, `transition-[width] duration-300`.
  - State persisted in `localStorage` key `"sidebar-collapsed"`.
  - Toggle button at bottom uses `PanelLeftClose` / `PanelLeftOpen` icons (Lucide).
- **Collapsed logo:** `public/cow-icon.svg` (`width=35 height=27`) — kept small so it doesn't crowd the `w-14` rail. **Expanded logo:** `public/crooge-logo.svg` (`width=143 height=56`) — a single image, cow and wordmark together. See Logo assets for how those boxes relate to the drawn size.
- **The logo links to the dashboard** (`/`) in both states — wrapped in the i18n `Link` with `className="flex cursor-pointer"` (`flex` so the anchor adds no line-height above the image; `cursor-pointer` stated explicitly, matching how every other clickable in the app declares it rather than leaning on the browser default). The image's `alt="Crooge"` is the link's accessible name. No hover treatment — the logo is a wayfinding affordance, not a button.
- **Logo block height is fixed at `h-28` (112px) with `flex items-center`,** not driven by whichever logo is showing. The two logos are different heights (56 vs 27), so letting the block size to its content pushed the whole nav ~29px up the moment the sidebar collapsed. A constant-height block means **nav rows keep the same vertical position through a collapse** — only their width animates. 112px is exactly what the expanded state used to compute to (`py-7` + 56), so the expanded layout is unchanged; the collapsed cow just centres in the taller box.
- **Nav row heights must match across collapse for the same reason.** `NavLink` gets this for free: its label span stays in flow when collapsed (`max-w-0 overflow-hidden` kills the width, not the 32px line box), so the row is the same height either way. `NavGroup`'s collapsed branch is a *separate* icon-only element with no label span, so it has to be pinned explicitly — `h-12` (48px), matching the expanded row's `py-2` + 32px line box. Without it the group row was 37px and everything below it sat 11px high when collapsed. Any future nav row that renders different children per state needs the same treatment.
- **Collapsed nav items:** icon only, centered (`justify-center px-0`), same row height as expanded (see above). Label span fades with `transition-[opacity,max-width] duration-200`. Tooltip appears to the right on hover (absolute, `left-full ml-2 z-50`, styled `bg-card border border-border shadow-md font-karantina text-xl`). Tooltip is only rendered when collapsed.
- **NavGroup when collapsed:** renders as a Link to the first sub-link, icon only, tooltip shows the group label. Sub-links are hidden.
- Nav items: icon (Lucide `size={17} strokeWidth={1.5}`) + label `font-karantina text-2xl tracking-wide`
- Active state: `bg-muted text-foreground`; inactive: `text-muted-foreground`

## User Avatar

Component: `<UserAvatar compact={false} />` — no `name`/`initials`/`src` props; reads the signed-in user from `useAuth()` itself (only rendered inside the `(app)` group, which `AuthGate` already guarantees is authenticated). There's no avatar image today (no upload infra — see Profile Page below), so it always renders the initials fallback.
- Renders as a clickable chip: `border border-border rounded-lg px-3 py-1.5` with a dropdown menu. `compact` (mobile `PageHeader`) drops the border/padding/name label down to a bare icon-only circle.
- Initials in `font-karantina text-xl leading-none` inside a `size-8 rounded-full bg-highlight/15` circle (`getInitials()`, `src/lib/utils.ts`)
- Shows first name only next to the avatar: `font-karantina text-xl tracking-wide uppercase text-foreground`
- Name is always uppercase (Karantina rule)
- Dropdown items: "My profile" / "Meu perfil" (links to `/profile` — see Profile Page) and "Sign out" / "Sair" — translated via `user` namespace. The "My profile" `Menu.Item` uses Base UI's `render` prop to render as the i18n `Link` rather than its own default element, same pattern as `DialogPrimitive.Close render={<Button .../>}` elsewhere.

## Profile Page

Route `/profile` (`/perfil` in pt-BR), reached only via the avatar dropdown's "My profile" link — **not** a sidebar nav item, same as every other app's account settings. Lives in the `(app)` route group, so it gets the sidebar/`AuthGate`/`PageHeader` shell for free. Both cards read/write through `useAuth()` (`AuthProvider`'s `updateProfile`/`changePassword`), which calls `PATCH /me`/`PATCH /me/password` — there's no separate server-side data fetch for the page itself.

Two bento cards, `grid grid-cols-1 lg:grid-cols-2 gap-5`:

- **Profile card** (`ProfileCard`): name, email, password change, **and** Google account status, all in one form with one explicit SAVE button on the right (`flex justify-end` — the "saved" acknowledgment sits to its left, not the usual card-CTA full-width/left-aligned layout, since this is a settings form, not a bento card's primary action). Deliberately one card, not a separate security card/dialog — every field here shares the same `currentPassword` reauth and the same submit/error cycle, so splitting them would mean two re-implementations of that cycle instead of one. The Save button is disabled unless `name`/`email`/the new-password field actually differ from the signed-in user's current values — typing into `currentPassword`/`confirmPassword` alone doesn't enable it, since neither represents a change on its own.
  - Field order: NAME → EMAIL → a second section title ("CHANGE PASSWORD", same `font-karantina text-2xl tracking-wide uppercase` treatment as the card's own "PROFILE" heading, not a `border-t` divider — two sections of one card read better as two labeled groups than as a line-separated form) → NEW PASSWORD (always visible, optional, reuses the signup form's live password-requirements checklist — extracted to `PasswordRequirementsList`, `src/components/auth/password-requirements.tsx`, so both forms share one implementation; hint text below it is just "Changing it signs you out of every other device.", not an explanation that it's optional — leaving it blank already reads as "optional" from the empty field itself) → CONFIRM NEW PASSWORD (reveals once NEW PASSWORD has content) → CURRENT PASSWORD (reveals once *either* EMAIL changed *or* a new password is being set, **and the account has a password to confirm**). Current password is placed **last**, immediately above the error/Save row, rather than appearing the moment the user starts editing — so revealing it never pushes down a field the user is actively typing into (it only ever appears below whatever's already stable).
  - **A Google-only account (`!hasPassword`) never shows the CURRENT PASSWORD field at all** — there's nothing to confirm — and the section title/hint switch to "SET PASSWORD"/"Add a password so you can also sign in without Google. This signs you out of every other device." instead of "CHANGE PASSWORD". Same condition the backend applies server-side (`PATCH /me`/`PATCH /me/password` both skip the reauth check when `!hasPassword`), not just a frontend nicety.
  - Below the password section, a third row: **GOOGLE ACCOUNT** — "Connected" (`Check` icon, `text-highlight`) if linked, otherwise the real `GoogleSignInButton` (`text="continue_with"`, Google's neutral "Continue with Google" copy — this action is neither a sign-in nor a sign-up) wired to `linkGoogleAccount`. This is how a password-only account adds Google as a second sign-in method, and how the backend's `POST /me/google` "password-required-to-link" refusal (see Google Sign-In below) gets completed once the user has proven their password by signing in normally.
  - On submit: `name`/`email` go through `updateProfile` first (if changed), then — only if a new password was entered — `changePassword` runs last, since it ends this device's session. Changing the password **always signs the device out** (the form redirects to `/signin` on success) — the backend additionally revokes every *other* session's refresh-token family, but this device re-authenticates too rather than offering a "stay signed in here" option.
- **Preferences card** (`PreferencesCard`): locale / theme / accent color / currency / savings-rate — every field applies **instantly on change**, no Save button, mirroring the header's `LanguageToggle`/`ThemeToggle`/`ColorThemeToggle` (same underlying `updateProfileAction`, deliberately duplicated here for discoverability). `savingsRate` is the one exception — a plain number input (0–100) that commits on blur, not every keystroke; this is a simpler substitute for a slider, since no slider primitive exists in `src/components/ui/` yet. Each field shows a brief `Check`-icon "saved" acknowledgment next to its label, auto-fading — the same pattern as dialogs' "keep adding" acknowledgment, but per-field instead of per-dialog. Every setter (`applyLocale`/`applyTheme`/`applyColorTheme`/`applyCurrency`/`commitSavingsRate`) no-ops when the picked value matches the current one — re-opening a `Select` and landing back on the already-active option, or clicking the segmented control's already-active side, fires no request and no "saved" flash.
  - **Currency is display-only** — changes formatting app-wide (`fmtCurrency(amount, currency)`), never converts a stored value. No hint text spells this out in the UI; it's covered here instead.
  - Locale/currency/accent-color options are deliberately untranslated (same as `LanguageToggle`'s "EN"/"PT") — a language's own name is shown in itself, and currency codes/card-brand-style labels aren't UI copy.

### Preference sync (cookies vs. account)

`theme`/`colorTheme` are account-scoped (`User.theme`/`colorTheme`), but the root layout still reads plain `theme`/`color-theme` cookies synchronously before first paint — a signed-out visitor has no account to read from, and a network round trip there would reintroduce the flash those cookies exist to avoid. So the cookies are a **write-through cache**, not replaced by the account field:
- A toggle click sets the cookie/DOM attribute immediately (unchanged), then fires `updateProfileAction` in the background — the UI never waits on it.
- On sign-in/silent-refresh, the account's stored value overwrites the cookie ("server wins" — don't let a borrowed device's cookie leak into your account).
- At signup, the opposite direction once: the visitor's just-picked cookie value is carried **up** into the new account (`AuthProvider.register()`), not discarded for the account's defaults.
- Locale follows the same "server wins at sign-in" rule, but navigates instead of just setting a cookie — `AuthSigninForm` pushes to the account's locale if it differs from the page's current one; next-intl's own `NEXT_LOCALE` cookie (read by `proxy.ts`) is what the header's `LanguageToggle` already relies on, unchanged.
- Google sign-in (below) is sign-in-or-sign-up in one call, so the frontend can't tell which direction to reconcile from the request alone — the backend's `POST /sessions/google` response carries a `created` flag for exactly this: `true` → carry-up (same as signup, done server-side in `googleSignInAction` since account creation happens inside that one Server Action rather than a separate client effect); `false` → server wins (same as normal sign-in).

## Google Sign-In

"Sign in with Google" renders Google's own button via Google Identity Services (GIS) — not a custom-styled one. This is deliberate on two fronts, not just one:

- **Security:** the frontend only ever gets a signed Google ID token and hands it to the backend; verification (signature against Google's rotating public keys, `aud`/`iss`/expiry, `email_verified`) happens server-side (`google-auth-library`'s `OAuth2Client`, `backend/src/modules/auth/google-token.ts`) and never trusts anything client-side. Google only ever establishes identity — the backend still mints its own access/refresh token pair exactly like `POST /sessions`, so Google is never itself the session.
- **Branding:** Google's own guidelines require using their rendered button rather than a bespoke one, so `GoogleSignInButton` (`src/components/auth/google-sign-in-button.tsx`) only customizes what GIS actually exposes — `theme` (`filled_black` dark / `outline` light, tracking the active theme), `text` (`signin_with` / `signup_with` / `continue_with` depending on context), `shape`, `locale`. No `@react-oauth/google`-style wrapper library — this app's whole auth model is its own `AuthProvider`/cookie session, which a wrapper assuming it owns the session would fight.
- The button is a GIS-managed iframe with a **fixed pixel width** (no percentage-width option), unlike every other button in this app (`w-full`) — a `ResizeObserver` on the wrapping div keeps it sized to the available width instead.

**Account linking policy** (`POST /sessions/google` — sign in or sign up in one call):
- No existing account with this email → creates one, `password: null`.
- Existing account with this email that's itself passwordless (created by a prior Google sign-in) → auto-links; safe, nothing could be relying on "knowing the password" for an account that doesn't have one.
- Existing account with this email that **has** a password → refuses (`409`), rather than silently attaching Google to it. This app's own signup never verifies email ownership, so an attacker could have pre-created an account under someone else's email with a password only they know; auto-linking a verified Google identity to it would hand the real owner into an account the attacker can still unlock. The 409's message directs the user to sign in with their password instead, then the Profile card's GOOGLE ACCOUNT row (`POST /me/google`, authenticated) completes the link.

**A password-less account can always add a password later** from the Profile card (see above) — `hasPassword`/`hasGoogleAccount` on `GET /me` are what both the frontend and the backend's own reauth checks key off of.

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
- **Native form control chrome:** `color-scheme: light` on `:root` / `color-scheme: dark` on `.dark` (`globals.css`) — tells the browser to draw its own unstyled UI (a `type="date"` input's calendar-picker icon, autofill affordances, etc.) in a palette matching the active theme, instead of always assuming light mode. Without this, e.g. the date input's calendar icon renders black even in dark mode.

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
- **Category picker:** `CategorySelect` (`src/components/monthly/category-select.tsx`) — a `Select` listing category icon + Karantina `text-2xl uppercase` label (`size-6 rounded-md bg-highlight/10` icon bubble, smaller than the `size-9` used in the transactions list since it sits inline in a form row), plus a trailing "+" ghost icon button. Every category — the seeded starter set and anything the user creates — is the same kind of row, fetched from the backend; there's no built-in/custom split in the UI (see Categories below). Each dialog fetches the caller's categories, scoped to the relevant kind, on open.
  - **Add:** clicking "+" swaps the whole control (Select + "+") for an inline panel: a text input with confirm/cancel icon buttons, plus an icon grid below it (`grid grid-cols-8 gap-1` of `size-7` icon buttons over the curated set — see Categories) for picking the category's icon, defaulting to the generic `Tag`. Confirming creates the category server-side with both label and icon, and selects it immediately. A duplicate label shows an inline error and keeps the panel open.
  - **Rename/delete:** every row in the open dropdown gets small `Pencil`/`Trash2` icon buttons, revealed on hover/focus at the row's trailing edge — except the seeded "Other" category (one per kind), which only gets the pencil: it's the delete-protected fallback a deleted category's transactions get reassigned to, so there's always somewhere for them to land. Rename opens the same inline panel as "add" (pre-filled with the current label + icon) rather than editing in place inside the open listbox — nesting interactive controls inside a Base UI `Select`'s listbox risks the listbox's own keyboard handling (arrow nav, typeahead) fighting the nested controls. Delete is immediate, no confirmation step; if the deleted category was selected, the field clears.
  - **Selected-icon state** in the grid uses the same `border-highlight bg-highlight/10 text-highlight` treatment as the payment-method option cards elsewhere in this dialog — the one other place a grid of selectable visual options exists.
- **Segmented control:** `SegmentedControl` (`src/components/ui/segmented-control.tsx`) — hand-rolled pill toggle (not a Base UI primitive; a plain button group is simpler than fighting `toggle-group`/`tabs` APIs for a 2–3 option single-select). Style: `flex gap-1 rounded-lg bg-muted p-1`, active pill `bg-card text-foreground shadow-sm`, inactive `text-muted-foreground hover:text-foreground`. Used for Add Expense's timing (One-time / Installments / Recurring). Uses `text-xl` (not the usual `text-2xl` floor) because three long labels ("INSTALLMENTS", "RECURRING") must fit horizontally on mobile without wrapping.
- **Option cards** (payment method): Debit/Pix vs Credit is a bigger decision than timing and benefits from more explanation, so it's two side-by-side cards (`grid grid-cols-2 gap-3`) rather than a segmented-control pill — each is `rounded-lg border p-3` with an icon (`Wallet` / `CreditCard`), the Karantina `text-2xl uppercase` label, and a one-line `text-xs text-muted-foreground` explainer ("Straight from your balance" / "On your credit card") so the distinction is unambiguous. Selected state uses the `--highlight` accent (`border-highlight bg-highlight/10`, icon + label in `text-highlight`/`text-foreground`) instead of the segmented control's neutral `bg-card` — this is the one dialog control that gets the brand accent, since it's the most consequential choice in the form (it decides which balance the expense hits).
- **Frequency (recurring only):** a labeled `Select` (same primitive as the category picker, minus the "+" add affordance), not a segmented control — it's a plain either/or field like category, so it gets the standard field treatment (label above, `Select` below) rather than a pill toggle.
- **Add Expense fields by timing:** One-time → description, then amount+date side by side, then category. Installments → total amount + installment count side by side (live `≈ $X / month` helper text below, recalculated on every keystroke), then description, then date+category side by side. Recurring → frequency select (Monthly/Annual), then description, then amount+date side by side, then category. Payment method and timing are independent — both are always shown regardless of the other's value.
- **Backend-integrated:** submission `POST`s to `/transactions`, then calls `router.refresh()` on success so the new transaction and updated totals appear immediately.
- **Add / Edit Credit Card** (`src/components/credit-card/add-credit-card-dialog.tsx`, one component for both): name (full-width row) → brand `Select` (VISA/MASTERCARD/AMEX/ELO, raw uppercase values — brand names aren't translated, same as `CardVisual`) + limit side by side → closing day + due day (1–28) side by side. No "keep adding" — creating/editing a card is a one-off, not rapid entry.
  - **Add mode** (no `card` prop, `POST`s to `/credit-cards`): two trigger variants via a `variant` prop: `"primary"` — an auto-width Karantina CTA (`addCard` i18n key, "+ ADD NEW CARD"), shown centered below the "no cards yet" empty state on `/credit-cards/current-bill` when the user has zero cards; `"icon"` — a compact `size-10` square icon button (`Plus`), placed next to `CardSelector` in `CardShowcase` for adding another card once one already exists.
  - **Edit mode** (`card` prop passed, `PATCH`s to `/credit-cards/:id`): fields prefill from `card`, title/submit label switch to their edit strings (`editTitle`, `save`), and the trigger is always a compact `size-10` icon button (`Pencil`) — placed in `CardShowcase` between `CardSelector` and the archive button (`[Selector] [Pencil] [Archive] [Plus]`), editing whichever card is currently selected. `variant` is ignored in this mode. The instance is `key={card.id}`'d so switching the selected card resets the form's local state instead of showing stale prefilled values from the previous card.
  - **Archive** (`src/components/credit-card/archive-credit-card-button.tsx`): same compact `size-10` icon-button treatment (`Archive` icon), sitting right after the edit pencil. Opens `ConfirmDialog` rather than a form — archiving (`DELETE /credit-cards/:id`, soft-delete via `archivedAt`) has nothing to fill in. On success, `router.refresh()`; the page's own `cards.find(...) ?? cards[0]` fallback (`current-bill`/`bills-summary` pages) then naturally lands on the next remaining card since the archived one drops out of `GET /credit-cards`. Server rejects (409, shown inline) archiving a card with an unpaid balance on its current cycle.
- **Edit Transaction** (`src/components/common/edit-transaction-dialog.tsx`): opened from a transaction row's `Pencil` icon (see Transactions list below), not its own trigger — controlled entirely by `open`/`transaction` props, `PATCH`s to `/transactions/:id`. Fields shown depend on the row: a one-time income/expense gets payment method (expense only, hidden when `fixedCreditCardId` is set — see below) → description → amount+date side by side → category, same shape as the one-time branch of Add Expense/Income. An installment/recurring occurrence instead shows a `text-xs text-muted-foreground` notice plus only description + category — amount/date/payment method are locked once a series exists (mirrors the backend's `updateTransactionBodySchema`). No "keep adding" — editing one row is a one-off.
  - **`fixedCreditCardId` prop:** set from the credit-card page's transaction list, where every row is implicitly on that one card — hides the payment-method toggle entirely (mirrors `AddCardExpenseDialog`'s own simplified fields) and always resubmits that same card id.
- **Confirm Dialog** (`src/components/common/confirm-dialog.tsx`): generic destructive-action confirmation — title + `text-sm text-muted-foreground` description + Cancel/`DialogDestructiveButton` footer. No trigger of its own (`open`/`onOpenChange` controlled), so a Trash2 icon elsewhere can open it programmatically. `onConfirm` returns `{ok, message?}`; on failure the dialog stays open and shows the error inline instead of closing. `DialogDestructiveButton` (`src/components/ui/dialog.tsx`) is the same auto-width Karantina footer-button treatment as Primary/Secondary but `bg-destructive text-white`. Used for deleting a transaction and archiving a credit card.

## Categories

Every category is a real per-user database row — id, kind (expense/income), label, icon, and an `isFallback` flag (see below). There's no separate hardcoded "built-in" list: a fresh account is seeded at signup with the same starter set every account used to get for free, and from that point on a seeded category is edited/deleted through the exact same UI and endpoints as one the user creates by hand. All category icons share the app's `--highlight` accent color — no per-category colors. Icon bubble style: `size-9 rounded-lg bg-highlight/10` with icon `text-highlight` (in the transactions list; the in-dialog `CategorySelect` uses a smaller `size-6` bubble for the same icon+color treatment).

**Seeding at signup:** `AuthSignupForm` resolves the starter set's labels via `resolveStarterCategories()` (`src/lib/categories.ts`) using the client's already-locale-resolved `useTranslations()` — i.e. the labels come back pre-translated for whichever locale the signup form is rendering in. That resolved `{kind, label, icon, isFallback}[]` array is sent as part of the `POST /users` body and inserted server-side in the same request that creates the account, so an account either has its starter categories or signup failed outright — no partial state. After that moment, the backend has no idea those labels ever came from a translation — they're just stored text, same as anything the user types into the "add category" panel. This does mean a seeded "Food" won't retranslate if the user later switches the app's language, same as a category they typed by hand.

**The fallback category:** exactly one seeded category per kind (the "Other" entry) carries `isFallback: true`. It can be renamed and re-iconed like any other, but never deleted — deleting any other category reassigns its transactions to that kind's fallback, so it has to always exist. `CategorySelect` reflects this by omitting the delete icon on that one row.

**Icon set:** a curated ~30-icon palette lives in `src/lib/category-icons.ts` (`CATEGORY_ICON_KEYS`, `CATEGORY_ICONS`, `DEFAULT_ICON_KEY`) — the single source of truth for turning a category's stored `icon` string into a Lucide component, used by both the transactions list and `CategorySelect`'s picker grid. Kept in sync by hand with the backend's `iconKeySchema` (`backend/src/modules/categories/schemas.ts`), which only validates the key and never renders anything. Lucide has no brand icons (no Uber/Netflix logos) — the set leans on generic category/lifestyle icons instead; consistent abstraction reads cleaner than mixed logos anyway.

The starter set itself (13 expense + 5 income entries, labels + icon key + which one is the fallback) is defined once in `src/lib/categories.ts` (`resolveStarterCategories`) — used only at signup, never fetched or rendered live.

## Pages

| Route | Display Name | Description |
|-------|-------------|-------------|
| `/` | DASHBOARD | Main overview — key metrics, recent transactions |
| `/monthly` | [CURRENT MONTH] | Month-by-month financial breakdown |
| `/signin` | — | Sign-in page (no sidebar) |
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
- **Signin:** "STAY CROOOOOGY" (same in EN and PT-BR)

Subtitles: 6 variants per page per locale, randomly picked server-side with `Math.random()` on each request (no hydration issue — picked in RSC before render). Both EN and PT-BR variants defined in `auth.signin.subtitles` / `auth.signup.subtitles` in the i18n JSON files.

### Logo on auth pages

The full logo, same asset and size as the mobile menu header: `public/crooge-logo.svg` at `width=159 height=62`, centered (`flex items-center justify-center`), `className="invert dark:invert-0"`. Works on `bg-background` in both themes. See Logo assets.

### Live password requirements (signup)

The password field has no static hint text. A live checklist of the three requirements (8+ characters, a number, a symbol) appears below the field on focus, and stays visible as long as the field has any content — it only disappears again once the field is both blurred *and* empty.

That "and empty" half matters more than it looks: hiding the list purely on blur made the list unmount the instant the user pressed the mouse down on CREATE ACCOUNT (mousedown blurs the input first), which shifted the button ~31px up the page before the click resolved. The click then landed on the container behind it and the form silently did nothing — the button was effectively unclickable straight after typing a password, and it's what made every signup E2E test hang. Keeping the list mounted while there's content keeps the layout still across the whole click, and as a bonus a user who tabs away from a rejected password can still see which rule they missed. Any future "reveal extra content near a submit button" behaviour needs the same care: never let a blur handler resize the area above a button.

While visible, the list is re-evaluated on every keystroke — no debounce, since these are cheap string checks and React already re-renders on each keystroke for a controlled input. Each row: `flex items-center gap-1.5 font-sans text-xs`, unmet = `X` icon (Lucide, `size={12}`) + `text-muted-foreground`, met = `Check` icon + `text-highlight` — reusing the same Check/highlight "confirmed" pattern as the dialogs' "keep adding" acknowledgment. The list wrapper has `aria-live="polite"` so screen readers announce progress as requirements are met.

### Monthly page layout

Four stacked sections inside a scrollable `p-7 space-y-5` container:

0. **Month navigator** (`MonthNav` — client component) — `[< ChevronLeft]  MONTH YEAR  [ChevronRight >]`. Clicking prev/next updates `?month=YYYY-MM` search param via `router.push`, causing the page to re-render with the selected month's name in `PageHeader`. Validation: only `YYYY-MM` patterns matching months 01–12 are accepted; invalid values fall back to the current month.

1. **`grid grid-cols-1 sm:grid-cols-2 gap-5`** — Balance card (left) + Spending card (right), stacked on mobile, side-by-side from `sm` (640px) up.
   - Balance card: this month's net — income minus expenses, **resets every month** (not a carried-forward running total; there's no separate Account model) — large, `text-5xl text-highlight`, + income this month (secondary, `text-xl`) + "+ ADD INCOME" **Primary** button (`bg-primary`, white-on-dark). Uses a subtle `--highlight` accent to stand apart from the Spending card: `bg-linear-to-br from-highlight/10 via-card to-card` wash + `border-highlight/20` border.
   - Spending card: spent this month (large, `text-5xl`) + DAILY LIMIT (remaining budget ÷ days left in month, as a `/ DAY` figure, `text-xl`) + "+ ADD EXPENSE" **Secondary** button (`bg-muted text-foreground border border-border`, same treatment as the sidebar's active nav link). Card itself stays neutral (`bg-card`, no highlight wash) — reads as the "cost" counterpart to Balance's "asset" framing. Budget defaults to all of income (`User.savingsRate` defaults to `0`) but can be less — see the profile page's savings-rate field; when it's non-zero, a small `text-xs text-muted-foreground` line ("Saving X% of income") appears below DAILY LIMIT so the lower number doesn't look unexplained.

2. **Credit card section** — full-width bento card. Responsive layout:
   - **Mobile (below `md`):** `flex-col` — landscape card visual (`w-full aspect-[1.587]`) on top, info below.
   - **Desktop (`md`+):** `flex-row gap-7` — portrait card visual (`w-36 aspect-[0.63]`) on the left, info column on the right with `justify-between` to pin VIEW DETAILS at the bottom.
   - Info column: CURRENT BILL (`text-3xl`) + CLOSING DATE + UPCOMING BILLS + VIEW DETAILS ghost button. Card name is not repeated (already on the card visual).

3. **Transactions list** — full-width; rendered by `TransactionsFilterClient` (client component). The server component resolves all translations and formatting before passing to the client. Layout:
   - **Filter bar:** search input (Search icon + `Input`) + category `Select` for client-side filtering. Shows active count in the section header.
   - **Transaction row:** `flex items-center gap-3` — `size-9` icon bubble (shrink-0) + middle div (`flex-1 min-w-0`). Middle div has two rows: (1) `flex justify-between` — category label (`text-2xl truncate`) + amount (`text-sm shrink-0`); (2) `flex items-center gap-2` — description (`text-sm truncate`) + badge (`shrink-0`). Amount and badge are on separate rows to prevent overflow on narrow screens. Row uses `items-center` (not `items-start`) so the amount + edit/delete icons on the trailing edge sit vertically centered against the full two-line row height, not pinned to the top.
   - **Edit/delete:** trailing `Pencil`/`Trash2` icon buttons sit next to the amount, **always visible** (not hover-revealed — this app has to work on touch/mobile devices, which have no hover state), and open `EditTransactionDialog`/`ConfirmDialog` respectively — a single dialog pair shared across the whole list, driven by the clicked row's id rather than one dialog instance per row. Hidden entirely on a `readOnly` row (a credit card bill materialized into the account balance — see `backend/src/modules/credit-cards/materialize-bill-transaction.ts`): it's a side effect, not something the user filed directly, so there's nothing to edit or delete. Unlike `CategorySelect`'s row actions (which stay hover-revealed since that's a mouse-driven dropdown context, not a primary mobile surface), transaction rows are a main page surface and need to be usable by touch.
   - **Empty state:** "No transactions yet" (when data is empty); "No results" (when active filter returns nothing).
   - Padding: `py-1.5 sm:py-2.5` per row (tighter on mobile).

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
