import type { Metadata } from "next";
import { ProjectHealthView } from "@/components/project-health-view";

export const metadata: Metadata = { title: "Project health" };

export default function HealthPage() {
  return <ProjectHealthView />;
}
