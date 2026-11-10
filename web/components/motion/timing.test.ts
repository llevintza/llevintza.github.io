import { describe, expect, it } from "vitest";

import {
  terminalLinesDefaults,
  terminalLinesDuration,
  typedTextDefaults,
  typedTextDuration,
} from "./timing";

describe("typedTextDuration", () => {
  it("adds the start delay to one step per character", () => {
    expect(typedTextDuration("whoami --long")).toBe(
      typedTextDefaults.startDelay + 13 * typedTextDefaults.charDelay,
    );
  });

  it("counts code points, not UTF-16 units", () => {
    expect(typedTextDuration("→✓", { startDelay: 0, charDelay: 10 })).toBe(20);
    expect(typedTextDuration("😀", { startDelay: 0, charDelay: 10 })).toBe(10);
  });

  it("is just the start delay for empty text", () => {
    expect(typedTextDuration("", { startDelay: 150 })).toBe(150);
  });
});

describe("terminalLinesDuration", () => {
  it("ends when the last row prints", () => {
    expect(terminalLinesDuration(3, { startDelay: 1000, lineDelay: 80 })).toBe(
      1160,
    );
  });

  it("uses the defaults", () => {
    expect(terminalLinesDuration(1)).toBe(terminalLinesDefaults.startDelay);
  });

  it("never goes below the start delay", () => {
    expect(terminalLinesDuration(0, { startDelay: 300 })).toBe(300);
  });
});
