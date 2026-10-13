"use client";

import type { ReactNode } from "react";
import { toast, type Action } from "sonner";

export type Notification = Readonly<{
  title: string;
  description?: string;
  /** Use a stable ID when the same operation can be submitted repeatedly. */
  id?: string | number;
  duration?: number;
  action?: Action | ReactNode;
  cancel?: Action | ReactNode;
}>;

export type PromiseNotification<T> = Readonly<{
  loading: Notification;
  success: Notification | ((value: T) => Notification);
  error: Notification | ((reason: unknown) => Notification);
}>;

const durations = {
  success: 4_000,
  info: 5_000,
  warning: 6_000,
  error: 7_500,
} as const;

function stableId(kind: string, notice: Notification) {
  return notice.id ?? `ontix:${kind}:${notice.title}:${notice.description ?? ""}`;
}

function optionsFor(kind: keyof typeof durations, notice: Notification) {
  return {
    id: stableId(kind, notice),
    description: notice.description,
    duration: notice.duration ?? durations[kind],
    action: notice.action,
    cancel: notice.cancel,
    closeButton: true,
  };
}

function emit(kind: keyof typeof durations, notice: Notification) {
  const options = optionsFor(kind, notice);
  switch (kind) {
    case "success":
      return toast.success(notice.title, options);
    case "info":
      return toast.info(notice.title, options);
    case "warning":
      return toast.warning(notice.title, options);
    case "error":
      return toast.error(notice.title, options);
  }
}

export const notify = {
  success: (notice: Notification) => emit("success", notice),
  info: (notice: Notification) => emit("info", notice),
  warning: (notice: Notification) => emit("warning", notice),
  error: (notice: Notification) => emit("error", notice),
  loading: (notice: Notification) =>
    toast.loading(notice.title, {
      id: stableId("loading", notice),
      description: notice.description,
      duration: Number.POSITIVE_INFINITY,
      action: notice.action,
      cancel: notice.cancel,
      closeButton: true,
    }),
  promise: async <T,>(operation: Promise<T> | (() => Promise<T>), notices: PromiseNotification<T>) => {
    const loadingId = stableId("loading", notices.loading);
    toast.loading(notices.loading.title, {
      id: loadingId,
      description: notices.loading.description,
      duration: Number.POSITIVE_INFINITY,
      action: notices.loading.action,
      cancel: notices.loading.cancel,
      closeButton: true,
    });

    try {
      const value = await (typeof operation === "function" ? operation() : operation);
      const result = typeof notices.success === "function" ? notices.success(value) : notices.success;
      toast.success(result.title, {
        ...optionsFor("success", result),
        id: notices.loading.id ?? loadingId,
      });
      return value;
    } catch (reason) {
      const result = typeof notices.error === "function" ? notices.error(reason) : notices.error;
      toast.error(result.title, {
        ...optionsFor("error", result),
        id: notices.loading.id ?? loadingId,
      });
      throw reason;
    }
  },
  dismiss: (id?: string | number) => toast.dismiss(id),
};
