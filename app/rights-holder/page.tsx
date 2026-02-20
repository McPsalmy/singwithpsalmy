export default function RightsHolderPage() {
  return (
    <main className="min-h-screen text-white">
      <section className="mx-auto max-w-3xl px-5 py-12">
        <a href="/" className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white">
          <span aria-hidden>←</span> Home
        </a>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Rights-holder contact</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          If you are a rights-holder (or an authorized representative) and would like to request removals, discuss
          licensing, or provide guidance, please reach us directly.
        </p>

        <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
          <div className="text-sm font-semibold">Email</div>
          <div className="mt-2 text-sm text-white/70">rights@singwithpsalmy.com</div>

          <div className="mt-6 text-xs text-white/55">
            Helpful details: track title(s), links to the page(s), proof of ownership/authorization, and your preferred
            resolution.
          </div>
        </div>

        <div className="mt-6">
          <a
            href="/dmca"
            className="inline-block rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
          >
            DMCA takedown →
          </a>
        </div>
      </section>
    </main>
  );
}