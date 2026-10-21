import type { Metadata } from "next";
import { ProjectTrafficView } from "@/components/project-traffic-view";

export const metadata: Metadata = { title: "Request traffic" };

export default function TrafficPage() {
  return <ProjectTrafficView />;
}
