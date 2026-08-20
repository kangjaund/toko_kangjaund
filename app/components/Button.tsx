import { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition disabled:opacity-50 disabled:pointer-events-none";

const variants = {
  primary: "bg-orange text-white hover:bg-orange-dark",
  outline: "border-2 border-ink/10 text-ink hover:border-orange hover:text-orange bg-white",
  ghost: "text-stone hover:text-ink",
};

const sizes = {
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
  sm: "px-4 py-2 text-xs",
};

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
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
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; size?: Size }) {
  return (
    <a className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />
  );
}
