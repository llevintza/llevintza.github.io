import Link from "next/link";

import { ctas } from "./content";

/*
 * TODO(#8): replace these token-styled links with <Button> from the
 * components story once it lands (primary and secondary variants).
 */
const base =
  "inline-flex items-center gap-2 border px-4 py-3 font-mono text-sm leading-none font-semibold no-underline shadow-hard active:translate-x-0.5 active:translate-y-0.5 active:shadow-none motion-reduce:active:translate-none";

export function HeroCtas() {
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <Link
        href={ctas.projects.href}
        className={`${base} border-btn-bg bg-btn-bg text-btn-ink hover:border-accent`}
      >
        <span aria-hidden="true">[</span>
        {ctas.projects.label}
        <span aria-hidden="true">→ ]</span>
      </Link>
      <a
        href={ctas.bookCall.href}
        className={`${base} border-line bg-panel text-head hover:border-accent hover:bg-inverse-bg hover:text-inverse-ink`}
      >
        <span className="text-accent" aria-hidden="true">
          &gt;
        </span>
        {ctas.bookCall.label}
        <span className="sr-only"> (Zoom scheduler, external site)</span>
        <span className="text-muted" aria-hidden="true">
          ↗
        </span>
      </a>
    </div>
  );
}
