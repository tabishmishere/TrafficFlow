import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RequestTable, StatusBadge } from "@/components/ui";
import { getProject, getProjectRequests, latestHealthChecks } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Project overview" };

export default async function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return null;
  const latestHealth = latestHealthChecks[id];

  return (
    <>
      <section className="panel">
          <div className="panel-heading"><div><h2>Project details</h2><p className="panel-subtitle">Configuration for this gateway project</p></div></div>
          <div className="detail-cell"><span>Target API URL</span><strong>{project.targetApiUrl}</strong></div>
          <div className="detail-cell"><span>Gateway URL</span><strong>{project.gatewayUrl}</strong></div>
          <div className="detail-cell"><span>Health endpoint</span><strong>{project.healthEndpoint ?? "Not configured"}</strong></div>
          <div className="detail-grid">
            <div className="detail-cell"><span>Rate-limit requests</span><strong>{project.rateLimit.requests}</strong></div>
            <div className="detail-cell"><span>Rate-limit window</span><strong>{project.rateLimit.windowSeconds} seconds</strong></div>
            <div className="detail-cell"><span>Latest health result</span><strong>{latestHealth ? <StatusBadge status={latestHealth.status === "HEALTHY" ? "Healthy" : "Unhealthy"} /> : "Unknown"}</strong></div>
          </div>
          <Link className="text-link" href={`/projects/${id}/settings`} style={{ fontSize: 11 }}>Edit settings <ArrowRight size={13} /></Link>
      </section>
      <section className="panel" style={{ marginTop: 15 }}>
        <div className="panel-heading">
          <div><h2>Latest requests</h2><p className="panel-subtitle">The backend provides a paginated request log for each project.</p></div>
          <Link className="text-link" href={`/projects/${id}/traffic`} style={{ fontSize: 11 }}>View all <ArrowRight size={13} /></Link>
        </div>
        <RequestTable rows={getProjectRequests(id).slice(0, 5)} />
      </section>
      <p className="demo-notice" role="note">Values shown here are frontend sample data. The project detail route is planned for backend integration.</p>
    </>
  );
}
