import { Hero } from "@/components/home/hero";

export default function HomePage() {
  return (
    // The hero runs full-bleed, so it opts out of the default <main> frame;
    // later home sections (#11, #13) wrap their own content.
    <main id="main" className="max-w-none p-0 sm:p-0">
      <Hero />
    </main>
  );
}
