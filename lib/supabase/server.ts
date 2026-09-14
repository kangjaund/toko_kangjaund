import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Dipakai di halaman publik (Home, Detail Produk).
// TANPA membaca cookies, sehingga halaman bisa di-cache penuh oleh Edge CDN (ISR/SSG).
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

// Dipakai di Server Components & Route Handlers yang butuh sesi login.
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
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
