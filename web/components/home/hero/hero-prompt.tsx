import { TypedText } from "@/components/motion";

/**
 * The `$ whoami --long` line above the name, typed once with the shared
 * `<TypedText>` primitive (pure CSS, no client JS). The full command is in
 * the DOM from the start, and under reduced motion it shows complete.
 */
export function HeroPrompt({ command }: { command: string }) {
  return (
    <p className="glow font-pixel text-chrome-2x text-muted">
      <span className="text-accent" aria-hidden="true">
        ${" "}
      </span>
      <TypedText text={command} className="text-ink" />
    </p>
  );
}
