"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ApiState } from "@/components/api-state";
import { GatewayTest } from "@/components/gateway-test";
import { RequestTable, StatusBadge } from "@/components/ui";
import { useProject } from "@/components/project-provider";
import type { HealthCheck, RequestRecord } from "@/lib/api";
import type { RequestLog } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useApiData } from "@/lib/use-api-data";

export function ProjectOverviewView() {
  const { project } = useProject();
  const { session } = useSession();
  const apiKey = useApiData<{ apiKey: { maskedKey: string } | null }>(
    `/api/projects/${encodeURIComponent(project.projectId)}/api-key`,
    session?.token,
  );
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
      <section className="panel setup-panel">
        <div className="panel-heading"><h2>Get started</h2></div>
        <ol className="setup-steps">
          <li className="setup-step setup-step-done">
            <span>1</span>
            <div><strong>Target API configured</strong><small>{project.targetApiUrl}</small></div>
          </li>
          <li className={`setup-step ${apiKey.data?.apiKey ? "setup-step-done" : ""}`}>
            <span>2</span>
            <div>
              <strong>
                {apiKey.loading
                  ? "Checking API key…"
                  : apiKey.error
                    ? "Could not check API key"
                    : apiKey.data?.apiKey
                      ? "API key ready"
                      : "Create an API key"}
              </strong>
              {!apiKey.loading && !apiKey.data?.apiKey && (
                <small><Link href={`/projects/${project.projectId}/settings`}>Open Settings</Link> and generate a key. Save it; it is shown once.</small>
              )}
              {!apiKey.loading && apiKey.data?.apiKey && (
                <small>Paste your saved key below. If you lost it, replace it in Settings.</small>
              )}
            </div>
          </li>
          <li className="setup-step">
            <span>3</span>
            <div><strong>Send a test request below</strong><small>Paste the saved key to see your API response.</small></div>
          </li>
          <li className={`setup-step ${project.healthEndpoint ? "setup-step-done" : ""}`}>
            <span>4</span>
            <div>
              <strong>{project.healthEndpoint ? "Health check enabled" : "Health check (optional)"}</strong>
              <small>
                {project.healthEndpoint
                  ? latestHealth ? `Latest result: ${latestHealth.status.toLowerCase()}.` : "First check is pending."
                  : <><Link href={`/projects/${project.projectId}/settings#health-url`}>Add a health URL</Link> in Settings to enable periodic checks.</>}
              </small>
            </div>
          </li>
        </ol>
      </section>
      <div style={{ marginTop: 15 }}><GatewayTest /></div>
      <section className="panel">
        <div className="panel-heading"><h2>Project details</h2></div>
        <div className="detail-cell"><span>Target API URL</span><strong>{project.targetApiUrl}</strong></div>
        <div className="detail-cell"><span>Gateway URL</span><strong>{project.gatewayUrl}</strong></div>
        <div className="detail-cell"><span>Health endpoint</span><strong>{project.healthEndpoint ?? "Not configured"}</strong></div>
        <div className="detail-grid">
          <div className="detail-cell"><span>Rate-limit requests</span><strong>{project.rateLimit.requests}</strong></div>
          <div className="detail-cell"><span>Rate-limit window</span><strong>{project.rateLimit.windowSeconds} seconds</strong></div>
          <div className="detail-cell"><span>Latest health result</span><strong>{latestHealth ? <StatusBadge status={latestHealth.status === "HEALTHY" ? "Healthy" : "Unhealthy"} /> : project.healthEndpoint ? "Check pending" : "Optional · not configured"}</strong></div>
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
