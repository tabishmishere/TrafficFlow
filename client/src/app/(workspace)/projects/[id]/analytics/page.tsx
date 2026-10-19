import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import { getProject } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Project analytics" };

export default async function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return null;

  return (
    <section className="panel empty-state analytics-placeholder">
      <span className="empty-icon"><Activity size={18} /></span>
      <h2>Per-project analytics aren&apos;t available yet</h2>
      <p>The current backend provides daily request totals, average latency, top endpoints, response status codes, and health counts across all projects. It does not provide per-project analytics or request activity over time.</p>
      <div className="empty-actions">
        <Link className="button button-primary" href="/dashboard">View dashboard <ArrowRight size={14} /></Link>
        <Link className="button button-secondary" href={`/projects/${id}/traffic`}>View request logs</Link>
      </div>
    </section>
  );
}
