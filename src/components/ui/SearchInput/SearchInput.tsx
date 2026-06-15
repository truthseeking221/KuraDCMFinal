import Image from "next/image";
import type { CSSProperties } from "react";

export type SearchInputProps = {
  /* Opens the global command palette — this control never filters in place. */
  onOpenSearch: () => void;
  placeholder?: string;
  className?: string;
};

/* The shared list-header search control: a button (not a text field) that hands
   off to the ⌘K palette. Patients and Bookings use the exact same element so the
   two lists read as one system. */
export function SearchInput({
  onOpenSearch,
  placeholder = "Search Name, Khmer Name, MRN, Phone...",
  className,
}: SearchInputProps) {
  return (
    <button className={`search-input${className ? ` ${className}` : ""}`} onClick={onOpenSearch} type="button">
      <span className="figma-icon" style={{ "--icon-size": "24px" } as CSSProperties}>
        <Image src="/figma/icon-search.svg" alt="" width={24} height={24} aria-hidden />
      </span>
      <span className="search-input-placeholder">{placeholder}</span>
      <span aria-hidden className="search-input-kbd">
        ⌘K
      </span>
    </button>
  );
}
