"use client";

import { useEffect, useState } from "react";

export default function CartIcon() {
  const [count, setCount] = useState(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const read = () => {
      const raw = localStorage.getItem("swp_cart");
      const items = raw ? (JSON.parse(raw) as any[]) : [];
      const nextCount = items.length;

      setCount((prev) => {
        if (nextCount > prev) {
          setPulse(true);
          setTimeout(() => setPulse(false), 350);
        }
        return nextCount;
      });
    };

    read();
    window.addEventListener("storage", read);
    window.addEventListener("swp_cart_changed", read as any);


    // also poll lightly to catch same-tab updates (simple + reliable)
    const t = setInterval(read, 600);

    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("swp_cart_changed", read as any);

      clearInterval(t);
    };
  }, []);

  return (
    <a
      href="/cart"
      className="relative inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
      title="Cart"
    >
      <span className={pulse ? "animate-bounce" : ""}>🛒</span>
      {count > 0 && (
        <span className="absolute -right-2 -top-2 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-black">
          {count}
        </span>
      )}
    </a>
  );
}
