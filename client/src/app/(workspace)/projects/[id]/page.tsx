import type { Metadata } from "next";
import { ProjectOverviewView } from "@/components/project-overview-view";

export const metadata: Metadata = { title: "Project overview" };

export default function ProjectOverviewPage() {
  return <ProjectOverviewView />;
}
