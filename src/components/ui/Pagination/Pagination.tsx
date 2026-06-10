"use client";

import { cx } from "@/lib/cx";
import { ChevronLeft, ChevronRight } from "@/icons";
import "./Pagination.css";

export interface PaginationProps {
  /** Current page, 1-based. */
  page: number;
  /** Total page count. If omitted, derived from total / pageSize. */
  pageCount?: number;
  /** Total item count — drives the range summary and pageCount. */
  total?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  /** Noun for the summary, e.g. "patients". Default "results". */
  itemName?: string;
  /** Pages shown on each side of the current page. Default 1. */
  siblingCount?: number;
  showSummary?: boolean;
  className?: string;
}

const range = (start: number, end: number): number[] =>
  Array.from({ length: Math.max(end - start + 1, 0) }, (_, i) => start + i);

type PageItem = number | "ellipsis";

function paginationRange(
  current: number,
  total: number,
  sibling: number,
): PageItem[] {
  const totalNumbers = sibling * 2 + 5; // first + last + current + 2*sibling + 2 dots
  if (total <= totalNumbers) return range(1, total);

  const left = Math.max(current - sibling, 1);
  const right = Math.min(current + sibling, total);
  const showLeftDots = left > 2;
  const showRightDots = right < total - 1;

  if (!showLeftDots && showRightDots) {
    return [...range(1, 3 + 2 * sibling), "ellipsis", total];
  }
  if (showLeftDots && !showRightDots) {
    return [1, "ellipsis", ...range(total - (2 + 2 * sibling), total)];
  }
  return [1, "ellipsis", ...range(left, right), "ellipsis", total];
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  itemName = "results",
  siblingCount = 1,
  showSummary = true,
  className,
}: PaginationProps) {
  const count =
    pageCount ??
    (total != null && pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1);

  const items = paginationRange(page, count, siblingCount);

  const hasSummary =
    showSummary && total != null && pageSize != null && pageSize > 0;
  const start = (page - 1) * (pageSize ?? 0) + 1;
  const end = Math.min(page * (pageSize ?? 0), total ?? 0);

  const go = (p: number) => {
    const next = Math.min(Math.max(p, 1), count);
    if (next !== page) onPageChange(next);
  };

  return (
    <div className={cx("kui-pagination", className)}>
      {hasSummary && (
        <p className="kui-pagination__summary">
          Showing {start}–{end} of {total} {itemName}
        </p>
      )}
      <div className="kui-pagination__spacer" />
      <div className="kui-pagination__pages">
        <button
          type="button"
          className="kui-pagination__btn"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} variant="stroke" />
          Prev
        </button>
        {items.map((item, i) =>
          item === "ellipsis" ? (
            <span key={`e${i}`} className="kui-pagination__ellipsis" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={cx("kui-pagination__btn", item === page && "is-current")}
              onClick={() => go(item)}
              aria-current={item === page ? "page" : undefined}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          className="kui-pagination__btn"
          disabled={page >= count}
          onClick={() => go(page + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight size={16} variant="stroke" />
        </button>
      </div>
    </div>
  );
}
