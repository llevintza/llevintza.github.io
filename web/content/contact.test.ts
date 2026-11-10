import { describe, expect, it } from "vitest";
import { CONTACT_ICONS_BASE, contactLinks } from "./contact";

describe("contactLinks", () => {
  it("has exactly one primary link, Book a call", () => {
    const primary = contactLinks.filter((link) => link.primary);
    expect(primary.map((link) => link.id)).toEqual(["book-a-call"]);
  });

  it("uses unique ids and https URLs, with icons from email-icons", () => {
    expect(new Set(contactLinks.map((link) => link.id)).size).toBe(
      contactLinks.length,
    );
    for (const link of contactLinks) {
      expect(new URL(link.href).protocol).toBe("https:");
      expect(link.icon.startsWith(CONTACT_ICONS_BASE)).toBe(true);
    }
  });

  it("never exposes a phone number or an email address", () => {
    const text = JSON.stringify(contactLinks);
    expect(text).not.toMatch(/tel:|sms:|mailto:|signal/i);
    expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(text).not.toMatch(/\+?\d[\d\s().-]{7,}\d/);
  });
});
