import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  Clock3,
  HeartPulse,
  Layers3,
  Plus,
  type LucideIcon,
} from "lucide-react";
import type { Project, RequestLog } from "@/lib/api";
import { statusLabel, statusTone } from "@/lib/utils";

export function Logo() {
  return (
    <Link className="logo" href="/" aria-label="TrafficFlow home">
      <span className="logo-mark" aria-hidden="true">
        <Activity size={17} strokeWidth={2.4} />
      </span>
      <span>TrafficFlow</span>
    </Link>
  );
}

export function PublicHeader() {
  return (
    <header className="public-nav">
      <Logo />
      <nav className="nav-actions" aria-label="Main navigation">
        <Link className="button button-quiet" href="/login">Log in</Link>
        <Link className="button button-primary" href="/register">Sign up</Link>
      </nav>
    </header>
  );
}

export function PageHeader({
  title,
  description,
  meta,
  action,
}: {
  title: string;
  description: string;
  meta?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ?? (meta ? <span className="page-header-meta">{meta}</span> : null)}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone = status === "Operational" || status === "Healthy"
    ? "success"
    : status === "Degraded" || status === "Unhealthy"
      ? "warning"
      : "neutral";
  return <span className={`status-pill status-${tone}`}>{status}</span>;
}

export function MethodBadge({ method }: { method: RequestLog["method"] }) {
  return <span className={`method-badge method-${method.toLowerCase()}`}>{method}</span>;
}

export function RequestTable({
  rows,
  showProject = false,
}: {
  rows: RequestLog[];
  showProject?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon"><Activity size={18} /></span>
        <h2>No requests found</h2>
        <p>Requests routed through this project will appear here.</p>
      </div>
    );
  }
  return (
    <div className="request-table-wrap">
      <table className="request-table">
        <thead>
          <tr>
            {showProject && <th>Project</th>}
            <th>Method</th>
            <th>Path</th>
            <th>Status</th>
            <th>Latency</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.requestId}>
              {showProject && <td>{row.projectId}</td>}
              <td><MethodBadge method={row.method} /></td>
              <td>{row.path}</td>
              <td>
                <span className={`status-pill status-${statusTone(row.statusCode)}`}>
                  {row.statusCode} · {statusLabel(row.statusCode)}
                </span>
              </td>
              <td>{row.latencyMs} ms</td>
              <td>{new Date(row.createdAt).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" })} UTC</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const statIcons: Record<string, LucideIcon> = {
  activity: Activity,
  check: Check,
  alert: AlertTriangle,
  clock: Clock3,
  heart: HeartPulse,
};

export function StatCard({
  label,
  value,
  foot,
  tone,
  icon,
}: {
  label: string;
  value: string;
  foot: string;
  tone?: string;
  icon?: string;
}) {
  const Icon = (icon && statIcons[icon]) || Layers3;
  return (
    <section className="stat-card">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon"><Icon size={15} /></span>
      </div>
      <strong className="stat-value">{value}</strong>
      <span className={`stat-foot ${tone ?? ""}`}>{foot}</span>
    </section>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  href,
}: {
  title: string;
  description: string;
  actionLabel: string;
  href: string;
}) {
  return (
    <div className="panel empty-state">
      <span className="empty-icon"><Layers3 size={18} /></span>
      <h2>{title}</h2>
      <p>{description}</p>
      <Link className="button button-primary" href={href}>
        <Plus size={14} /> {actionLabel}
      </Link>
    </div>
  );
}

export function ProjectCard({
  project,
  interactive = true,
}: {
  project: Project;
  interactive?: boolean;
}) {
  const content = (
    <>
      <div className="project-card-top">
        <div>
          <h2>{project.name}</h2>
          <p>{project.targetApiUrl}</p>
        </div>
        {interactive && <span className="card-arrow">View project <ArrowRight size={13} /></span>}
      </div>
      {project.description && <p className="project-description">{project.description}</p>}
      <div className="project-meta">
        <span>Gateway ID<strong>{project.projectId}</strong></span>
        <span>Health check<strong>{project.healthEndpoint ? "Configured" : "Not configured"}</strong></span>
        <span>Rate limit<strong>{project.rateLimit.requests} / {project.rateLimit.windowSeconds}s</strong></span>
      </div>
    </>
  );
  return interactive ? (
    <Link className="project-card" href={`/projects/${project.projectId}`}>{content}</Link>
  ) : (
    <article className="project-card">{content}</article>
  );
}
