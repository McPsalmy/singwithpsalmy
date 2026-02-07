"use client";

export default function BackButton() {
  return (
    <button
      type="button"
      onClick={() => window.history.back()}
      className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/70 ring-1 ring-white/10 hover:bg-white/10"
    >
      <span className="text-white/60">←</span>
      <span>Back</span>
    </button>
  );
}
