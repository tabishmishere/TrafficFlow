import type { Metadata } from "next";
import { ProjectSettings } from "@/components/project-settings";
import { getProject } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Project settings" };

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return null;
  return <ProjectSettings project={project} />;
}
