export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-peach px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-orange-dark">
      {children}
    </span>
  );
}
