import { contactLinks, type ContactLink } from "@/content/contact";
import styles from "./contact-section.module.css";

const ICON_SIZE = 18;

function ContactIcon({ link }: { link: ContactLink }) {
  return (
    // Static export: next/image has no optimizer here, and these are tiny
    // fixed-size remote PNGs, so a plain <img> with explicit size is enough.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={link.darkIcon ? `${styles.icon} ${styles.chip}` : styles.icon}
      src={link.icon}
      alt=""
      width={ICON_SIZE}
      height={ICON_SIZE}
      loading="lazy"
      decoding="async"
    />
  );
}

/** "Get in touch": Book a call as the primary button, then the profiles. */
export function ContactSection() {
  const primary = contactLinks.filter((link) => link.primary);
  const others = contactLinks.filter((link) => !link.primary);

  return (
    <section aria-labelledby="get-in-touch" className={styles.section}>
      <h2 id="get-in-touch">Get in touch</h2>
      {primary.map((link) => (
        <p key={link.id}>
          <a className={styles.primary} href={link.href}>
            <ContactIcon link={link} />
            {link.label}
          </a>
        </p>
      ))}
      <ul className={styles.links} aria-label="Profiles">
        {others.map((link) => (
          <li key={link.id}>
            <a className={styles.link} href={link.href} rel="me">
              <ContactIcon link={link} />
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
