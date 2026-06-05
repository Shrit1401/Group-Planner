import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/plan/"],
      },
    ],
    sitemap: "https://planner.shrit.in/sitemap.xml",
  };
}
