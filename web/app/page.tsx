import { buildMetadata } from "@/lib/site/metadata";

export const metadata = buildMetadata({ path: "/" });

export default function HomePage() {
  return (
    <main>
      <h1>Leo Levintza</h1>
      <p>Placeholder home page for the Next.js rebuild.</p>
    </main>
  );
}
