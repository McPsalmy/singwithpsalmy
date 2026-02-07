import SiteHeader from "../components/SiteHeader";
export default function DmcaPage() {
  return (
    <main className="min-h-screen text-white">


      <SiteHeader />
      
      <section className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">DMCA Takedown</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          We respect rights-holders. If you believe material on this site infringes your rights,
          please send a takedown request with enough detail to identify the content, proof of
          ownership/authorization, and your contact information. We will review and act promptly.
        </p>

        <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
          <div className="text-sm font-semibold">Takedown email</div>
          <div className="mt-2 text-sm text-white/70">dmca@singwithpsalmy.com</div>
          <div className="mt-4 text-xs text-white/55">
            Please include: your name/company, links to the material, the work claimed to be infringed,
            a statement of good-faith belief, and a statement that the information is accurate.
          </div>
        </div>
      </section>
    </main>
  );
}
