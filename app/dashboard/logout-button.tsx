"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/dashboard/login");
        router.refresh();
      }}
      className="text-sm font-medium text-stone hover:text-orange"
    >
      Keluar
    </button>
  );
}
