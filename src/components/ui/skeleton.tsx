import type { HTMLAttributes } from "react";

export type SkeletonProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: "text" | "circular" | "rectangular";
};

export function Skeleton({ variant = "text", className, ...props }: SkeletonProps) {
  return (
    <span
      {...props}
      aria-hidden="true"
      className={[
        "inline-block animate-pulse bg-surface-muted motion-reduce:animate-none",
        variant === "text" && "h-4 w-full rounded-md",
        variant === "circular" && "size-10 rounded-full",
        variant === "rectangular" && "min-h-8 w-full rounded-lg",
        className,
      ].filter(Boolean).join(" ")}
    />
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={["grid min-h-32 gap-3 rounded-xl border border-border bg-surface p-4", className].filter(Boolean).join(" ")} aria-hidden="true">
      <Skeleton variant="circular" className="size-9" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4, className }: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  const safeRows = Math.max(1, Math.min(20, Math.floor(rows)));
  const safeColumns = Math.max(1, Math.min(12, Math.floor(columns)));

  return (
    <div className={["grid gap-3", className].filter(Boolean).join(" ")} aria-hidden="true">
      {Array.from({ length: safeRows }, (_, row) => (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-3 border-b border-border py-3" key={row}>
          {Array.from({ length: safeColumns }, (_, column) => (
            <Skeleton key={column} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  );
}
