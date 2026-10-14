"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export function DialogOverlay(props: ComponentProps<typeof DialogPrimitive.Overlay>) {
  const { className, ...rest } = props;
  return (
    <DialogPrimitive.Overlay
      {...rest}
      className={[
        "ui-dialog__overlay fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[2px]",
        className,
      ].filter(Boolean).join(" ")}
    />
  );
}

type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  size?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
  centered?: boolean;
};

export function DialogContent({
  className,
  size = "md",
  showCloseButton = true,
  centered = true,
  children,
  ...props
}: DialogContentProps) {
  const sizeClass = {
    sm: "max-w-[400px]",
    md: "max-w-[560px]",
    lg: "max-w-[760px]",
    xl: "max-w-[960px]",
  }[size];

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        {...props}
        className={[
          "ui-dialog__content fixed z-50 max-h-[min(90dvh,48rem)] w-[calc(100vw-2rem)] overflow-y-auto rounded-[14px] border border-border bg-surface p-6 text-foreground shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-7",
          centered ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" : "",
          sizeClass,
          className,
        ].filter(Boolean).join(" ")}
        data-size={size}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close className="ui-dialog__close absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Close dialog">
            <X size={18} aria-hidden="true" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={["ui-dialog__header mb-5 flex flex-col gap-1.5 pr-10", className].filter(Boolean).join(" ")} />;
}

export function DialogTitle(props: ComponentProps<typeof DialogPrimitive.Title>) {
  const { className, ...rest } = props;
  return (
    <DialogPrimitive.Title
      {...rest}
      className={["ui-dialog__title text-lg font-semibold tracking-tight text-foreground", className].filter(Boolean).join(" ")}
    />
  );
}

export function DialogDescription(props: ComponentProps<typeof DialogPrimitive.Description>) {
  const { className, ...rest } = props;
  return (
    <DialogPrimitive.Description
      {...rest}
      className={["ui-dialog__description text-sm leading-6 text-muted", className].filter(Boolean).join(" ")}
    />
  );
}

export function DialogBody({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={["ui-dialog__body", className].filter(Boolean).join(" ")} />;
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={["ui-dialog__footer mt-6 flex flex-col justify-end gap-2 border-t border-border pt-4 sm:flex-row", className].filter(Boolean).join(" ")} />;
}
