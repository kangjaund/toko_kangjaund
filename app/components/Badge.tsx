export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-3 py-0.5 text-xs font-bold uppercase tracking-wider border-2 border-current text-[#666666]">
      {children}
    </span>
  );
}
