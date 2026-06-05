import type { Metadata, Viewport } from "next";
import { Geist, Caveat } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";

const geist  = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", weight: ["400", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://planner.shrit.in"),
  title: {
    default: "Group Planner",
    template: "%s | Group Planner",
  },
  description: "Plan group availability with one link. Pick dates, collect responses, compare day slots, and lock in the best time.",
  applicationName: "Group Planner",
  keywords: [
    "group planner",
    "availability poll",
    "meeting planner",
    "schedule planner",
    "event planner",
    "doodle alternative",
    "find a time",
  ],
  authors: [{ name: "Shrit" }],
  creator: "Shrit",
  publisher: "Shrit",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "Group Planner",
    description: "Pick dates, share a link, and find the time that works for everyone.",
    url: "/",
    type: "website",
    siteName: "Group Planner",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Group Planner - plan together effortlessly",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Group Planner",
    description: "Pick dates, share a link, and find the time that works for everyone.",
    images: ["/twitter-image"],
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/apple-icon.svg",
  },
  manifest: "/manifest.webmanifest",
  category: "productivity",
};

export const viewport: Viewport = {
  themeColor: "#f7f4ee",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${caveat.variable}`}>
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
