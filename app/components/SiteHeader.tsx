import MemberToggle from "./MemberToggle";
import CartIcon from "./CartIcon";

export default function SiteHeader() {
  return (
    <header className="border-b border-white/10 bg-black/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <a href="/" className="flex items-center gap-3">
          <img
            src="/brand/mark.png"
            alt="SingWithPsalmy"
            className="h-9 w-9 rounded-xl ring-1 ring-white/15 shadow-[0_0_25px_rgba(167,139,250,0.20)] transition hover:shadow-[0_0_33px_rgba(244,114,182,0.25)]"
          />
          <span className="text-sm font-semibold tracking-wide text-white/90">
            Sing With Psalmy
            <div className="text-xs text-white/60">Karaoke practice tracks</div>
          </span>
        </a>

        <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
          <a className="hover:text-white" href="/browse">Browse</a>
          <a className="hover:text-white" href="/membership">Membership</a>
          <a href="/request" className="text-sm text-white/70 hover:text-white">
            Request a song
          </a>
          <a className="hover:text-white" href="/dmca">DMCA</a>
          <a className="hover:text-white" href="/rights-holder">Rights-holder</a>
        </nav>

        <div className="flex items-center gap-2">
          <MemberToggle />
          <CartIcon />
          <button className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15">
            Sign in
          </button>
        </div>
      </div>
    </header>
  );
}
