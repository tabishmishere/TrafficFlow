import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { ProjectNavigation } from "@/components/project-navigation";
import { getProject } from "@/lib/mock-data";

export const instant = false;

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);

  if (!project) {
    return (
      <div className="panel empty-state not-found-project">
        <span className="empty-icon">?</span>
        <h2>Project not found</h2>
        <p>This project ID does not match a sample project. Choose a project from the list to continue.</p>
        <Link className="button button-primary" href="/projects">Back to projects</Link>
      </div>
    );
  }

  return (
    <>
      <div className="project-heading">
        <div>
          <h1>{project.name}</h1>
          {project.description && <p>{project.description}</p>}
          <div className="project-url">{project.targetApiUrl}</div>
        </div>
      </div>
      <Suspense fallback={<div className="project-tabs" aria-hidden="true" />}>
        <ProjectNavigation projectId={project.projectId} />
      </Suspense>
      {children}
    </>
  );
}
