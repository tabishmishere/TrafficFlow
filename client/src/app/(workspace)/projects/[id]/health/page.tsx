import type { Metadata } from "next";
import { HeartPulse } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui";
import { getProject, latestHealthChecks } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Project health" };

export default async function HealthPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return null;
  const health = latestHealthChecks[id];
  const healthStatus = health?.status === "HEALTHY" ? "Healthy" : health ? "Unhealthy" : "Unknown";

  return (
    <>
      <PageHeader title="Health" description={`Latest health-check result for ${project.name}.`} meta="SAMPLE DATA" />
      <section className={`health-card ${healthStatus === "Healthy" ? "" : "health-card-neutral"}`}>
        <div className="health-title">
          <span className="health-mark"><HeartPulse size={19} /></span>
          <div>
            <h2>{healthStatus}</h2>
            <p>{project.healthEndpoint ? "Health checks are performed by the backend monitor." : "No health endpoint is configured for this project."}</p>
          </div>
        </div>
        <div className="detail-grid">
          <div className="detail-cell"><span>Health endpoint</span><strong>{project.healthEndpoint ?? "Not configured"}</strong></div>
          <div className="detail-cell"><span>HTTP status</span><strong>{health?.statusCode ?? "—"}</strong></div>
          <div className="detail-cell"><span>Response time</span><strong>{health?.responseMs == null ? "—" : `${health.responseMs} ms`}</strong></div>
          <div className="detail-cell"><span>Last checked</span><strong>{health ? new Date(health.checkedAt).toLocaleString("en", { timeZone: "UTC" }) + " UTC" : "No check recorded"}</strong></div>
          <div className="detail-cell"><span>Current result</span><strong><StatusBadge status={healthStatus} /></strong></div>
        </div>
      </section>
      <p className="demo-notice" role="note">This is one illustrative latest result, not a live health check. The backend health endpoint returns the latest recorded check only.</p>
    </>
  );
}
