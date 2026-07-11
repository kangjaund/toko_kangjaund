"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// CATATAN: ini cuma pengganjal buat pengunjung awam, bukan proteksi keamanan asli.
// Siapapun yang ngerti browser tetap bisa akses DevTools dengan cara lain
// (mis. lewat menu browser, atau matiin JS dulu). Jangan taruh data sensitif
// yang mengandalkan proteksi ini sebagai satu-satunya lapisan keamanan.
// Sengaja di-skip di /dashboard supaya kamu (owner) tetap bisa debug sendiri.
export default function BasicProtection() {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard");

  useEffect(() => {
    if (isDashboard) return;

    function blockContextMenu(e: MouseEvent) {
      e.preventDefault();
    }
    function blockDevtoolsKeys(e: KeyboardEvent) {
      const key = e.key;
      const blocked =
        key === "F12" ||
        (e.ctrlKey && e.shiftKey && (key === "I" || key === "J" || key === "C")) ||
        (e.ctrlKey && key === "U");
      if (blocked) e.preventDefault();
    }

    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockDevtoolsKeys);
    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockDevtoolsKeys);
    };
  }, [isDashboard]);

  return null;
}
