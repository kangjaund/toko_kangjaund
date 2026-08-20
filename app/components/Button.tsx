import { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

const base = "inline-flex items-center justify-center gap-1.5 font-bold uppercase tracking-wide transition disabled:opacity-50 disabled:pointer-events-none";

const variants = {
  primary: "bg-[#0078D7] border-2 border-[#0078D7] text-white hover:bg-[#0063B3] hover:border-[#0063B3]",
  outline: "border-2 border-[#1A1A1A] text-[#1A1A1A] bg-transparent hover:bg-[#1A1A1A] hover:text-white",
  ghost: "text-[#666666] hover:text-[#1A1A1A] border-2 border-transparent hover:border-[#1A1A1A]",
};

const sizes = {
  md: "px-6 py-2.5 text-sm",
  lg: "px-8 py-3.5 text-base",
  sm: "px-4 py-2 text-xs",
};

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <a
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
