import type { CaseStudyVideo as Video } from "@/lib/projects/case-studies";

/**
 * A case study's walkthrough video (#111): native controls, so it's keyboard
 * operable, and nothing loads or plays until the visitor presses play
 * (`preload="none"`, no autoplay or loop). `width`/`height` reserve the
 * space, so there's no layout shift. The summary underneath says in words
 * what the video shows.
 */
export function CaseStudyVideo({ video }: { video: Video }) {
  return (
    <section aria-labelledby="video-heading" className="my-10">
      <h2 id="video-heading">{video.title}</h2>
      <video
        controls
        playsInline
        preload="none"
        poster={video.poster}
        width={video.width}
        height={video.height}
        aria-label={video.title}
        title={video.title}
        className="block h-auto w-full max-w-3xl border border-line bg-panel"
      >
        <source src={video.src} type="video/mp4" />
        {video.captions ? (
          <track
            kind="captions"
            src={video.captions}
            srcLang="en"
            label="English"
            default
          />
        ) : null}
        <a href={video.src}>Download the video (MP4)</a>
      </video>
      <p className="mt-3 max-w-3xl text-muted">{video.summary}</p>
    </section>
  );
}
