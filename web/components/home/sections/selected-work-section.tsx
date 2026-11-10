import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import type { Metric } from "@/content/highlights";

import { SectionHead } from "./section-head";

function MetricTile({ metric }: { metric: Metric }) {
  return (
    <div className="flex h-full flex-col gap-1 bg-panel p-4">
      {metric.from ? (
        <p className="m-0 font-mono text-micro text-muted">
          from {metric.from} <span aria-hidden="true">→</span>
          <span className="sr-only">to</span>
        </p>
      ) : null}
      <p className="m-0 font-mono text-2xl leading-tight font-semibold text-head tabular-nums">
        {metric.value}
        {metric.unit ? (
          <span className="ml-[0.5ch] text-sm font-normal text-accent">
            {metric.unit}
          </span>
        ) : null}
      </p>
      <p className="m-0 mt-auto font-mono text-sm text-muted">{metric.label}</p>
    </div>
  );
}

/**
 * "Selected work" (#13): the README's figures as highlight tiles, then the
 * README lines themselves, word for word, so every tile has its context.
 */
export function SelectedWorkSection({
  items,
  metrics,
}: {
  items: readonly string[];
  metrics: readonly Metric[];
}) {
  return (
    <section aria-labelledby="selected-work">
      <SectionHead id="selected-work" title="Selected work" path="~/impact" />
      {/* 1px gaps over the --line colour draw the grid rules between tiles. */}
      <Stagger
        as="ul"
        className="mt-6 grid grid-cols-1 gap-px border border-line bg-line shadow-hard min-[30rem]:grid-cols-2 lg:grid-cols-4"
      >
        {metrics.map((metric) => (
          <StaggerItem as="li" key={`${metric.value}-${metric.label}`}>
            <MetricTile metric={metric} />
          </StaggerItem>
        ))}
      </Stagger>
      <Reveal className="mt-8">
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item} className="relative pl-[2ch]">
              <span
                aria-hidden="true"
                className="absolute left-0 font-mono text-accent"
              >
                ›
              </span>
              {item}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
