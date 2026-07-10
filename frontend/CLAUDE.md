@AGENTS.md
@DESIGN.md

Before making any UI change — adding, editing, or removing anything visual — read DESIGN.md first.
Whenever you learn something new about how the UI should look or behave, update DESIGN.md immediately. Treat it as the living source of truth for the design system.

Every user-facing string must have translations in BOTH src/i18n/messages/en.json AND src/i18n/messages/pt-BR.json. Never hardcode display text in components.

Minimize "use client". Before marking a component as a client component, ask: does the entire component need interactivity, or just a small part? If just a part — extract only that part as a client component. Keep containers, sidebars, and layout shells as server components. Pass pre-rendered JSX (React.ReactNode) from server to client components — never pass component references (functions) across that boundary.
