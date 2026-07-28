import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// locale-aware drop-in replacements for next/link and next/navigation.
// import these (not the plain next.js versions) anywhere a component needs
// to link or navigate
export const { Link, useRouter, usePathname, redirect, permanentRedirect } =
  createNavigation(routing);
