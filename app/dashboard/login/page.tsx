"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setError("Email belum dikonfirmasi. Konfirmasi dulu lewat Supabase Dashboard > Authentication > Users.");
      } else if (error.message.toLowerCase().includes("invalid login credentials")) {
        setError("Email atau password salah.");
      } else {
        setError(error.message);
      }
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  const inputClass =
    "rounded-xl border-2 border-ink/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-orange";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <p className="text-xs font-bold uppercase tracking-widest text-orange">Dashboard</p>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">Masuk</h1>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputClass}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        className={inputClass}
      />
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      <Button onClick={handleLogin} disabled={loading} size="lg">
        {loading ? "Memproses..." : "Masuk"}
      </Button>
      <p className="text-xs text-stone">
        Akun dibuat manual lewat Supabase Dashboard &gt; Authentication &gt; Add user.
        Belum ada fitur daftar sendiri karena ini situs pribadi, bukan multi-user.
      </p>
    </main>
  );
}
