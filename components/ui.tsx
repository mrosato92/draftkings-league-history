"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Database,
  Info,
} from "lucide-react";
export function Panel({
  title,
  eyebrow,
  aside,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-header">
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h2>{title}</h2>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
export function EmptyState({
  title = "The receipts are on their way.",
  text = "Official league results haven’t been imported yet. No made-up stats. No revisionist history.",
  compact = false,
}: {
  title?: string;
  text?: string;
  compact?: boolean;
}) {
  return (
    <div className={`empty-state ${compact ? "compact" : ""}`}>
      <div className="empty-icon">
        <Database size={21} strokeWidth={1.5} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      <span className="empty-label">
        <span /> Awaiting verified data
      </span>
    </div>
  );
}
export function Metric({
  label,
  value,
  note,
  icon,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  note: string;
  icon?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`metric ${accent ? "accent" : ""}`}>
      <div className="metric-label">
        {label}
        {icon}
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-note">{note}</div>
    </div>
  );
}
export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="info-note">
      <Info size={15} />
      <span>{children}</span>
    </div>
  );
}
export function SectionLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="text-link" href={href}>
      {children}
      <ArrowUpRight size={14} />
    </Link>
  );
}
export function fmt(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined
    ? "—"
    : value.toLocaleString("en-US", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      });
}
export function pct(value: number | null | undefined): string {
  return value === null || value === undefined
    ? "—"
    : `${(value * 100).toFixed(1)}%`;
}
export type Column<T> = {
  key: string;
  label: string;
  value: (row: T) => number | string | null;
  render?: (row: T, index: number) => ReactNode;
  numeric?: boolean;
  description?: string;
};
export function DataTable<T>({
  rows,
  columns,
  initialSort,
  rowKey,
  emptyText,
  emptyDescription,
  pageSize,
}: {
  rows: T[];
  columns: Column<T>[];
  initialSort?: string;
  rowKey: (row: T) => string;
  emptyText?: string;
  emptyDescription?: string;
  pageSize?: number;
}) {
  const [sort, setSort] = useState({ key: initialSort ?? "", desc: true });
  const [page, setPage] = useState(0);
  const col = columns.find((c) => c.key === sort.key);
  const sorted = col
    ? [...rows].sort((a, b) => {
        const av = col.value(a),
          bv = col.value(b);
        if (av === null) return bv === null ? 0 : 1;
        if (bv === null) return -1;
        return (
          (typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv))) * (sort.desc ? -1 : 1)
        );
      })
    : rows;
  const activePage = pageSize
    ? Math.min(page, Math.max(0, Math.ceil(sorted.length / pageSize) - 1))
    : 0;
  const visible = pageSize
    ? sorted.slice(activePage * pageSize, (activePage + 1) * pageSize)
    : sorted;
  return (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={c.numeric ? "numeric" : ""}
                  aria-sort={
                    sort.key === c.key
                      ? sort.desc
                        ? "descending"
                        : "ascending"
                      : "none"
                  }
                >
                  <button
                    title={c.description}
                    onClick={() => {
                      setPage(0);
                      setSort({
                        key: c.key,
                        desc: sort.key === c.key ? !sort.desc : !!c.numeric,
                      });
                    }}
                  >
                    {c.label}
                    {sort.key === c.key ? (
                      sort.desc ? (
                        <ArrowDown size={11} />
                      ) : (
                        <ArrowUp size={11} />
                      )
                    ) : (
                      <ArrowUpDown size={11} />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => (
                  <td key={c.key} className={c.numeric ? "numeric" : ""}>
                    {c.render
                      ? c.render(row, i + activePage * (pageSize ?? 0))
                      : (c.value(row) ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <EmptyState
            compact
            title={emptyText ?? "The leaderboard is an open field."}
            text={
              emptyDescription ??
              "Rankings appear here once official regular-season results are imported."
            }
          />
        )}
      </div>
      {pageSize && sorted.length > pageSize && (
        <div className="panel-bottom">
          <span>
            Showing {activePage * pageSize + 1}–
            {Math.min(sorted.length, (activePage + 1) * pageSize)} of{" "}
            {sorted.length}
          </span>
          <div className="pagination">
            <button
              disabled={activePage === 0}
              onClick={() => setPage(activePage - 1)}
            >
              Previous page
            </button>
            <span>
              {activePage + 1} / {Math.ceil(sorted.length / pageSize)}
            </span>
            <button
              disabled={(activePage + 1) * pageSize >= sorted.length}
              onClick={() => setPage(activePage + 1)}
            >
              Next page
            </button>
          </div>
        </div>
      )}
    </>
  );
}
export function ManagerName({ username }: { username: string }) {
  return (
    <Link
      className="manager-name"
      href={`/managers/${encodeURIComponent(username)}`}
    >
      <span className="avatar">{username.slice(0, 2).toUpperCase()}</span>
      {username}
    </Link>
  );
}

export function AverageToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle-label">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle" />
      <span>
        Exclude missed weeks <span className="muted">(averages)</span>
      </span>
    </label>
  );
}
