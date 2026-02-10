import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Songs",
  description:
    "Browse karaoke practice tracks and performance versions. Search, preview 30-second watermarked clips, and download in Nigeria (₦).",
  alternates: {
    canonical: "/browse",
  },
  openGraph: {
    title: "Browse Songs",
    description:
      "Browse karaoke practice tracks and performance versions. Search, preview, and download in Nigeria (₦).",
    url: "/browse",
    type: "website",
  },
};

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
