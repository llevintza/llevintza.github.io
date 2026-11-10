import type { TocEntry } from "@/lib/content/toc";

function TocList({ toc }: { toc: readonly TocEntry[] }) {
  return (
    <ol className="mdx-toc__list">
      {toc.map((entry) => (
        <li key={entry.id} className={`mdx-toc__item--h${entry.depth}`}>
          <a href={`#${entry.id}`}>{entry.text}</a>
        </li>
      ))}
    </ol>
  );
}

/**
 * Table of contents, in two server-rendered forms and no JavaScript: a
 * collapsible `<details>` above the post on small screens, and a sticky
 * aside next to it on wide ones. CSS shows exactly one, so assistive tech
 * only ever meets one navigation landmark.
 */
export function TableOfContents({
  toc,
  variant,
}: {
  toc: readonly TocEntry[];
  variant: "inline" | "aside";
}) {
  if (variant === "inline") {
    return (
      <nav className="mdx-toc mdx-toc--inline" aria-label="On this page">
        <details>
          <summary>
            <span aria-hidden="true">$ </span>contents
            <span className="mdx-toc__count"> ({toc.length})</span>
          </summary>
          <TocList toc={toc} />
        </details>
      </nav>
    );
  }
  return (
    <nav className="mdx-toc mdx-toc--aside" aria-label="On this page">
      <p className="mdx-toc__heading" aria-hidden="true">
        ## on this page
      </p>
      <TocList toc={toc} />
    </nav>
  );
}
