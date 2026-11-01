"use client";

import { HeartPulse } from "lucide-react";
import { ApiState } from "@/components/api-state";
import { PageHeader, StatusBadge } from "@/components/ui";
import { useProject } from "@/components/project-provider";
import type { HealthCheck } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useApiData } from "@/lib/use-api-data";

export function ProjectHealthView() {
  const { project } = useProject();
  const { session } = useSession();
  const resource = useApiData<{ health: HealthCheck | null }>(
    `/api/projects/${encodeURIComponent(project.projectId)}/health`,
    session?.token,
  );

  if (resource.loading) return <ApiState loading message="Loading health status…" />;
  if (resource.error) return <ApiState message={resource.error} />;
  if (!resource.data) return <ApiState message="The API returned an incomplete health response." />;

  const health = resource.data.health;
  const healthStatus = health?.status === "HEALTHY" ? "Healthy" : health ? "Unhealthy" : "Unknown";

  return (
    <>
      <PageHeader title="Health" />
      <section className={`health-card ${healthStatus === "Healthy" ? "" : "health-card-neutral"}`}>
        <div className="health-title">
          <span className="health-mark"><HeartPulse size={19} /></span>
          <div>
            <h2>{healthStatus}</h2>
            <p>
              {!project.healthEndpoint
                ? "Add a health URL in Settings to enable checks."
                : !health
                  ? "The first check is pending. Checks run about once a minute."
                  : `Checked ${new Date(health.checkedAt).toLocaleTimeString("en", { timeZone: "UTC" })} UTC.`}
            </p>
          </div>
        </div>
        <div className="detail-grid">
          <div className="detail-cell"><span>Health endpoint</span><strong>{project.healthEndpoint ?? "Not configured"}</strong></div>
          <div className="detail-cell"><span>HTTP status</span><strong>{health?.statusCode ?? "—"}</strong></div>
          <div className="detail-cell"><span>Response time</span><strong>{health?.responseMs == null ? "—" : `${health.responseMs} ms`}</strong></div>
          <div className="detail-cell"><span>Last checked</span><strong>{health ? `${new Date(health.checkedAt).toLocaleString("en", { timeZone: "UTC" })} UTC` : "No check recorded"}</strong></div>
          <div className="detail-cell"><span>Current result</span><strong><StatusBadge status={healthStatus} /></strong></div>
        </div>
      </section>
    </>
  );
}
