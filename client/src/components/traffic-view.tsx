"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { RequestTable } from "@/components/ui";
import type { RequestLog } from "@/lib/mock-data";

export function TrafficView({ rows }: { rows: RequestLog[] }) {
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
        <div className="panel-heading"><div><h2>Request history</h2><p className="panel-subtitle">{filteredRows.length} sample requests · filter results locally</p></div></div>
        <RequestTable rows={filteredRows} />
      </section>
    </>
  );
}
