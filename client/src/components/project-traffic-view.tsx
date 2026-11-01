"use client";

import { useState } from "react";
import { ApiState } from "@/components/api-state";
import { PageHeader } from "@/components/ui";
import { TrafficView } from "@/components/traffic-view";
import { useProject } from "@/components/project-provider";
import type { RequestRecord } from "@/lib/api";
import { apiRequest } from "@/lib/api";
import type { RequestLog } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useApiData } from "@/lib/use-api-data";

interface RequestPage {
  requests: RequestRecord[];
  nextCursor: string | null;
}

function toRequestLog(request: RequestRecord, projectId: string): RequestLog {
  return { ...request, projectId };
}

export function ProjectTrafficView() {
  const { project } = useProject();
  const { session } = useSession();
  const resource = useApiData<RequestPage>(
    `/api/projects/${encodeURIComponent(project.projectId)}/requests?limit=50`,
    session?.token,
  );
  const [pagination, setPagination] = useState<{
    projectId: string;
    requests: RequestRecord[];
    cursor: string | null;
  } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<{ projectId: string; message: string } | null>(null);
  const currentPagination = pagination?.projectId === project.projectId ? pagination : null;
  const nextCursor = currentPagination ? currentPagination.cursor : resource.data?.nextCursor ?? null;
  const olderRequests = currentPagination?.requests ?? [];

  async function loadMore() {
    if (!session || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    setLoadError(null);
    try {
      const query = new URLSearchParams({ limit: "50", cursor: nextCursor });
      const result = await apiRequest<RequestPage>(
        `/api/projects/${encodeURIComponent(project.projectId)}/requests?${query}`,
        { token: session.token },
      );
      setPagination((current) => ({
        projectId: project.projectId,
        requests: [
          ...(current?.projectId === project.projectId ? current.requests : []),
          ...result.requests,
        ],
        cursor: result.nextCursor,
      }));
    } catch (reason) {
      setLoadError({
        projectId: project.projectId,
        message: reason instanceof Error ? reason.message : "Unable to load older requests.",
      });
    } finally {
      setLoadingMore(false);
    }
  }

  if (resource.loading) return <ApiState loading message="Loading request history…" />;
  if (resource.error) return <ApiState message={resource.error} />;
  if (!resource.data) return <ApiState message="The API returned an incomplete request history." />;

  const rows = [...resource.data.requests, ...olderRequests].map((request) =>
    toRequestLog(request, project.projectId),
  );

  return (
    <>
      <PageHeader
        title="Traffic"
      />
      {loadError?.projectId === project.projectId && <p className="field-error" role="alert">{loadError.message}</p>}
      <TrafficView
        rows={rows}
        hasMore={Boolean(nextCursor)}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
      />
    </>
  );
}
