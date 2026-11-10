import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentProps,
  ReactNode,
} from "react";

import { cn } from "./cn";
import { focusRing } from "./focus";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 border font-mono no-underline whitespace-nowrap select-none " +
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  // Filled: --btn-bg / --btn-ink, hard shadow.
  primary:
    "border-btn-bg bg-btn-bg text-btn-ink shadow-hard hover:bg-inverse-bg hover:border-inverse-bg hover:text-inverse-ink",
  // Outlined on the panel surface, inverse video on hover.
  secondary:
    "border-line bg-panel text-head shadow-hard hover:border-inverse-bg hover:bg-inverse-bg hover:text-inverse-ink",
  // Text-only: no frame or shadow until hover.
  ghost:
    "border-transparent bg-transparent text-ink hover:bg-inverse-bg hover:text-inverse-ink",
};

// Pressed: the shadow goes and the button sits 2px down-right, as if pushed
// into the page. Instant (no transition); only the colour changes when the
// visitor prefers reduced motion.
const pressed =
  "active:shadow-none motion-safe:active:translate-x-[2px] motion-safe:active:translate-y-[2px]";

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
};

/** Class list for anything that should look like a button. */
export function buttonClasses({
  variant = "secondary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    base,
    variants[variant],
    pressed,
    sizes[size],
    focusRing,
    className,
  );
}

/** Leading glyph (`>`, `$`, `+`): decorative, so hidden from screen readers. */
function Glyph({ glyph }: { glyph?: ReactNode }) {
  if (glyph == null) return null;
  return <span aria-hidden="true">{glyph}</span>;
}

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Optional prompt glyph before the label, e.g. `>` or `$`. */
  glyph?: ReactNode;
};

export type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

/** A `<button>` in the console style: square, 1px frame, hard shadow. */
export function Button({
  variant,
  size,
  glyph,
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      <Glyph glyph={glyph} />
      {children}
    </button>
  );
}

export type ButtonLinkProps = CommonProps &
  Omit<ComponentProps<typeof Link>, "className"> & { className?: string };

/** An internal link (next/link) styled as a button. */
export function ButtonLink({
  variant,
  size,
  glyph,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, className })} {...props}>
      <Glyph glyph={glyph} />
      {children}
    </Link>
  );
}

export type ExternalButtonLinkProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

/** An external link styled as a button, with a trailing `↗` marker. */
export function ExternalButtonLink({
  variant,
  size,
  glyph,
  className,
  children,
  ...props
}: ExternalButtonLinkProps) {
  return (
    <a className={buttonClasses({ variant, size, className })} {...props}>
      <Glyph glyph={glyph} />
      {children}
      <span aria-hidden="true">↗</span>
    </a>
  );
}
