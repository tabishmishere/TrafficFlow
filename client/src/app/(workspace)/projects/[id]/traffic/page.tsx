import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { TrafficView } from "@/components/traffic-view";
import { getProject, getProjectRequests } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Request traffic" };

export default async function TrafficPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return null;
  return (
    <>
      <PageHeader title="Request traffic" description={`Review recent API requests for ${project.name}.`} meta="SAMPLE DATA" />
      <TrafficView rows={getProjectRequests(id)} />
    </>
  );
}
