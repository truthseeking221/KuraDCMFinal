"use client";

import type { ButtonHTMLAttributes, CSSProperties } from "react";

type PaginationProps = {
  currentPage: number;
  itemName?: string;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

type PaginationButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

function PaginationButton({ active, className = "", ...props }: PaginationButtonProps) {
  return <button className={`pagination-button${active ? " active" : ""}${className ? ` ${className}` : ""}`} type="button" {...props} />;
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, currentPage - 1, currentPage, currentPage + 1, totalPages];
}

export function Pagination({ currentPage, itemName, pageSize, totalItems, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const pages = getVisiblePages(currentPage, totalPages);
  const itemLabel = itemName ? ` ${itemName}` : "";

  return (
    <nav className="pagination" aria-label={itemName ? `${itemName} pagination` : "Pagination"}>
      <p className="pagination-summary">
        Showing {startItem}-{endItem} of {totalItems}
        {itemLabel}
      </p>
      <div className="pagination-controls">
        <PaginationButton
          aria-label="Previous page"
          className="pagination-arrow"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <span aria-hidden="true" className="mask-icon" style={{ "--icon-size": "16px", "--mask-url": "url(/figma/icon-chevron-left.svg)" } as CSSProperties} />
        </PaginationButton>
        {pages.map((page, index) => {
          const previous = pages[index - 1];
          const showGap = previous !== undefined && page - previous > 1;

          return (
            <span className="pagination-page-group" key={page}>
              {showGap && <span className="pagination-gap">...</span>}
              <PaginationButton active={page === currentPage} aria-current={page === currentPage ? "page" : undefined} onClick={() => onPageChange(page)}>
                {page}
              </PaginationButton>
            </span>
          );
        })}
        <PaginationButton
          aria-label="Next page"
          className="pagination-arrow"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <span aria-hidden="true" className="mask-icon" style={{ "--icon-size": "16px", "--mask-url": "url(/figma/icon-chevron-right.svg)" } as CSSProperties} />
        </PaginationButton>
      </div>
    </nav>
  );
}
