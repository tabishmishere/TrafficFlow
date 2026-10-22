import type { Metadata } from "next";
import { ProjectList } from "@/components/project-list";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return <ProjectList />;
}
