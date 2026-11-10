import type { CSSProperties } from "react";

import styles from "./hero.module.css";

/**
 * The `$ whoami --long` line above the name. The command types out once
 * (CSS `steps()`, no JS); with reduced motion it is shown complete. The full
 * text is always in the DOM, so screen readers get it immediately.
 */
export function HeroPrompt({ command }: { command: string }) {
  return (
    <p className="glow font-pixel text-chrome-2x text-muted">
      <span className="text-accent" aria-hidden="true">
        ${" "}
      </span>
      <span
        className={`${styles.typed} text-ink`}
        style={{ "--chars": command.length } as CSSProperties}
      >
        {command}
      </span>
      <span className="cursor-block" aria-hidden="true" />
    </p>
  );
}
