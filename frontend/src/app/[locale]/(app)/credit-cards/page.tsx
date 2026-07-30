import { redirect } from "@/i18n/navigation";

/** "/credit-cards" has no page of its own — it always redirects to the current-bill sub-page (the sidebar's `NavGroup` links go straight to the sub-pages, this mainly guards a bare "/credit-cards" visit) */
export default function CreditCardsPage() {
  redirect("/credit-cards/current-bill");
}
