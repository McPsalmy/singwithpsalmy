"use client";

import { useEffect, useState } from "react";

export default function MemberToggle() {
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("swp_member") === "1";
    setIsMember(saved);
  }, []);

  function toggle() {
    const next = !isMember;
    setIsMember(next);
    localStorage.setItem("swp_member", next ? "1" : "0");
    document.cookie = `swp_member=${next ? "1" : "0"}; path=/; max-age=31536000`;
    window.location.reload();
  }

  return (
    <button
      onClick={toggle}
      className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
      title="Testing toggle (will be replaced by real login/subscription later)"
    >
      {isMember ? "Member: ON" : "Member: OFF"}
    </button>
  );
}
