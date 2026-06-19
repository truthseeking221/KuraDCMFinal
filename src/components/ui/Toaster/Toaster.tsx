"use client";

import type { CSSProperties } from "react";
import {
  Toaster as SonnerToaster,
  toast as sonnerToast,
  type ExternalToast,
  type ToastClassnames,
  type ToasterProps,
} from "sonner";
import { Check, Close, Info, Refresh, Warning } from "@/icons";
import { cx } from "@/lib/cx";
import "./Toaster.css";

type KuraToast = typeof sonnerToast & {
  danger: typeof sonnerToast.error;
};

const toast = Object.assign(sonnerToast, {
  danger: sonnerToast.error,
}) as KuraToast;

const defaultIcons: ToasterProps["icons"] = {
  success: <Check size={15} variant="stroke" aria-hidden="true" />,
  info: <Info size={15} variant="stroke" aria-hidden="true" />,
  warning: <Warning size={15} variant="stroke" aria-hidden="true" />,
  error: <Warning size={15} variant="stroke" aria-hidden="true" />,
  loading: (
    <Refresh
      size={15}
      variant="stroke"
      aria-hidden="true"
      className="kui-toast__spinner"
    />
  ),
  close: <Close size={13} variant="stroke" aria-hidden="true" />,
};

export function Toaster({
  className,
  icons,
  toastOptions,
  style,
  position = "bottom-right",
  visibleToasts = 3,
  expand = true,
  closeButton = true,
  duration = 3500,
  gap = 8,
  offset = {
    top: "calc(var(--space-16) + var(--space-3))",
    bottom: "calc(var(--space-16) + var(--space-4))",
    right: "var(--space-6)",
  },
  mobileOffset = {
    top: "calc(env(safe-area-inset-top, 0px) + var(--space-3))",
    right: "var(--space-3)",
    left: "var(--space-3)",
  },
  containerAriaLabel = "Notifications",
  ...props
}: ToasterProps) {
  const classNames = toastOptions?.classNames ?? {};

  return (
    <SonnerToaster
      theme="light"
      className={cx("kui-toaster", className)}
      position={position}
      visibleToasts={visibleToasts}
      expand={expand}
      closeButton={closeButton}
      duration={duration}
      gap={gap}
      offset={offset}
      mobileOffset={mobileOffset}
      containerAriaLabel={containerAriaLabel}
      icons={{
        ...defaultIcons,
        ...icons,
      }}
      toastOptions={{
        ...toastOptions,
        closeButtonAriaLabel:
          toastOptions?.closeButtonAriaLabel ?? "Dismiss notification",
        classNames: {
          ...classNames,
          toast: cx("kui-toast", classNames.toast),
          icon: cx("kui-toast__icon", classNames.icon),
          content: cx("kui-toast__content", classNames.content),
          title: cx("kui-toast__title", classNames.title),
          description: cx("kui-toast__description", classNames.description),
          actionButton: cx("kui-toast__action", classNames.actionButton),
          cancelButton: cx("kui-toast__cancel", classNames.cancelButton),
          closeButton: cx("kui-toast__close", classNames.closeButton),
          success: cx("kui-toast--success", classNames.success),
          info: cx("kui-toast--info", classNames.info),
          warning: cx("kui-toast--warning", classNames.warning),
          error: cx("kui-toast--danger", classNames.error),
          loading: cx("kui-toast--loading", classNames.loading),
          default: cx("kui-toast--default", classNames.default),
        },
      }}
      style={
        {
          "--normal-bg": "var(--color-surface)",
          "--normal-text": "var(--color-text-primary)",
          "--normal-border": "var(--color-border)",
          "--border-radius": "var(--radius-lg)",
          ...style,
        } as CSSProperties
      }
      {...props}
    />
  );
}

export function ToastProvider(props: ToasterProps) {
  return <Toaster richColors closeButton {...props} />;
}

export { toast };
export type { ExternalToast, ToastClassnames, ToasterProps };
