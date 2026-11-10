import { ButtonLink, ExternalButtonLink } from "@/components/ui/button";

import { ctas } from "./content";

/** The hero's two calls to action, on the shared `<Button>` styles (#8). */
export function HeroCtas() {
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <ButtonLink
        href={ctas.projects.href}
        variant="primary"
        className="font-semibold"
      >
        <span aria-hidden="true">[</span>
        {ctas.projects.label}
        <span aria-hidden="true">→ ]</span>
      </ButtonLink>
      <ExternalButtonLink
        href={ctas.bookCall.href}
        variant="secondary"
        glyph={<span className="text-accent">&gt;</span>}
        className="font-semibold"
      >
        {ctas.bookCall.label}
        <span className="sr-only"> (Zoom scheduler, external site)</span>
      </ExternalButtonLink>
    </div>
  );
}
