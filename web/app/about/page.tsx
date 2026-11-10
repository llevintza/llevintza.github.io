import type { Metadata } from "next";
import Link from "next/link";
import { ContactSection } from "@/components/contact/contact-section";
import { about, formatLanguages, type RichLine } from "@/content/about";

export const metadata: Metadata = {
  title: `About · ${about.name}`,
  description:
    "Leo Levintza, Principal Software Engineer: distributed systems, cloud-native backends, and agentic AI tooling for the SDLC.",
};

function Line({ line }: { line: RichLine }) {
  return (
    <>
      {line.text}
      {line.link ? <Link href={line.link.href}>{line.link.label}</Link> : null}
      {line.after}
    </>
  );
}

export default function AboutPage() {
  return (
    <main>
      <article>
        <h1>About</h1>

        <section aria-labelledby="bio">
          <h2 id="bio">Bio</h2>
          <p>
            <strong>{about.headline}</strong>
          </p>
          <p>{about.bio}</p>
        </section>

        <section aria-labelledby="now">
          <h2 id="now">Now</h2>
          <ul>
            {about.now.map((line) => (
              <li key={line.text}>
                <Line line={line} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="selected-work">
          <h2 id="selected-work">Selected work</h2>
          <ul>
            {about.selectedWork.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="certifications">
          <h2 id="certifications">Certifications</h2>
          <ul>
            {about.certifications.map((cert) => (
              <li key={cert.issuer}>
                {cert.issuer}: {cert.courses.join(" · ")} ({cert.year})
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="education">
          <h2 id="education">Education and languages</h2>
          <ul>
            {about.education.map((edu) => (
              <li key={`${edu.degree}-${edu.institution}`}>
                {edu.degree} — {edu.institution} ({edu.startYear}–{edu.endYear})
              </li>
            ))}
          </ul>
          <p>{formatLanguages(about.languages)}</p>
        </section>

        <ContactSection />
      </article>
    </main>
  );
}
