interface TileProps {
  children: React.ReactNode;
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "teal" | "orange" | "default";
  className?: string;
  href?: string;
}

const colorMap = {
  blue: "border-[#0078D7] bg-[#0078D7] text-white",
  green: "border-[#107C10] bg-[#107C10] text-white",
  red: "border-[#D13438] bg-[#D13438] text-white",
  yellow: "border-[#FFB900] bg-[#FFB900] text-[#1A1A1A]",
  purple: "border-[#68217A] bg-[#68217A] text-white",
  teal: "border-[#008272] bg-[#008272] text-white",
  orange: "border-[#D83B01] bg-[#D83B01] text-white",
  default: "border-[#CCCCCC] bg-white text-[#1A1A1A]",
};

export function Tile({ children, color = "default", className = "", href }: TileProps) {
  const classes = `p-4 border-2 ${colorMap[color]} transition hover:opacity-90 ${className}`;

  if (href) {
    return (
      <a href={href} className={`block ${classes}`}>
        {children}
      </a>
    );
  }

  return <div className={classes}>{children}</div>;
}
