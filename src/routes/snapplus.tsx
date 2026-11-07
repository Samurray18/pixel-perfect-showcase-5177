import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";

import rawHtml from "@/snapplus/page.html?raw";
import snapCss from "@/snapplus/styles.css?url";
import snapScript from "@/snapplus/script.js?url";
import snapFavicon from "@/snapplus/favicon.svg?url";

const BODY_PATTERN = /<body[^>]*>([\s\S]*?)<\/body>/i;
const INLINE_SCRIPT_PATTERN =
  /<script[^>]*src=["'][^"']*script\.js["'][^>]*>\s*<\/script>/i;

function extractBody(html: string) {
  const body = html.match(BODY_PATTERN)?.[1] ?? html;
  return body.replace(INLINE_SCRIPT_PATTERN, "");
}

export const Route = createFileRoute("/snapplus")({
  head: () => ({
    meta: [
      { title: "Snapchat+ — Upgrade your Snapchat" },
      {
        name: "description",
        content:
          "Unlock exclusive Snapchat+ features: custom app icons, a profile badge, #1 Best Friend, story insights, early access and more.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Snapchat+ — Upgrade your Snapchat" },
      {
        property: "og:description",
        content:
          "Custom app icons, profile badge, #1 Best Friend, story insights and early access. Subscribe on the official Snapchat page.",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "icon", href: snapFavicon, type: "image/svg+xml" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap",
      },
      { rel: "stylesheet", href: snapCss },
    ],
  }),
  component: SnapPlusPage,
});

function SnapPlusPage() {
  const body = useMemo(() => extractBody(rawHtml), []);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = snapScript;
    script.async = false;
    script.setAttribute("data-snapplus", "true");
    document.body.appendChild(script);

    const previousLang = document.documentElement.lang;
    document.documentElement.lang = "en";

    return () => {
      script.remove();
      document.documentElement.lang = previousLang;
    };
  }, []);

  return (
    <div className="snapplus-route" dangerouslySetInnerHTML={{ __html: body }} />
  );
}
