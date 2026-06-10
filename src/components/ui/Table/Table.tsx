"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { ChevronUp, ChevronDown } from "@/icons";
import { Checkbox } from "../Checkbox";
import "./Table.css";

export type SortDir = "asc" | "desc";

export interface Column<Row> {
  key: string;
  header: ReactNode;
  /** Custom cell renderer. Defaults to `row[key]`. */
  render?: (row: Row) => ReactNode;
  align?: "left" | "right" | "center";
  width?: number | string;
  sortable?: boolean;
}

export interface TableProps<Row> {
  columns: Column<Row>[];
  data: Row[];
  getRowId?: (row: Row, index: number) => string;
  density?: "comfortable" | "compact";
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  sortKey?: string;
  sortDir?: SortDir;
  onSortChange?: (key: string, dir: SortDir) => void;
  loading?: boolean;
  loadingRows?: number;
  empty?: ReactNode;
  onRowClick?: (row: Row) => void;
  footer?: ReactNode;
}

export function Table<Row>({
  columns,
  data,
  getRowId = (_row, i) => String(i),
  density = "comfortable",
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  sortKey,
  sortDir,
  onSortChange,
  loading = false,
  loadingRows = 5,
  empty = "No results.",
  onRowClick,
  footer,
}: TableProps<Row>) {
  const ids = data.map(getRowId);
  const selectedSet = new Set(selectedIds);
  const allSelected = ids.length > 0 && ids.every((id) => selectedSet.has(id));
  const someSelected = ids.some((id) => selectedSet.has(id));

  const toggleAll = () =>
    onSelectionChange?.(allSelected ? [] : ids);
  const toggleRow = (id: string) =>
    onSelectionChange?.(
      selectedSet.has(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );

  const handleSort = (col: Column<Row>) => {
    if (!col.sortable || !onSortChange) return;
    const nextDir: SortDir =
      sortKey === col.key && sortDir === "asc" ? "desc" : "asc";
    onSortChange(col.key, nextDir);
  };

  const colCount = columns.length + (selectable ? 1 : 0);

  return (
    <div className="kui-table-wrap">
      <table className={cx("kui-table", `kui-table--${density}`)}>
        <thead>
          <tr>
            {selectable && (
              <th className="kui-table__select">
                <Checkbox
                  checked={allSelected}
                  indeterminate={!allSelected && someSelected}
                  onChange={toggleAll}
                  aria-label="Select all rows"
                />
              </th>
            )}
            {columns.map((col) => {
              const sorted = sortKey === col.key;
              return (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={cx(
                    col.align && `kui-th--${col.align}`,
                    col.sortable && "kui-th--sortable",
                  )}
                  onClick={() => handleSort(col)}
                  aria-sort={
                    sorted ? (sortDir === "asc" ? "ascending" : "descending") : undefined
                  }
                >
                  <span className="kui-th__inner">
                    {col.header}
                    {col.sortable && (
                      <span className="kui-th__sort">
                        {sorted && sortDir === "desc" ? <ChevronDown /> : <ChevronUp />}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: loadingRows }).map((_, r) => (
              <tr key={r}>
                {selectable && (
                  <td className="kui-table__select">
                    <span className="kui-skel" style={{ width: 18 }} />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={cx(col.align && `kui-td--${col.align}`)}>
                    <span className="kui-skel" style={{ width: `${40 + ((r + col.key.length) % 5) * 12}%` }} />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td className="kui-table__empty" colSpan={colCount}>
                {empty}
              </td>
            </tr>
          ) : (
            data.map((row, i) => {
              const id = ids[i];
              const selected = selectedSet.has(id);
              return (
                <tr
                  key={id}
                  className={cx(selected && "is-selected", onRowClick && "is-clickable")}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {selectable && (
                    <td
                      className="kui-table__select"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selected}
                        onChange={() => toggleRow(id)}
                        aria-label="Select row"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={cx(col.align && `kui-td--${col.align}`)}>
                      {col.render
                        ? col.render(row)
                        : ((row as Record<string, ReactNode>)[col.key] ?? null)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      {footer && <div className="kui-table__footer">{footer}</div>}
    </div>
  );
}
