import { getLocale, getTranslations } from "next-intl/server";
import type {
  ResolvedCategoryOption,
  ResolvedTransactionGroup,
  ResolvedTransactionItem,
} from "@/components/common/transaction-row-list";
import { MonthlyTransactionsFilter } from "@/components/monthly/monthly-transactions-filter";
import { resolveCategory } from "@/lib/categories";
import { getCategories, getMonthlyTransactions, getProfile } from "@/lib/data";
import { fmtCurrency, parseLocalDate, toIntlLocale } from "@/lib/format";
import { DEFAULT_TRANSACTIONS_PAGE_SIZE } from "@/lib/transactions-pagination";

interface TransactionsListProps {
  month: string;
  search?: string;
  category?: string;
  pageSize?: number;
}

/**
 * server component that fetches one page of the month's transactions
 * (search/category/pageSize all applied server-side, see `lib/data.ts`'s
 * `getMonthlyTransactions`), resolves i18n labels/badges/currency
 * formatting, groups them by date (newest first), and hands the
 * pre-formatted result to the client-side `MonthlyTransactionsFilter` for
 * the search box/category select/"load more" interaction
 *
 * follows the RSC streaming pattern: this component does its own data fetching
 * rather than receiving props, so the monthly page can wrap it in `<Suspense>`
 * independently of the other sections
 */
export async function TransactionsList({
  month,
  search,
  category,
  pageSize = DEFAULT_TRANSACTIONS_PAGE_SIZE,
}: TransactionsListProps) {
  const t = await getTranslations("monthly");
  const tCommon = await getTranslations("dialogs.common");
  const locale = await getLocale();
  const [page, categories, profile] = await Promise.all([
    getMonthlyTransactions(month, { pageSize, search, category }),
    getCategories(),
    getProfile(),
  ]);
  const unknownLabel = tCommon("unknownCategory");

  const grouped: Record<string, ResolvedTransactionItem[]> = {};

  for (const tx of page.items) {
    const isIncome = tx.amount > 0;
    const resolved = resolveCategory(tx.category, categories, unknownLabel);

    const item: ResolvedTransactionItem = {
      id: tx.id,
      date: tx.date,
      category: tx.category,
      categoryLabel: resolved.label,
      categoryIcon: resolved.icon,
      description: tx.description,
      amount: Math.abs(tx.amount),
      formattedAmount: `${isIncome ? "+" : "-"}${fmtCurrency(tx.amount, profile.currency)}`,
      isIncome,
      timing: tx.timing,
      paymentMethod: tx.paymentMethod,
      creditCardId: tx.creditCardId,
      readOnly: tx.readOnly,
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
    grouped[tx.date]?.push(item);
  }

  const groups: ResolvedTransactionGroup[] = Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({
      date,
      formattedDate: parseLocalDate(date).toLocaleDateString(
        toIntlLocale(locale),
        { weekday: "long", month: "long", day: "numeric" },
      ),
      items: grouped[date] ?? [],
    }));

  // From `page.categories` (every category used this month, ignoring the
  // active filter — not derived from `page.items`, which under pagination
  // won't always cover every category).
  const categoryOptions: ResolvedCategoryOption[] = page.categories.map(
    (categoryId) => ({
      key: categoryId,
      label: resolveCategory(categoryId, categories, unknownLabel).label,
    }),
  );

  return (
    <MonthlyTransactionsFilter
      groups={groups}
      categories={categoryOptions}
      total={page.total}
      pageSize={page.pageSize}
      search={search}
      category={category}
      title={t("transactions")}
      searchPlaceholder={t("searchPlaceholder")}
      allCategoriesLabel={t("allCategories")}
      noResultsLabel={t("noResults")}
      emptyLabel={t("emptyTransactions")}
      loadMoreLabel={t("loadMore")}
    />
  );
}
