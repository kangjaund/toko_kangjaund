"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import FileInput from "@/app/components/FileInput";
import { Button } from "@/app/components/Button";

export default function SettingsPage() {
  const supabase = createClient();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profile").select("*").limit(1).single();
      if (data) {
        setProfileId(data.id);
        setDisplayName(data.display_name ?? "");
        setBio(data.bio ?? "");
        setWhatsapp(data.whatsapp_number ?? "");
        setQrisUrl(data.qris_image_url ?? null);
        setAvatarUrl(data.avatar_url ?? null);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);

    let newQrisUrl = qrisUrl;
    if (qrisFile) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const path = `${user?.id}/qris-${Date.now()}-${qrisFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("covers")
        .upload(path, qrisFile);
      if (!uploadError) {
        newQrisUrl = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
      }
    }

    let newAvatarUrl = avatarUrl;
    if (avatarFile) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const path = `${user?.id}/avatar-${Date.now()}-${avatarFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("covers")
        .upload(path, avatarFile);
      if (!uploadError) {
        newAvatarUrl = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
      }
    }

    if (profileId) {
      await supabase
        .from("profile")
        .update({
          display_name: displayName,
          bio,
          whatsapp_number: whatsapp,
          qris_image_url: newQrisUrl,
          avatar_url: newAvatarUrl,
        })
        .eq("id", profileId);
    }

    setQrisUrl(newQrisUrl);
    setQrisFile(null);
    setAvatarUrl(newAvatarUrl);
    setAvatarFile(null);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const inputClass =
    "mt-1 block w-full rounded-xl border-2 border-ink/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-orange";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-orange">Pengaturan</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Toko Kamu</h1>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border-2 border-ink/5 bg-white p-5">
        <label className="text-xs font-medium text-stone">
          Nama tampilan
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="text-xs font-medium text-stone">
          Bio
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </label>
        <label className="text-xs font-medium text-stone">
          Nomor WhatsApp (format 62xxxxxxxxxx, buat tombol chat di halaman checkout)
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="6281234567890"
            className={inputClass}
          />
        </label>
        <FileInput
          label="Foto/gambar profil (muncul di halaman utama, mis. sticker/logo kamu)"
          accept="image/*"
          onChange={setAvatarFile}
        />
        {avatarUrl && !avatarFile && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="Foto profil saat ini"
            className="h-32 w-32 rounded-xl border-2 border-ink/10 object-contain"
          />
        )}
        <FileInput
          label="Gambar QRIS statis (ditampilkan di setiap halaman checkout produk)"
          accept="image/*"
          onChange={setQrisFile}
        />
        {qrisUrl && !qrisFile && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrisUrl}
            alt="QRIS saat ini"
            className="h-40 w-40 rounded-xl border-2 border-ink/10 object-cover"
          />
        )}
        <Button onClick={save} disabled={saving} className="self-start">
          {saving ? "Menyimpan..." : saved ? "Tersimpan!" : "Simpan"}
        </Button>
      </div>
    </div>
  );
}
