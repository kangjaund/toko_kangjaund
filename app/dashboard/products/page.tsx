"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import FileInput from "@/app/components/FileInput";
import { Button } from "@/app/components/Button";

type ProductRow = {
  id: string;
  slug: string;
  title: string;
  price_idr: number;
  is_active: boolean;
  cover_image_url: string | null;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function ProductsPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const { data } = await supabase
      .from("products")
      .select("id, slug, title, price_idr, is_active, cover_image_url")
      .order("sort_order");
    setProducts(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addProduct() {
    setError("");
    if (!title || !price || !productFile) {
      setError("Judul, harga, dan file produk wajib diisi.");
      return;
    }
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sesi login habis, silakan login ulang.");
      setLoading(false);
      return;
    }

    const slug = `${slugify(title)}-${Date.now().toString(36)}`;

    const filePath = `${user.id}/${slug}-${productFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from("products")
      .upload(filePath, productFile);

    if (uploadError) {
      setError(`Gagal upload file produk: ${uploadError.message}`);
      setLoading(false);
      return;
    }

    let coverUrl: string | null = null;
    if (coverFile) {
      const coverPath = `${user.id}/${slug}-cover-${coverFile.name}`;
      const { error: coverError } = await supabase.storage
        .from("covers")
        .upload(coverPath, coverFile);
      if (!coverError) {
        coverUrl = supabase.storage.from("covers").getPublicUrl(coverPath).data.publicUrl;
      }
    }

    const { error: insertError } = await supabase.from("products").insert({
      owner_id: user.id,
      slug,
      title,
      description,
      price_idr: parseInt(price, 10),
      file_path: filePath,
      cover_image_url: coverUrl,
      sort_order: products.length,
    });

    if (insertError) {
      setError(`Gagal simpan produk: ${insertError.message}`);
      setLoading(false);
      return;
    }

    setTitle("");
    setDescription("");
    setPrice("");
    setCoverFile(null);
    setProductFile(null);
    setLoading(false);
    load();
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from("products").update({ is_active: !current }).eq("id", id);
    load();
  }

  async function removeProduct(id: string) {
    await supabase.from("products").delete().eq("id", id);
    load();
  }

  const inputClass =
    "rounded-xl border-2 border-ink/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-orange";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-orange">Produk</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Kelola Produk</h1>
      </div>

      <div className="flex flex-col gap-2.5 rounded-2xl border-2 border-ink/5 bg-white p-5">
        <input
          placeholder="Judul produk"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
        <textarea
          placeholder="Deskripsi (opsional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
          rows={3}
        />
        <input
          type="number"
          placeholder="Harga (Rp)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={inputClass}
        />
        <FileInput
          label="Cover gambar (opsional, terlihat publik)"
          accept="image/*"
          onChange={setCoverFile}
        />
        <FileInput
          label="File produk asli (PDF/ZIP/dll — TIDAK terlihat publik, hanya via link setelah bayar)"
          onChange={setProductFile}
        />
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <Button onClick={addProduct} disabled={loading} className="self-start">
          {loading ? "Mengupload..." : "Tambah produk"}
        </Button>
      </div>

      <div className="flex flex-col gap-2.5">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between gap-3 rounded-2xl border-2 border-ink/5 bg-white p-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{p.title}</p>
              <p className="text-xs text-stone">
                Rp {p.price_idr.toLocaleString("id-ID")} · /produk/{p.slug}
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <button
                onClick={() => toggleActive(p.id, p.is_active)}
                className="text-xs font-medium text-stone hover:text-orange"
              >
                {p.is_active ? "Sembunyikan" : "Tampilkan"}
              </button>
              <button
                onClick={() => removeProduct(p.id)}
                className="text-xs font-medium text-red-500 hover:text-red-700"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-sm text-stone">Belum ada produk.</p>
        )}
      </div>
    </div>
  );
}
