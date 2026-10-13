"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowDownUp, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { EmptyState } from "./empty-state";
import { Select } from "./select";
import { Skeleton } from "./skeleton";

export type SortValue = string | number | bigint | boolean | Date | null | undefined;

export type DataTableColumn<T> = Readonly<{
  id: string;
  header: ReactNode;
  /** Text announced by the sort button; also useful when header contains an icon. */
  label: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => SortValue;
  className?: string;
}>;

export type DataTableProps<T> = Readonly<{
  caption: string;
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  getRowId: (row: T) => string | number;
  pageSize?: number;
  pageSizeOptions?: readonly number[];
  isLoading?: boolean;
  loadingRows?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  emptyState?: ReactNode;
  className?: string;
}>;

function compareValues(left: SortValue, right: SortValue) {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;

  const normalizedLeft = left instanceof Date ? left.getTime() : left;
  const normalizedRight = right instanceof Date ? right.getTime() : right;

  if (typeof normalizedLeft === "number" && typeof normalizedRight === "number") {
    if (Number.isNaN(normalizedLeft)) return Number.isNaN(normalizedRight) ? 0 : 1;
    if (Number.isNaN(normalizedRight)) return -1;
    return normalizedLeft - normalizedRight;
  }
  if (typeof normalizedLeft === "bigint" && typeof normalizedRight === "bigint") {
    return normalizedLeft < normalizedRight ? -1 : normalizedLeft > normalizedRight ? 1 : 0;
  }
  if (typeof normalizedLeft === "boolean" && typeof normalizedRight === "boolean") {
    return Number(normalizedLeft) - Number(normalizedRight);
  }

  return String(normalizedLeft).localeCompare(String(normalizedRight), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function safePageSize(value: number) {
  return Number.isFinite(value) ? Math.max(1, Math.min(100, Math.floor(value))) : 10;
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowId,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50],
  isLoading = false,
  loadingRows = 5,
  emptyTitle = "No records found",
  emptyDescription = "Try changing your search or filters.",
  emptyAction,
  emptyState,
  className,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ id: string; direction: "ascending" | "descending" } | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(safePageSize(initialPageSize));
  const activeSortColumn = sort && columns.find((column) => column.id === sort.id && column.sortValue);

  const sortedRows = useMemo(() => {
    if (!activeSortColumn || !sort) return [...rows];
    const direction = sort.direction === "ascending" ? 1 : -1;

    return rows
      .map((row, originalIndex) => ({ row, originalIndex }))
      .sort((left, right) => {
        const leftValue = activeSortColumn.sortValue!(left.row);
        const rightValue = activeSortColumn.sortValue!(right.row);
        const compared = compareValues(leftValue, rightValue);
        if (compared === 0) return left.originalIndex - right.originalIndex;
        if (leftValue == null || rightValue == null) return compared;
        return compared * direction;
      })
      .map(({ row }) => row);
  }, [activeSortColumn, rows, sort]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = sortedRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const firstRow = sortedRows.length === 0 ? 0 : currentPage * pageSize + 1;
  const lastRow = Math.min((currentPage + 1) * pageSize, sortedRows.length);
  const normalizedPageSizes = [...new Set(pageSizeOptions.map(safePageSize))].sort((a, b) => a - b);
  if (normalizedPageSizes.length === 0) normalizedPageSizes.push(pageSize);
  const loadingRowCount = Math.max(1, Math.min(12, Math.floor(loadingRows)));

  const toggleSort = (column: DataTableColumn<T>) => {
    if (!column.sortValue) return;
    setSort((current) => ({
      id: column.id,
      direction: current?.id === column.id && current.direction === "ascending" ? "descending" : "ascending",
    }));
    setPage(0);
  };

  return (
    <section className={["ui-data-table overflow-hidden rounded-xl border border-border bg-surface", className].filter(Boolean).join(" ")} aria-label={caption}>
      <div className="ui-data-table__scroll overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary" role="region" aria-label={`${caption} table`} tabIndex={0}>
        <table className="ui-data-table__table w-full border-collapse text-left text-sm" aria-busy={isLoading}>
          <caption className="ui-data-table__caption sr-only">{caption}</caption>
          <thead className="bg-surface-muted text-muted">
            <tr className="border-b border-border">
              {columns.map((column) => {
                const active = sort?.id === column.id;
                const ariaSort = active ? sort.direction : "none";

                return (
                  <th key={column.id} scope="col" aria-sort={column.sortValue ? ariaSort : undefined} className={["px-4 py-3 text-xs font-semibold uppercase tracking-wide", column.className].filter(Boolean).join(" ")}>
                    {column.sortValue ? (
                      <button
                        type="button"
                        className="ui-data-table__sort inline-flex min-h-8 items-center gap-2 rounded-md text-left text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label={`Sort by ${column.label} ${active && sort.direction === "ascending" ? "descending" : "ascending"}`}
                        onClick={() => toggleSort(column)}
                      >
                        <span>{column.header}</span>
                        {active ? (
                          sort.direction === "ascending"
                            ? <ArrowUp size={14} aria-hidden="true" />
                            : <ArrowDown size={14} aria-hidden="true" />
                        ) : <ArrowDownUp size={14} aria-hidden="true" />}
                      </button>
                    ) : column.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading ? Array.from({ length: loadingRowCount }, (_, rowIndex) => (
              <tr key={`skeleton-${rowIndex}`} className="border-b border-border last:border-b-0">
                {columns.map((column) => (
                  <td key={column.id} className={["px-4 py-3", column.className].filter(Boolean).join(" ")}><Skeleton className="ui-data-table__skeleton h-4 max-w-48" /></td>
                ))}
              </tr>
            )) : visibleRows.map((row) => (
              <tr key={getRowId(row)} className="border-b border-border last:border-b-0 hover:bg-surface-muted/60">
                {columns.map((column) => (
                  <td key={column.id} className={["px-4 py-3 align-middle text-sm text-foreground", column.className].filter(Boolean).join(" ")}>{column.cell(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isLoading && sortedRows.length === 0 && (
        emptyState ?? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={emptyAction}
            className="ui-data-table__empty m-4"
          />
        )
      )}

      <footer className="ui-data-table__footer flex flex-col gap-3 border-t border-border bg-surface px-4 py-3 sm:flex-row sm:items-center">
        <p className="ui-data-table__summary mr-auto text-xs text-muted" aria-live="polite">
          {sortedRows.length === 0 ? "No records" : `Showing ${firstRow}–${lastRow} of ${sortedRows.length}`}
        </p>
        <label className="ui-data-table__page-size-label flex items-center gap-2 text-xs text-muted">
          <span>Rows per page</span>
          <Select
            aria-label="Rows per page"
            value={pageSize}
            onChange={(event) => {
              setPageSize(safePageSize(Number(event.currentTarget.value)));
              setPage(0);
            }}
          >
            {normalizedPageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </Select>
        </label>
        <nav className="ui-data-table__pagination flex items-center justify-between gap-2 sm:justify-end" aria-label={`${caption} pages`}>
          <Button
            variant="outline"
            size="sm"
            aria-label="Go to previous page"
            disabled={currentPage === 0 || isLoading}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            <ChevronLeft size={16} aria-hidden="true" /> Previous
          </Button>
          <span className="ui-data-table__page-count min-w-24 text-center text-xs text-muted" aria-live="polite">Page {currentPage + 1} of {pageCount}</span>
          <Button
            variant="outline"
            size="sm"
            aria-label="Go to next page"
            disabled={currentPage >= pageCount - 1 || isLoading}
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
          >
            Next <ChevronRight size={16} aria-hidden="true" />
          </Button>
        </nav>
      </footer>
    </section>
  );
}
