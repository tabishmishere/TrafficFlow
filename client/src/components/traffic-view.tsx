"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { RequestTable } from "@/components/ui";
import type { RequestLog } from "@/lib/api";

export function TrafficView({
  rows,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: {
  rows: RequestLog[];
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("all");
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) =>
      (method === "all" || row.method === method)
      && (!normalizedQuery || row.path.toLowerCase().includes(normalizedQuery)),
    );
  }, [method, query, rows]);

  return (
    <>
      <div className="filter-bar">
        <label className="filter-search">
          <Search size={14} aria-hidden="true" />
          <input className="form-control" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search request path" aria-label="Search request path" />
        </label>
        <label>
          <span className="sr-only">Filter by method</span>
          <select className="select-control" value={method} onChange={(event) => setMethod(event.target.value)}>
            <option value="all">All methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
        </label>
      </div>
      <section className="panel">
        <div className="panel-heading"><h2>Requests <span className="panel-subtitle">{filteredRows.length}</span></h2></div>
        <RequestTable rows={filteredRows} />
        {hasMore && onLoadMore && (
          <div className="settings-actions">
            <button className="button button-secondary" type="button" onClick={onLoadMore} disabled={loadingMore}>
              {loadingMore ? "Loading…" : "Load older requests"}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
