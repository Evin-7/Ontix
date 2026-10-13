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
    <g fill="none" stroke="var(--ontix-mark-color, var(--primary))" strokeLinecap="round" strokeLinejoin="round">
      <path d="M34.6 13.4a15 15 0 1 0 0 21.2" strokeWidth="4" />
      <path d="M24 24h15" strokeWidth="3.5" />
      <circle cx="24" cy="24" r="3.7" fill="var(--ontix-mark-color, var(--primary))" stroke="none" />
      <circle cx="39" cy="24" r="3.7" fill="var(--ontix-mark-color, var(--primary))" stroke="none" />
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
      className={["ontix-logo", `ontix-logo--${variant}`, `ontix-logo--${size}`, `ontix-logo--${theme}`, className]
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
      <ConnectedO />
      {variant === "full" && (
        <text
          x="58"
          y="34"
          fill="var(--ontix-word-color, var(--foreground))"
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
