"use client";

import { useEffect } from "react";

export default function AutoDownload({ href }: { href: string }) {
  useEffect(() => {
    // Start download automatically after render
    const a = document.createElement("a");
    a.href = href;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [href]);

  return null;
}
