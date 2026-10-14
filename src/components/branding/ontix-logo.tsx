export type OntixLogoProps = Readonly<{
  variant?: "full" | "icon";
  size?: "small" | "medium" | "large";
  theme?: "auto" | "light" | "dark";
  ariaLabel?: string;
  decorative?: boolean;
  className?: string;
}>;

const sizes = {
  full: { small: [120, 32], medium: [150, 40], large: [184, 48] },
  icon: { small: [24, 24], medium: [32, 32], large: [48, 48] },
} as const;

function ConnectedO() {
  return (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M34.6 13.4a15 15 0 1 0 0 21.2" strokeWidth="4" />
      <path d="M24 24h15" strokeWidth="3.5" />
      <circle cx="24" cy="24" r="3.7" fill="currentColor" stroke="none" />
      <circle cx="39" cy="24" r="3.7" fill="currentColor" stroke="none" />
    </g>
  );
}

export function OntixLogo({
  variant = "full",
  size = "medium",
  theme = "auto",
  ariaLabel,
  decorative = false,
  className,
}: OntixLogoProps) {
  const [width, height] = sizes[variant][size];
  const accessibleLabel = ariaLabel ?? (variant === "icon" ? "Ontix symbol" : "Ontix");

  return (
    <svg
      className={["block h-auto max-w-full shrink-0", className]
        .filter(Boolean)
        .join(" ")}
      width={width}
      height={height}
      viewBox={variant === "icon" ? "0 0 48 48" : "0 0 184 48"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : accessibleLabel}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
    >
      <g className={theme === "light" ? "text-[#4f46e5]" : theme === "dark" ? "text-[#818cf8]" : "text-primary"}>
        <ConnectedO />
      </g>
      {variant === "full" && (
        <text
          x="58"
          y="34"
          className={theme === "light" ? "text-[#0f172a]" : theme === "dark" ? "text-[#f8fafc]" : "text-foreground"}
          fill="currentColor"
          fontFamily="var(--font-inter), sans-serif"
          fontSize="31"
          fontWeight="700"
          letterSpacing="2.1"
        >
          ONTIX
        </text>
      )}
    </svg>
  );
}
