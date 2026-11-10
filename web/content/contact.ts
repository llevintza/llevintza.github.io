// Contact links: the single typed source for every place the site shows them
// (the About page "Get in touch" section and the site footer).
// Mirrors `contacts:` in the Jekyll `_config.yml`.
// Public-site rule: no phone number and no email address, ever.

/**
 * Site path of the vendored colour icons (H72-02): copies of the
 * llevintza/email-icons `img/color/` set, so the site doesn't depend on
 * another repo's published path. Email signatures keep loading theirs from
 * /email-icons/.
 */
export const CONTACT_ICONS_BASE = "/icons/contact/";

export type ContactId = "linkedin" | "github" | "x" | "book-a-call";

export type ContactLink = {
  id: ContactId;
  /** Visible link text. */
  label: string;
  /** External https URL. */
  href: `https://${string}`;
  /** Site-relative icon path (square PNG under public/). */
  icon: `/${string}`;
  /**
   * The icon is dark artwork (black logo) that disappears on a dark
   * background, so dark themes should put it on a light chip.
   */
  darkIcon: boolean;
  /** The main call to action; render it as a prominent button. */
  primary: boolean;
};

export const contactLinks: readonly ContactLink[] = [
  {
    id: "book-a-call",
    label: "Book a call",
    href: "https://scheduler.zoom.us/llevintza/availability",
    icon: `${CONTACT_ICONS_BASE}zoom.png`,
    darkIcon: false,
    primary: true,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/llevintza/",
    icon: `${CONTACT_ICONS_BASE}linkedin.png`,
    darkIcon: false,
    primary: false,
  },
  {
    id: "github",
    label: "GitHub",
    href: "https://github.com/llevintza",
    icon: `${CONTACT_ICONS_BASE}github.png`,
    darkIcon: true,
    primary: false,
  },
  {
    id: "x",
    label: "X",
    href: "https://x.com/llevintza",
    icon: `${CONTACT_ICONS_BASE}x.png`,
    darkIcon: true,
    primary: false,
  },
];
