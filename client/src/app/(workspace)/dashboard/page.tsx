import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader, ProjectCard, StatCard } from "@/components/ui";
import { dashboardStats, projects, statusDistribution, topEndpoints } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  const highestEndpointCount = Math.max(...topEndpoints.map((endpoint) => endpoint.requests));
  const highestStatusCount = Math.max(...statusDistribution.map((status) => status.requests));

  return (
    <>
      <PageHeader title="Dashboard" description="A daily overview of API requests and service health." meta="SAMPLE DATA · TODAY" />
      <div className="grid stats-grid">
        {dashboardStats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>
      <div className="grid section-grid">
        <section className="panel">
          <div className="panel-heading">
            <div><h2>Top endpoints</h2><p className="panel-subtitle">Request count today, across your projects</p></div>
          </div>
          <div className="endpoint-list">
            {topEndpoints.map((endpoint) => (
              <div className="endpoint-row" key={endpoint.path}>
                <span className="endpoint-name">{endpoint.path}</span>
                <span className="endpoint-track">
                  <span style={{ width: `${(endpoint.requests / highestEndpointCount) * 100}%` }} />
                </span>
                <span className="endpoint-count">{new Intl.NumberFormat("en-US").format(endpoint.requests)}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div><h2>Response status codes</h2><p className="panel-subtitle">Recorded gateway responses today</p></div>
          </div>
          <div className="endpoint-list">
            {statusDistribution.map((item) => (
              <div className="endpoint-row" key={item.statusCode}>
                <span className="endpoint-name"><strong>{item.statusCode}</strong></span>
                <span className="endpoint-track">
                  <span style={{ width: `${(item.requests / highestStatusCount) * 100}%` }} />
                </span>
                <span className="endpoint-count">{new Intl.NumberFormat("en-US").format(item.requests)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section style={{ marginTop: 22 }}>
        <div className="panel-heading">
          <div><h2>Projects</h2><p className="panel-subtitle">APIs configured for the gateway</p></div>
          <Link className="text-link" href="/projects">All projects <ArrowRight size={12} /></Link>
        </div>
        <div className="project-list">
          {projects.slice(0, 2).map((project) => <ProjectCard key={project.projectId} project={project} />)}
        </div>
      </section>
      <p className="demo-notice" role="note">Dashboard values are illustrative. The backend dashboard currently provides daily totals, latency, endpoints, status codes, and health counts.</p>
    </>
  );
}
