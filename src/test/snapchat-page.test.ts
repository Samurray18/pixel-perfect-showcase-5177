import { describe, expect, it } from "vitest";

import pageHtml from "@/snapplus/page.html?raw";

describe("Snapchat+ page", () => {
  it("links every purchase CTA to the official Snapchat+ page", () => {
    const officialLinks = pageHtml.match(/https:\/\/www\.snapchat\.com\/plus/g) ?? [];
    expect(officialLinks.length).toBeGreaterThanOrEqual(7);
  });

  it("contains the main sections and no ch7nli branding", () => {
    expect(pageHtml).toContain('id="features"');
    expect(pageHtml).toContain('id="why"');
    expect(pageHtml).toContain('id="how"');
    expect(pageHtml).toContain('id="faq"');
    expect(pageHtml).not.toMatch(/ch7nli|carte cadeau/i);
  });
});
