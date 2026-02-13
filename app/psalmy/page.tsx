import SiteHeader from "../components/SiteHeader";
import AdminGate from "../components/AdminGate";


export default function PsalmyHomePage() {
  return (
  <AdminGate>
    <main className="min-h-screen text-white">
      <SiteHeader />

      <section className="mx-auto max-w-4xl px-5 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-white/65">
          Private management area.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <a
            href="/admin/requests"
            className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 hover:bg-white/10"
          >
            <div className="text-lg font-semibold">Song Requests</div>
            <p className="mt-2 text-sm text-white/65">
              View requests, mark fulfilled, and send notification emails.
            </p>
          </a>

          <a
  href="/admin/tracks"
  className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 hover:bg-white/10"
>
  <div className="text-lg font-semibold">Catalogue</div>
  <p className="mt-2 text-sm text-white/65">
    View your track list. Next we’ll add Create/Edit and uploads.
  </p>
</a>


         <a
  href="/admin/memberships"
  className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 hover:bg-white/10"
>
  <div className="text-lg font-semibold">Subscribers</div>
  <p className="mt-2 text-sm text-white/65">
    View membership status and handle refunds by Paystack reference.
  </p>
</a>


          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-lg font-semibold">Analytics (Coming soon)</div>
            <p className="mt-2 text-sm text-white/65">
              Track traffic sources and top downloads after deployment.
            </p>
          </div>
        </div>

        <p className="mt-10 text-xs text-white/50">
          Tip: Bookmark <span className="text-white/70">/psalmy</span> for quick access.
        </p>
      </section>
    </main>
  </AdminGate>
  );
}
