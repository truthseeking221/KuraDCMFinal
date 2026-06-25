"use client";

import { cx } from "@/lib/cx";
import { Sparkles, X } from "@/icons";
import "./SmartSuggestionRow.css";

export type SmartSuggestionTone = "neutral" | "ai";

export interface SmartSuggestionRowProps {
  /** The nudge text, e.g. "Looks like your usual diabetes follow-up set". */
  title: string;
  /** Text-button label, e.g. "Save as Quick Set". */
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
  /** Optional "never suggest this again" affordance. */
  onNever?: () => void;
  /** `ai` uses the AI purple surface — reserve for genuine AI suggestions. */
  tone?: SmartSuggestionTone;
  className?: string;
}

export function SmartSuggestionRow({
  title,
  actionLabel,
  onAction,
  onDismiss,
  onNever,
  tone = "neutral",
  className,
}: SmartSuggestionRowProps) {
  return (
    <div
      className={cx("kui-ssr", tone === "ai" && "kui-ssr--ai", className)}
      role="note"
    >
      <span className="kui-ssr__glyph" aria-hidden="true">
        <Sparkles size={14} />
      </span>
      <span className="kui-ssr__title">{title}</span>
      <button
        type="button"
        className="kui-ssr__dismiss"
        aria-label="Dismiss suggestion"
        onClick={onDismiss}
      >
        <X size={14} />
      </button>
      <span className="kui-ssr__actions">
        <button type="button" className="kui-ssr__action" onClick={onAction}>
          {actionLabel}
        </button>
        {onNever && (
          <button
            type="button"
            className="kui-ssr__never"
            aria-label="Do not suggest this set again"
            onClick={onNever}
          >
            {"Don't suggest"}
          </button>
        )}
      </span>
    </div>
  );
}
