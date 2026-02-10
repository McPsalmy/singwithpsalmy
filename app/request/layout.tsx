import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Request a Song",
  description:
    "Can’t find a song? Members can request new karaoke practice tracks to be added to the SingWithPsalmy catalogue.",
  alternates: {
    canonical: "/request",
  },
  openGraph: {
    title: "Request a Song",
    description:
      "Members can request karaoke practice tracks not yet in the catalogue.",
    url: "/request",
    type: "website",
  },
};

export default function RequestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
