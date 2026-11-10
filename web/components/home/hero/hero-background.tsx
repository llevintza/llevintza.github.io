import styles from "./hero.module.css";

/**
 * Decorative dithered mesh behind the hero (#60 §4): the direction-B
 * gradient mesh, punched into a halftone dot screen with CSS masks. Static
 * by default; drifts slowly only when the visitor has no motion preference.
 * Hidden under `prefers-contrast: more` and in print.
 */
export function HeroBackground() {
  return (
    <div className={styles.mesh} aria-hidden="true">
      <div className={styles.screen}>
        <div className={styles.field} />
      </div>
      <div className={`${styles.screen} ${styles.screenFine}`}>
        <div className={styles.field} />
      </div>
    </div>
  );
}
