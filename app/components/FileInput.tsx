"use client";

import { useRef, useState } from "react";

export default function FileInput({
  label,
  accept,
  onChange,
  disabled = false,
}: {
  label: string;
  accept?: string;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-stone">{label}</p>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="shrink-0 rounded-full border-2 border-ink/10 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-orange hover:text-orange disabled:pointer-events-none disabled:opacity-40"
        >
          Pilih File
        </button>
        <span className="truncate text-xs text-stone">
          {fileName ?? "Belum ada file dipilih"}
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          setFileName(file?.name ?? null);
          onChange(file);
        }}
      />
    </div>
  );
}
