# Motion system

Console-style motion for the rebuild (issue #9, design spec #60 §6). Use
these primitives instead of writing Motion (`motion/react`) or CSS
animations by hand, so the whole site moves the same way and every
animation respects the visitor's settings.

```ts
import {
  Reveal,
  Stagger,
  StaggerItem,
  TypedText,
  TerminalLines,
  typedTextDuration,
  useHoverMotion,
} from "@/components/motion";
```

## Rules every primitive follows

1. **Off under `prefers-reduced-motion: reduce`.** `app/template.tsx` wraps
   every page in `<MotionConfig reducedMotion="user">`, but Motion still
   fades opacity in that mode, so each primitive also checks
   `useReducedMotion()` and renders plain static markup. CSS animations live
   only inside `@media (prefers-reduced-motion: no-preference)`.
2. **Visible at rest.** The server HTML shows everything. Nothing is hidden
   until JavaScript has run, and the CSS animations finish on their own, so
   if JS fails or is disabled the content is simply there. Print always shows
   the finished state, even for blocks still waiting below the fold.
3. **No layout shift.** Only `opacity` and `transform` animate. Boxes keep
   their size from the first paint (typed text is in the DOM from the start,
   the cursor's space is reserved). Lighthouse CLS measured 0 on every page.
4. **Never delay the first paint.** Scroll reveals only animate blocks that
   start below the viewport, and the page transition skips the first load.
5. **Short and crisp.** Durations and easing come from `tokens.ts`
   (`motionTokens`): 80 ms feedback, 200 ms page change, 320 ms reveal,
   12 px travel at most. No bounce, no springs, no infinite loops apart
   from the cursor blink.

Not allowed (spec #60 §6): text flicker, scanline roll, page-wide
twinkling, draggable windows, hover lift on cards.

## Primitives

### Page transition (already applied)

`app/template.tsx` renders `<MotionProvider><PageTransition>`, which gives
every client-side navigation a 200 ms fade plus a 6 px lift. Nothing to do
in pages. Don't add a second page-level animation.

**Keep fixed and sticky UI out of pages.** For those 200 ms the wrapper has
a `transform`, which makes it the containing block for any
`position: fixed` or `position: sticky` descendant. A fixed or sticky
element inside a page would jump during a navigation. The site header (#8),
skip links, toasts and any other fixed or sticky UI belong in
`app/layout.tsx`, outside the template.

### Using Motion directly: `m.*`, not `motion.*`

The template's `MotionProvider` uses `LazyMotion` with `domAnimation` in
`strict` mode, so pages load only the animation features we use (no layout
or drag code). Below it, use the light components (`import { m } from
"motion/react"`, then `<m.div>`, `<m.button>`). A full `<motion.div>` throws
in strict mode.

Components rendered in `app/layout.tsx` (outside the template), such as the
header, have no provider. If they animate with `m.*`, wrap them in their
own `<MotionProvider>`. Without one, `m.*` renders but doesn't animate.

### `<Reveal>`: scroll reveal for one block

```tsx
<Reveal>
  <section>…</section>
</Reveal>
```

Fades in and rises 12 px when the block scrolls into view (once by
default; `once={false}` replays it, `amount={0.3}` needs 30% visible).
Renders a wrapping `div`, so pass `className` for layout if needed. Use it
for sections further down a page, not for the hero, the page title or
anything that could be the LCP element (those start on screen and are left
alone anyway).

### `<Stagger>` + `<StaggerItem>`: lists that "print" in order

```tsx
<Stagger as="ul" className="grid gap-4">
  {posts.map((post) => (
    <StaggerItem as="li" key={post.slug}>
      <PostCard post={post} />
    </StaggerItem>
  ))}
</Stagger>
```

Items appear 60 ms apart when the group scrolls into view. Use it for card
grids and post lists (#8, #13). Keep groups short; past about 12 items the
tail feels slow, so split long lists or reveal them with one `<Reveal>`.

### `<TypedText>`: one-shot typing with a block cursor

```tsx
<p className="font-mono">
  ~/leo $ <TypedText text="whoami --long" />
</p>
```

Types a single line once, with the block cursor travelling along and then
blinking (`cursor="solid" | "none"` to change). Pure CSS, so it also works in
Server Components. Requires a **monospace** font (the cursor moves in `ch`)
and **one line** of text (it sets `white-space: pre`). Screen readers get
the full string once. Under reduced motion the text is complete and the
cursor solid. Options: `startDelay` (ms, default 200), `charDelay` (ms per
character, default 45). Use it for the hero prompt (#12) and at most one
other place per page.

For a static cursor without typing (for example the `~/leo $` brand in the
header), use the `cursor-block` utility from `app/globals.css`.

### `<TerminalLines>`: terminal output rows

```tsx
const command = "whoami --long";

<TypedText text={command} />
<TerminalLines startDelay={typedTextDuration(command) + 150}>
  <span>name ....... Leo Levintza</span>
  <span>role ....... engineer</span>
</TerminalLines>
```

Each child is one row; rows appear instantly one after another (80 ms
apart by default, `lineDelay`), like command output. Rows keep their space
from the first paint. `as="ul" | "ol"` wraps rows in `li`. Pure CSS, Server
Component safe. `typedTextDuration()` and `terminalLinesDuration()` return
the timings so you can chain a prompt, its output and a next prompt.

### `useHoverMotion()`: hover and press feedback

```tsx
"use client";
import { m } from "motion/react";

const press = useHoverMotion("press");
<m.button className="shadow-hard active:shadow-none" {...press}>
  [ read more ]
</m.button>;
```

- `"press"`: buttons shift 2 px into their hard shadow while pressed
  (remove the shadow with CSS `:active`).
- `"nudge"`: prompt links (`> contact`, `./blog`) move 2 px right on hover.

Returns `{}` under reduced motion, so only the CSS colour change remains.

**Colour changes are not Motion.** Inverse-video title bars, link hovers
and the active nav item switch instantly in CSS with no `transition`
(spec #60 §5 and §6).

## Tests

`timing.test.ts` (vitest, `pnpm test`) covers the timing helpers. The
reduced-motion, no-JS and no-layout-shift guarantees were checked by hand
with Playwright and Lighthouse (see PR #68). They should move into the e2e
suite once it lands (#34).

## Adding something new

Add a primitive here rather than animating inside a component, follow the
five rules above, and check it with the visitor's reduced-motion setting on,
JavaScript off, and a Lighthouse run (CLS under 0.05).
