"use client";

import { useTheme } from "next-themes";
import { CheckCircle2, CircleAlert, Info, LoaderCircle, X } from "lucide-react";
import { Toaster } from "sonner";

/** Mount once inside ThemeProvider in the root layout. */
export function ToastProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { theme } = useTheme();

  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        theme={theme === "light" || theme === "dark" ? theme : "system"}
        closeButton
        expand={false}
        visibleToasts={4}
        gap={10}
        offset={{ right: 16, bottom: 16 }}
        mobileOffset={{ right: 12, bottom: 12 }}
        icons={{
          success: <CheckCircle2 size={18} aria-hidden="true" />,
          error: <CircleAlert size={18} aria-hidden="true" />,
          warning: <CircleAlert size={18} aria-hidden="true" />,
          info: <Info size={18} aria-hidden="true" />,
          loading: <LoaderCircle size={18} aria-hidden="true" />,
          close: <X size={14} aria-hidden="true" />,
        }}
        toastOptions={{
          closeButton: true,
          closeButtonAriaLabel: "Dismiss notification",
          duration: 5_000,
          classNames: {
            toast: "ui-toast !rounded-[10px] !border !border-border !bg-surface !text-foreground !shadow-lg",
            title: "ui-toast__title !text-foreground",
            description: "ui-toast__description !text-muted",
            actionButton: "ui-toast__action !bg-primary !text-white",
            cancelButton: "ui-toast__cancel !bg-surface-muted !text-foreground",
            closeButton: "ui-toast__close !border-border !bg-surface !text-muted hover:!bg-surface-muted",
            success: "ui-toast--success !border-l-4 !border-l-success",
            error: "ui-toast--error !border-l-4 !border-l-error",
            warning: "ui-toast--warning !border-l-4 !border-l-warning",
            info: "ui-toast--info !border-l-4 !border-l-info",
            loading: "ui-toast--loading !border-l-4 !border-l-primary",
          },
        }}
      />
    </>
  );
}
