import { getLocale, getTranslations } from "next-intl/server";
import {
  type ResolvedCategoryOption,
  type ResolvedTransactionGroup,
  type ResolvedTransactionItem,
  TransactionsFilterClient,
} from "@/components/common/transactions-filter-client";
import { getMonthlyTransactions } from "@/lib/data";
import { fmtCurrency, parseLocalDate, toIntlLocale } from "@/lib/format";

/**
 * server component that fetches all monthly transactions, resolves i18n
 * labels/badges/currency formatting, groups them by date (newest first), and
 * hands the pre-formatted result to the client-side `TransactionsFilterClient`
 * for search/filter interaction
 *
 * follows the RSC streaming pattern: this component does its own data fetching
 * rather than receiving props, so the monthly page can wrap it in `<Suspense>`
 * independently of the other sections
 */
export async function TransactionsList({ month }: { month: string }) {
  const t = await getTranslations("monthly");
  const tCatExp = await getTranslations("categories.expense");
  const tCatInc = await getTranslations("categories.income");
  const locale = await getLocale();
  const transactions = await getMonthlyTransactions(month);

  const grouped: Record<string, ResolvedTransactionItem[]> = {};
  const seenCategories = new Set<string>();
  const categories: ResolvedCategoryOption[] = [];

  for (const tx of transactions) {
    const isIncome = tx.amount > 0;
    const tCat = isIncome ? tCatInc : tCatExp;

    const item: ResolvedTransactionItem = {
      id: tx.id,
      category: tx.category,
      categoryLabel: tCat(tx.category),
      description: tx.description,
      formattedAmount: `${isIncome ? "+" : "-"}${fmtCurrency(tx.amount)}`,
      isIncome,
      badge:
        tx.timing === "installment"
          ? {
              label: t("badgeInstallment", {
                current: tx.installmentCurrent ?? 0,
                total: tx.installmentTotal ?? 0,
              }),
              highlight: true,
            }
          : tx.timing === "recurring"
            ? { label: t("badgeRecurring"), highlight: false }
            : tx.timing === "oneTime"
              ? { label: t("badgeOneTime"), highlight: false }
              : undefined,
    };

    if (!grouped[tx.date]) grouped[tx.date] = [];
    grouped[tx.date]!.push(item);

    if (!seenCategories.has(tx.category)) {
      seenCategories.add(tx.category);
      categories.push({ key: tx.category, label: tCat(tx.category) });
    }
  }

  const groups: ResolvedTransactionGroup[] = Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({
      date,
      formattedDate: parseLocalDate(date).toLocaleDateString(
        toIntlLocale(locale),
        { weekday: "long", month: "long", day: "numeric" },
      ),
      items: grouped[date]!,
    }));

  return (
    <TransactionsFilterClient
      groups={groups}
      categories={categories}
      title={t("transactions")}
      searchPlaceholder={t("searchPlaceholder")}
      allCategoriesLabel={t("allCategories")}
      noResultsLabel={t("noResults")}
      emptyLabel={t("emptyTransactions")}
    />
  );
}
