import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Dipakai di Server Components & Route Handlers.
// Otomatis ikut sesi login user (dari cookie).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Dipanggil dari Server Component (bukan Route Handler) -> boleh diabaikan
            // karena middleware yang akan refresh sesi.
          }
        },
      },
    }
  );
}

// Dipakai KHUSUS di server (API routes) untuk operasi yang butuh akses penuh,
// misalnya menandai order jadi "paid" dari webhook Midtrans.
// JANGAN PERNAH kirim service role key ini ke browser/client.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
