import type { ReactNode } from "react";
import { ProjectProvider } from "@/components/project-provider";

export const instant = false;

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectProvider projectId={id}>{children}</ProjectProvider>;
}
