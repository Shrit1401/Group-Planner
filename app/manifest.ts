import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Group Planner",
    short_name: "Planner",
    description: "Pick dates, share a link, and find the time that works for everyone.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f4ee",
    theme_color: "#16a34a",
    icons: [
      {
        src: "/icon.svg",
        sizes: "64x64",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/apple-icon.svg",
        sizes: "180x180",
        type: "image/svg+xml",
      },
    ],
  };
}
