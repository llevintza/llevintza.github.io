/** Main navigation, in this order (matches the Jekyll site's header_pages). */
export const NAV_ITEMS = [
  { href: "/blog/", label: "blog" },
  { href: "/projects/", label: "projects" },
  { href: "/about/", label: "about" },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];

/** True when `pathname` is the item's page or a page below it. */
export function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return path === href || path.startsWith(href);
}
