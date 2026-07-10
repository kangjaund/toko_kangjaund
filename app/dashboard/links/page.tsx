"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/app/components/Button";

type LinkRow = {
  id: string;
  title: string;
  url: string;
  is_active: boolean;
  sort_order: number;
  click_count: number;
};

export default function LinksPage() {
  const supabase = createClient();
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const { data } = await supabase.from("links").select("*").order("sort_order");
    setLinks(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addLink() {
    if (!title || !url) return;
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("links").insert({
      title,
      url,
      owner_id: user?.id,
      sort_order: links.length,
    });
    setTitle("");
    setUrl("");
    setLoading(false);
    load();
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from("links").update({ is_active: !current }).eq("id", id);
    load();
  }

  async function removeLink(id: string) {
    await supabase.from("links").delete().eq("id", id);
    load();
  }

  const inputClass =
    "rounded-xl border-2 border-ink/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-orange";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-orange">Links</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Kelola Links</h1>
      </div>

      <div className="flex flex-col gap-2.5 rounded-2xl border-2 border-ink/5 bg-white p-5">
        <input
          placeholder="Judul (mis. Threads @kang.jaund)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
        <input
          placeholder="URL (https://...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className={inputClass}
        />
        <Button onClick={addLink} disabled={loading} className="self-start">
          Tambah link
        </Button>
      </div>

      <div className="flex flex-col gap-2.5">
        {links.map((link) => (
          <div
            key={link.id}
            className="flex items-center justify-between gap-3 rounded-2xl border-2 border-ink/5 bg-white p-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{link.title}</p>
              <p className="truncate text-xs text-stone">{link.url}</p>
              <p className="text-xs text-stone">{link.click_count} klik</p>
            </div>
            <div className="flex shrink-0 gap-3">
              <button
                onClick={() => toggleActive(link.id, link.is_active)}
                className="text-xs font-medium text-stone hover:text-orange"
              >
                {link.is_active ? "Sembunyikan" : "Tampilkan"}
              </button>
              <button
                onClick={() => removeLink(link.id)}
                className="text-xs font-medium text-red-500 hover:text-red-700"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
        {links.length === 0 && (
          <p className="text-sm text-stone">Belum ada link. Tambahkan di atas.</p>
        )}
      </div>
    </div>
  );
}
