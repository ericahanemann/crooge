/**
 * Shared between the monthly page's server list (`transactions-list.tsx`)
 * and its client-side "load more" control
 * (`monthly-transactions-filter.tsx`) — kept in its own module since the
 * former is a server component and can't be imported from the latter
 * without pulling server-only code into the client bundle.
 */
export const DEFAULT_TRANSACTIONS_PAGE_SIZE = 20;
export const TRANSACTIONS_PAGE_SIZE_STEP = 20;
