"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import FileInput from "@/app/components/FileInput";
import { Button } from "@/app/components/Button";

type ProductRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price_idr: number;
  stock_qty: number | null;
  is_active: boolean;
  cover_image_url: string | null;
  sort_order: number;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

const inputClass =
  "rounded-xl border-2 border-ink/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-orange";

export default function ProductsPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [formKey, setFormKey] = useState(0); // buat reset tampilan FileInput

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("products")
      .select("id, slug, title, description, price_idr, stock_qty, is_active, cover_image_url, sort_order")
      .order("sort_order");
    setProducts(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addProduct() {
    setError("");
    setSuccess(false);
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
      stock_qty: stock ? parseInt(stock, 10) : null,
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
    setStock("");
    setCoverFile(null);
    setProductFile(null);
    setFormKey((k) => k + 1); // remount FileInput biar nama file kepilih sebelumnya ke-reset
    setLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
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

  function startEdit(p: ProductRow) {
    setEditingId(p.id);
    setEditTitle(p.title);
    setEditDescription(p.description ?? "");
    setEditPrice(String(p.price_idr));
    setEditStock(p.stock_qty !== null ? String(p.stock_qty) : "");
  }

  async function saveEdit(id: string) {
    setSavingEdit(true);
    await supabase
      .from("products")
      .update({
        title: editTitle,
        description: editDescription,
        price_idr: parseInt(editPrice, 10) || 0,
        stock_qty: editStock ? parseInt(editStock, 10) : null,
      })
      .eq("id", id);
    setSavingEdit(false);
    setEditingId(null);
    load();
  }

  async function moveProduct(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= products.length) return;

    const current = products[index];
    const target = products[targetIndex];

    await Promise.all([
      supabase.from("products").update({ sort_order: target.sort_order }).eq("id", current.id),
      supabase.from("products").update({ sort_order: current.sort_order }).eq("id", target.id),
    ]);
    load();
  }

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
        <div className="grid grid-cols-2 gap-2.5">
          <input
            type="number"
            placeholder="Harga (Rp)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
          />
          <input
            type="number"
            placeholder="Stok (kosongkan = tak terbatas)"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className={inputClass}
          />
        </div>
        <FileInput
          key={`cover-${formKey}`}
          label="Cover gambar (opsional, terlihat publik)"
          accept="image/*"
          onChange={setCoverFile}
        />
        <FileInput
          key={`file-${formKey}`}
          label="File produk asli (PDF/ZIP/dll — TIDAK terlihat publik, hanya via link setelah bayar)"
          onChange={setProductFile}
        />
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        {success && (
          <p className="text-sm font-medium text-green-700">Produk berhasil ditambahkan ✓</p>
        )}
        <Button onClick={addProduct} disabled={loading} className="self-start">
          {loading ? "Mengupload..." : "Tambah produk"}
        </Button>
      </div>

      <div className="flex flex-col gap-2.5">
        {products.map((p, index) => (
          <div key={p.id} className="rounded-2xl border-2 border-ink/5 bg-white p-4">
            {editingId === p.id ? (
              <div className="flex flex-col gap-2.5">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={inputClass}
                  placeholder="Judul produk"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className={inputClass}
                  rows={2}
                  placeholder="Deskripsi"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className={inputClass}
                    placeholder="Harga (Rp)"
                  />
                  <input
                    type="number"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className={inputClass}
                    placeholder="Stok (kosong = tak terbatas)"
                  />
                </div>
                <p className="text-xs text-stone">
                  Ganti file cover/produk belum bisa lewat mode edit — hapus & tambah ulang
                  kalau perlu ganti file.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveEdit(p.id)} disabled={savingEdit}>
                    {savingEdit ? "Menyimpan..." : "Simpan"}
                  </Button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-full border-2 border-ink/10 px-3.5 py-1.5 text-xs font-semibold text-stone hover:border-ink/30"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <button
                      onClick={() => moveProduct(index, -1)}
                      disabled={index === 0}
                      className="text-stone hover:text-orange disabled:opacity-20"
                      title="Naikkan urutan"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveProduct(index, 1)}
                      disabled={index === products.length - 1}
                      className="text-stone hover:text-orange disabled:opacity-20"
                      title="Turunkan urutan"
                    >
                      ▼
                    </button>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{p.title}</p>
                    <p className="text-xs text-stone">
                      Rp {p.price_idr.toLocaleString("id-ID")} · /produk/{p.slug}
                      {p.stock_qty !== null ? ` · stok ${p.stock_qty}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-3">
                  <button
                    onClick={() => startEdit(p)}
                    className="text-xs font-medium text-stone hover:text-orange"
                  >
                    Edit
                  </button>
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
            )}
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-sm text-stone">Belum ada produk.</p>
        )}
      </div>
    </div>
  );
}
