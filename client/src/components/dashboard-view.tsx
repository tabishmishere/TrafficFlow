"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ApiState } from "@/components/api-state";
import { PageHeader, ProjectCard, StatCard } from "@/components/ui";
import type { Dashboard, Project } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { useApiData } from "@/lib/use-api-data";

export function DashboardView() {
  const { session, ready } = useSession();
  const dashboard = useApiData<Dashboard>(
    ready && session ? "/api/dashboard" : null,
    session?.token,
  );
  const projectList = useApiData<{ projects: Project[] }>(
    ready && session ? "/api/projects" : null,
    session?.token,
  );

  if (!ready || !session) {
    return <ApiState loading={!ready} message="Sign in to load your dashboard and project data." showApiHint={false} />;
  }
  if (dashboard.loading || projectList.loading) {
    return <ApiState loading message="Loading dashboard…" />;
  }
  if (dashboard.error || projectList.error) {
    return <ApiState message={dashboard.error || projectList.error || "Unable to load dashboard."} />;
  }
  if (!dashboard.data || !projectList.data) {
    return <ApiState message="The API returned an incomplete dashboard response." />;
  }

  const data = dashboard.data;
  const highestEndpointCount = Math.max(1, ...data.topEndpoints.map((endpoint) => endpoint.requests));
  const highestStatusCount = Math.max(1, ...data.statusCodes.map((status) => status.requests));
  const stats = [
    { label: "Requests", value: formatNumber(data.requestsToday), icon: "activity" },
    { label: "Successful", value: formatNumber(data.successfulRequests), foot: data.successRatePercent === null ? "—" : `${data.successRatePercent}%`, tone: "positive", icon: "check" },
    { label: "Failed", value: formatNumber(data.failedRequests), foot: data.errorRatePercent === null ? "—" : `${data.errorRatePercent}%`, icon: "alert" },
    { label: "Avg. latency", value: data.averageLatencyMs === null ? "—" : `${formatNumber(data.averageLatencyMs)} ms`, icon: "clock" },
    { label: "Healthy APIs", value: String(data.apiHealth.healthy), foot: `${data.apiHealth.unhealthy} down · ${data.apiHealth.unknown} unknown`, tone: data.apiHealth.unhealthy ? "" : "positive", icon: "heart" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" meta="TODAY · UTC" />
      <div className="grid stats-grid">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>
      <div className="grid section-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Top endpoints</h2>
          </div>
          {data.topEndpoints.length ? (
            <div className="endpoint-list">
              {data.topEndpoints.map((endpoint) => (
                <div className="endpoint-row" key={endpoint.path}>
                  <span className="endpoint-name">{endpoint.path}</span>
                  <span className="endpoint-track">
                    <span style={{ width: `${(endpoint.requests / highestEndpointCount) * 100}%` }} />
                  </span>
                  <span className="endpoint-count">{formatNumber(endpoint.requests)}</span>
                </div>
              ))}
            </div>
          ) : <p className="panel-subtitle">No data today</p>}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Responses</h2>
          </div>
          {data.statusCodes.length ? (
            <div className="endpoint-list">
              {data.statusCodes.map((item) => (
                <div className="endpoint-row" key={item.statusCode}>
                  <span className="endpoint-name"><strong>{item.statusCode}</strong></span>
                  <span className="endpoint-track">
                    <span style={{ width: `${(item.requests / highestStatusCount) * 100}%` }} />
                  </span>
                  <span className="endpoint-count">{formatNumber(item.requests)}</span>
                </div>
              ))}
            </div>
          ) : <p className="panel-subtitle">No data today</p>}
        </section>
      </div>
      <section style={{ marginTop: 22 }}>
        <div className="panel-heading">
          <h2>Projects <span className="panel-subtitle">{data.projects}</span></h2>
          <Link className="text-link" href="/projects">View all <ArrowRight size={12} /></Link>
        </div>
        {projectList.data.projects.length ? (
          <div className="project-list">
            {projectList.data.projects.slice(0, 2).map((project) => <ProjectCard key={project.projectId} project={project} />)}
          </div>
        ) : <p className="panel-subtitle">No projects yet</p>}
      </section>
    </>
  );
}
