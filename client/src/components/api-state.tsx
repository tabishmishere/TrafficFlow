import Link from "next/link";

export function ApiState({
  message,
  loading = false,
  showApiHint = true,
}: {
  message: string;
  loading?: boolean;
  showApiHint?: boolean;
}) {
  return (
    <div className="panel empty-state" role={loading ? "status" : "alert"}>
      <h2>{loading ? "Loading…" : "Unable to show this data"}</h2>
      <p>{message}</p>
      {!loading && showApiHint && (
        <p>
          Check that the API is running and that <code>NEXT_PUBLIC_API_URL</code> points to it.
          {" "}<Link className="text-link" href="/login">Sign in</Link> to try again.
        </p>
      )}
      {!loading && !showApiHint && <Link className="text-link" href="/login">Sign in</Link>}
    </div>
  );
}
