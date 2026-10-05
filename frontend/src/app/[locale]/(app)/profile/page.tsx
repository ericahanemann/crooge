import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/common/page-header";
import { PreferencesCard } from "@/components/profile/preferences-card";
import { ProfileCard } from "@/components/profile/profile-card";

/**
 * Reached only via the avatar dropdown's "My profile" link — not a sidebar
 * nav item, same as every other app's account settings. Both cards
 * read/write through `useAuth()` (the already-signed-in client context),
 * so there's no server-side data fetch here beyond the page shell.
 */
export default async function ProfilePage() {
  const t = await getTranslations("profile");

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title={t("title")} />
      <div className="flex-1 overflow-auto p-4 sm:p-7">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ProfileCard />
          <PreferencesCard />
        </div>
      </div>
    </div>
  );
}
