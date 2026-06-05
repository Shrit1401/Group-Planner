import type { Metadata } from "next";
import { Geist, Caveat } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";

const geist  = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", weight: ["400", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://group-planner.vercel.app"),
  title: {
    default: "Group Planner",
    template: "%s | Group Planner",
  },
  description: "Plan group availability with one link. Pick dates, collect responses, compare day slots, and lock in the best time.",
  applicationName: "Group Planner",
  keywords: ["group planner", "availability poll", "meeting planner", "schedule planner", "doodle alternative"],
  authors: [{ name: "Shrit" }],
  creator: "Shrit",
  openGraph: {
    title: "Group Planner",
    description: "Pick dates, share a link, and find the time that works for everyone.",
    type: "website",
    siteName: "Group Planner",
  },
  twitter: {
    card: "summary",
    title: "Group Planner",
    description: "Pick dates, share a link, and find the time that works for everyone.",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/apple-icon.svg",
  },
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
