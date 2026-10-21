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
    { label: "Requests today", value: formatNumber(data.requestsToday), foot: "Across all projects", icon: "activity" },
    { label: "Successful requests", value: formatNumber(data.successfulRequests), foot: data.successRatePercent === null ? "No requests recorded today" : `${data.successRatePercent}% of recorded requests`, tone: "positive", icon: "check" },
    { label: "Failed requests", value: formatNumber(data.failedRequests), foot: data.errorRatePercent === null ? "No requests recorded today" : `${data.errorRatePercent}% of recorded requests`, icon: "alert" },
    { label: "Average latency", value: data.averageLatencyMs === null ? "—" : `${formatNumber(data.averageLatencyMs)} ms`, foot: "Today · all projects", icon: "clock" },
    { label: "API health", value: `${data.apiHealth.healthy} healthy`, foot: `${data.apiHealth.unknown} unknown · ${data.apiHealth.unhealthy} unhealthy`, tone: data.apiHealth.unhealthy ? "" : "positive", icon: "heart" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="A daily overview of API requests and service health." meta="LIVE · TODAY (UTC)" />
      <div className="grid stats-grid">
        {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>
      <div className="grid section-grid">
        <section className="panel">
          <div className="panel-heading">
            <div><h2>Top endpoints</h2><p className="panel-subtitle">Request count today, across your projects</p></div>
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
          ) : <p className="panel-subtitle">No request data recorded today.</p>}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div><h2>Response status codes</h2><p className="panel-subtitle">Recorded gateway responses today</p></div>
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
          ) : <p className="panel-subtitle">No response status data recorded today.</p>}
        </section>
      </div>
      <section style={{ marginTop: 22 }}>
        <div className="panel-heading">
          <div><h2>Projects</h2><p className="panel-subtitle">{data.projects} APIs configured for the gateway</p></div>
          <Link className="text-link" href="/projects">All projects <ArrowRight size={12} /></Link>
        </div>
        {projectList.data.projects.length ? (
          <div className="project-list">
            {projectList.data.projects.slice(0, 2).map((project) => <ProjectCard key={project.projectId} project={project} />)}
          </div>
        ) : <p className="panel-subtitle">No projects configured yet.</p>}
      </section>
      <p className="panel-subtitle" style={{ marginTop: 14 }}>
        Data from the API · last calculated {new Date(data.asOf).toLocaleTimeString("en", { timeZone: "UTC" })} UTC.
      </p>
    </>
  );
}
