export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function statusTone(statusCode: number): "success" | "warning" | "error" | "neutral" {
  if (statusCode >= 500) return "error";
  if (statusCode >= 400) return "warning";
  if (statusCode >= 200 && statusCode < 400) return "success";
  return "neutral";
}

export function statusLabel(statusCode: number): string {
  const tone = statusTone(statusCode);
  if (tone === "success") return "Success";
  if (tone === "warning") return "Client error";
  if (tone === "error") return "Server error";
  return "Unknown";
}
