export interface ReadingTime {
  words: number;
  /** Whole minutes, at least 1. */
  minutes: number;
}

const WORDS_PER_MINUTE = 200;

/** Estimates reading time for an MDX body (code blocks count as text). */
export function readingTime(body: string): ReadingTime {
  const text = body
    .replace(/^(import|export)\s.*$/gm, "") // MDX ESM lines
    .replace(/<[^>]+>/g, " ") // JSX / HTML tags
    .replace(/[#>*_`~[\]()!|-]/g, " "); // Markdown punctuation
  const words = text.split(/\s+/).filter((word) => /\w/.test(word)).length;
  return { words, minutes: Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)) };
}
