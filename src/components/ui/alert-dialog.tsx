"use client";

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import type { ComponentProps } from "react";

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export function AlertDialogCancel({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      {...props}
      className={[
        "inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className,
      ].filter(Boolean).join(" ")}
    />
  );
}

export function AlertDialogAction({
  className,
  variant = "destructive",
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Action> & { variant?: "primary" | "destructive" }) {
  const variantClasses = variant === "destructive"
    ? "bg-error text-white hover:bg-error/90 dark:text-[#0b1220]"
    : "bg-primary text-white hover:bg-primary-hover dark:text-[#0b1220]";

  return (
    <AlertDialogPrimitive.Action
      {...props}
      className={[
        "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        variantClasses,
        className,
      ].filter(Boolean).join(" ")}
    />
  );
}

export function AlertDialogContent({
  className,
  size = "sm",
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Content> & { size?: "sm" | "md" }) {
  const sizeClass = size === "md" ? "max-w-[560px]" : "max-w-[400px]";

  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[2px] data-[state=open]:animate-ui-fade-in" />
      <AlertDialogPrimitive.Content
        {...props}
        className={[
          "fixed left-1/2 top-1/2 z-50 max-h-[min(90dvh,48rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[14px] border border-border bg-surface p-6 text-foreground shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary data-[state=open]:animate-ui-dialog-in",
          sizeClass,
          className,
        ].filter(Boolean).join(" ")}
        data-size={size}
      />
    </AlertDialogPrimitive.Portal>
  );
}

export function AlertDialogHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div {...props} className={["mb-5 flex flex-col gap-1.5", className].filter(Boolean).join(" ")} />
  );
}

export function AlertDialogTitle(props: ComponentProps<typeof AlertDialogPrimitive.Title>) {
  const { className, ...rest } = props;
  return (
    <AlertDialogPrimitive.Title
      {...rest}
      className={["text-lg font-semibold tracking-tight text-foreground", className].filter(Boolean).join(" ")}
    />
  );
}

export function AlertDialogDescription(props: ComponentProps<typeof AlertDialogPrimitive.Description>) {
  const { className, ...rest } = props;
  return (
    <AlertDialogPrimitive.Description
      {...rest}
      className={["text-sm leading-6 text-muted", className].filter(Boolean).join(" ")}
    />
  );
}

export function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div {...props} className={["mt-6 flex flex-col justify-end gap-2 border-t border-border pt-4 sm:flex-row", className].filter(Boolean).join(" ")} />
  );
}
