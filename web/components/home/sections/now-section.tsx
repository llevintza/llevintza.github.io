import Link from "next/link";

import { Reveal } from "@/components/motion";
import { Card, CardBar, CardBody } from "@/components/ui/card";
import type { RichLine } from "@/content/about";

import { SectionHead } from "./section-head";

function Line({ line }: { line: RichLine }) {
  return (
    <>
      {line.text}
      {line.link ? <Link href={line.link.href}>{line.link.label}</Link> : null}
      {line.after}
    </>
  );
}

/** "Now" (#13): what Leo is working on, verbatim from the profile README. */
export function NowSection({ lines }: { lines: readonly RichLine[] }) {
  return (
    <section aria-labelledby="now">
      <SectionHead id="now" title="Now" path="~/now" />
      <Reveal className="mt-6">
        <Card as="div">
          <CardBar
            aside={
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="size-2 bg-ok" />
                live
              </span>
            }
          >
            now.md
          </CardBar>
          <CardBody>
            <ul className="grid gap-3">
              {lines.map((line) => (
                <li
                  key={line.text}
                  className="relative pl-[2ch] [&>a]:inline-block [&>a]:min-h-6"
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-0 font-mono text-accent"
                  >
                    ›
                  </span>
                  <Line line={line} />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </Reveal>
    </section>
  );
}
