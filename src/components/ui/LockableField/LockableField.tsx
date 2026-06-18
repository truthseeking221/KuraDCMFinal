"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import { Lock } from "@/icons";
import { Input, type InputProps } from "../Input";
import "./LockableField.css";

export type LockableFieldProps = InputProps & {
  locked?: boolean;
  lockedDescription?: string;
  lockIcon?: ReactNode;
};

export function LockableField({
  locked = false,
  lockedDescription = "Locked - auto-filled. Verify again to change.",
  trailing,
  readOnly,
  lockIcon,
  "aria-describedby": ariaDescribedBy,
  ...props
}: LockableFieldProps) {
  const descId = useId();

  if (!locked) {
    return <Input {...props} readOnly={readOnly} trailing={trailing} aria-describedby={ariaDescribedBy} />;
  }

  const describedBy = [ariaDescribedBy, descId].filter(Boolean).join(" ") || undefined;

  return (
    <>
      <Input
        {...props}
        readOnly
        aria-readonly
        aria-describedby={describedBy}
        data-locked
        trailing={
          trailing ?? (
            <span className="kui-lockable__icon" aria-hidden="true">
              {lockIcon ?? <Lock size={14} variant="stroke" />}
            </span>
          )
        }
      />
      <span id={descId} className="kui-lockable__sr">
        {lockedDescription}
      </span>
    </>
  );
}
