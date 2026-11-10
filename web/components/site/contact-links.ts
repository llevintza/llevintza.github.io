/**
 * Public contact links for the footer, mirroring `contacts` in the Jekyll
 * _config.yml. Icons are the colored set from the public email-icons site.
 * Never add a phone number, a `tel:`/Signal link or an email address here:
 * the site is public (`pnpm check:public-content` fails the build output).
 */
export const ICONS_BASE = "https://llevintza.github.io/email-icons/img/color/";

export const CONTACT_LINKS = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/llevintza/",
    icon: "linkedin.png",
  },
  { label: "GitHub", href: "https://github.com/llevintza", icon: "github.png" },
  { label: "X", href: "https://x.com/llevintza", icon: "x.png" },
  {
    label: "Book a Zoom call",
    href: "https://scheduler.zoom.us/llevintza/availability",
    icon: "zoom.png",
  },
] as const;
