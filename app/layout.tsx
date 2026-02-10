import { Instagram, Youtube, Music2 } from "lucide-react";
import "./globals.css";

export const metadata = {
    title: {
    default: "SingWithPsalmy — Karaoke practice tracks & performance versions",
    template: "%s — SingWithPsalmy",
  },
  alternates: {
    canonical: "/",
  },

  description:
    "High-quality karaoke practice tracks and performance versions for practice, performance, and pure fun. Browse, preview, and download.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      "http://localhost:3000"
  ),

    robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: true,
    },
  },

  openGraph: {
    title: "SingWithPsalmy — Karaoke practice tracks & performance versions",
    description:
      "High-quality karaoke practice tracks and performance versions for practice, performance, and pure fun.",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "SingWithPsalmy",
    description:
      "Karaoke practice tracks and performance versions for practice, performance, and pure fun.",
  },

};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white antialiased">
        <div className="relative min-h-screen overflow-hidden">
          {/* background glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-32 -top-32 h-[520px] w-[520px] rounded-full bg-fuchsia-500/10 blur-[120px]" />
            <div className="absolute -right-32 top-10 h-[560px] w-[560px] rounded-full bg-indigo-500/12 blur-[120px]" />
            <div className="absolute left-1/2 top-[420px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/8 blur-[120px]" />
          </div>

          <div className="relative z-10 flex min-h-screen flex-col">
            {/* pages */}
            <div className="flex-1">{children}</div>

            {/* site-wide footer */}
            <footer className="mx-auto w-full max-w-6xl px-5 pb-10 pt-10">
              <div className="flex flex-col gap-3 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
                {/* left: copyright + legal links */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/55">
                  <span>© {new Date().getFullYear()} SingWithPsalmy</span>
                  <span className="text-white/25">•</span>
                  <a href="/dmca" className="hover:text-white">
                    DMCA
                  </a>
                  <span className="text-white/25">•</span>
                  <a href="/rights-holder" className="hover:text-white">
                    Rights-holder contact
                  </a>
                  <span className="text-white/25">•</span>
<a href="/recover" className="hover:text-white">
  Recover purchase (expires 30 mins)
</a>

                </div>

                {/* right: subtle social icons */}
                <div className="flex items-center gap-3">
                  <a
                    href="https://instagram.com/singwithpsalmy"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 hover:bg-white/10"
                    title="Instagram"
                  >
                    <Instagram className="h-4 w-4 text-white/70" />
                  </a>

                  <a
                    href="https://tiktok.com/@singwithpsalmy"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="TikTok"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 hover:bg-white/10"
                    title="TikTok"
                  >
                    <Music2 className="h-4 w-4 text-white/70" />
                  </a>

                  <a
                    href="https://youtube.com/@singwithpsalmy"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="YouTube"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 hover:bg-white/10"
                    title="YouTube"
                  >
                    <Youtube className="h-4 w-4 text-white/70" />
                  </a>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
