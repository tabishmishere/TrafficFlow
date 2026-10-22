"use client";

import { createContext, useContext, type ReactNode } from "react";
import Link from "next/link";
import { ProjectNavigation } from "@/components/project-navigation";
import { ApiState } from "@/components/api-state";
import type { Project } from "@/lib/api";
import { useApiData } from "@/lib/use-api-data";
import { useSession } from "@/lib/session";

interface ProjectContextValue {
  project: Project;
  refreshProject: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ projectId, children }: { projectId: string; children: ReactNode }) {
  const { session, ready } = useSession();
  const resource = useApiData<{ projects: Project[] }>(
    ready && session ? "/api/projects" : null,
    session?.token,
  );
  const project = resource.data?.projects.find((item) => item.projectId === projectId);

  if (!ready || resource.loading) {
    return <ApiState loading message="Loading project details…" />;
  }
  if (!session) {
    return (
      <ApiState message="Sign in to view your projects and their live API data." showApiHint={false} />
    );
  }
  if (resource.error) return <ApiState message={resource.error} />;
  if (!project) {
    return (
      <div className="panel empty-state not-found-project">
        <span className="empty-icon">?</span>
        <h2>Project not found</h2>
        <p>This project is not available in your account.</p>
        <Link className="button button-primary" href="/projects">Back to projects</Link>
      </div>
    );
  }

  return (
    <ProjectContext.Provider key={projectId} value={{ project, refreshProject: resource.refresh }}>
      <div className="project-heading">
        <div>
          <h1>{project.name}</h1>
          {project.description && <p>{project.description}</p>}
          <div className="project-url">{project.targetApiUrl}</div>
        </div>
      </div>
      <ProjectNavigation projectId={project.projectId} />
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const value = useContext(ProjectContext);
  if (!value) throw new Error("useProject must be used inside ProjectProvider.");
  return value;
}
