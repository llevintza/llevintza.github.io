import { outboundProjectEvent } from "@/components/analytics/events";
import type { PublicRepo } from "@/lib/projects/repos";

const dateFormat = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** "All public repos" on /projects/, newest push first (#22). */
export function AllRepos({ repos }: { repos: readonly PublicRepo[] }) {
  return (
    <section aria-labelledby="all-repos-heading">
      <h2 id="all-repos-heading">All public repos</h2>
      {repos.length === 0 ? (
        <p>
          The repo list is unavailable right now. See{" "}
          <a href="https://github.com/llevintza?tab=repositories">
            github.com/llevintza
          </a>
          .
        </p>
      ) : (
        // Minimal markup on purpose: #8 builds the real project card.
        <ul>
          {repos.map((repo) => (
            <li key={repo.name}>
              <h3>
                <a
                  href={repo.repoUrl}
                  {...outboundProjectEvent(repo.name, "repo")}
                >
                  {repo.name}
                </a>
              </h3>
              {repo.description ? <p>{repo.description}</p> : null}
              <p>
                {repo.language ? (
                  <>
                    <span>{repo.language}</span>
                    {" · "}
                  </>
                ) : null}
                {repo.pushedAt ? (
                  <>
                    Updated{" "}
                    <time dateTime={repo.pushedAt}>
                      {dateFormat.format(new Date(repo.pushedAt))}
                    </time>
                  </>
                ) : (
                  "No commits yet"
                )}
                {repo.liveUrl ? (
                  <>
                    {" · "}
                    <a
                      href={repo.liveUrl}
                      {...outboundProjectEvent(repo.name, "live")}
                      aria-label={`Live site for ${repo.name}`}
                    >
                      Live site
                    </a>
                  </>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
