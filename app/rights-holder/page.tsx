import SiteHeader from "../components/SiteHeader";
export default function RightsHolderPage() {
  return (
    <main className="min-h-screen text-white">


      <SiteHeader />

      <section className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">
          Rights-holder Contact
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          If you are a rights-holder (or an authorized representative) and would like to
          request removals, discuss licensing, or provide guidance, please reach us directly.
        </p>

        <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
          <div className="text-sm font-semibold">Email</div>
          <div className="mt-2 text-sm text-white/70">rights@singwithpsalmy.com</div>

          <div className="mt-6 text-xs text-white/55">
            Helpful details to include: the track title(s), links to the page(s),
            proof of ownership/authorization, and your preferred resolution.
          </div>
        </div>
      </section>
    </main>
  );
}
