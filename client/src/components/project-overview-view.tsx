"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ApiState } from "@/components/api-state";
import { RequestTable, StatusBadge } from "@/components/ui";
import { useProject } from "@/components/project-provider";
import type { HealthCheck, RequestRecord } from "@/lib/api";
import type { RequestLog } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useApiData } from "@/lib/use-api-data";

export function ProjectOverviewView() {
  const { project } = useProject();
  const { session } = useSession();
  const requests = useApiData<{ requests: RequestRecord[]; nextCursor: string | null }>(
    `/api/projects/${encodeURIComponent(project.projectId)}/requests?limit=5`,
    session?.token,
  );
  const health = useApiData<{ health: HealthCheck | null }>(
    `/api/projects/${encodeURIComponent(project.projectId)}/health`,
    session?.token,
  );

  if (requests.loading || health.loading) return <ApiState loading message="Loading project activity…" />;
  if (requests.error || health.error) {
    return <ApiState message={requests.error || health.error || "Unable to load project activity."} />;
  }
  if (!requests.data || !health.data) return <ApiState message="The API returned incomplete project data." />;

  const rows: RequestLog[] = requests.data.requests.map((request) => ({
    ...request,
    projectId: project.projectId,
  }));
  const latestHealth = health.data.health;

  return (
    <>
      <section className="panel">
        <div className="panel-heading"><h2>Project details</h2></div>
        <div className="detail-cell"><span>Target API URL</span><strong>{project.targetApiUrl}</strong></div>
        <div className="detail-cell"><span>Gateway URL</span><strong>{project.gatewayUrl}</strong></div>
        <div className="detail-cell"><span>Health endpoint</span><strong>{project.healthEndpoint ?? "Not configured"}</strong></div>
        <div className="detail-grid">
          <div className="detail-cell"><span>Rate-limit requests</span><strong>{project.rateLimit.requests}</strong></div>
          <div className="detail-cell"><span>Rate-limit window</span><strong>{project.rateLimit.windowSeconds} seconds</strong></div>
          <div className="detail-cell"><span>Latest health result</span><strong>{latestHealth ? <StatusBadge status={latestHealth.status === "HEALTHY" ? "Healthy" : "Unhealthy"} /> : "Unknown"}</strong></div>
        </div>
        <Link className="text-link" href={`/projects/${project.projectId}/settings`} style={{ fontSize: 11 }}>Settings <ArrowRight size={13} /></Link>
      </section>
      <section className="panel" style={{ marginTop: 15 }}>
        <div className="panel-heading">
          <h2>Recent requests</h2>
          <Link className="text-link" href={`/projects/${project.projectId}/traffic`} style={{ fontSize: 11 }}>View all <ArrowRight size={13} /></Link>
        </div>
        <RequestTable rows={rows} />
      </section>
    </>
  );
}
