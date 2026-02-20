export default function DmcaPage() {
  return (
    <main className="min-h-screen text-white">
      <section className="mx-auto max-w-3xl px-5 py-12">
        <a href="/" className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white">
          <span aria-hidden>←</span> Home
        </a>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight">DMCA takedown</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          We respect rights-holders. If you believe material on this site infringes your rights, please email us with
          enough detail to identify the content and verify ownership/authorization.
        </p>

        <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
          <div className="text-sm font-semibold">Takedown email</div>
          <div className="mt-2 text-sm text-white/70">dmca@singwithpsalmy.com</div>
          <div className="mt-4 text-xs text-white/55">
            Include: your name/company, links to the material, the work claimed to be infringed, a good-faith belief
            statement, and confirmation the info is accurate.
          </div>
        </div>

        <div className="mt-6">
          <a
            href="/rights-holder"
            className="inline-block rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
          >
            Rights-holder contact →
          </a>
        </div>
      </section>
    </main>
  );
}