"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

export function useApiData<T>(path: string | null, token: string | undefined) {
  const [result, setResult] = useState<{
    key: string;
    data?: T;
    error: string | null;
  }>();
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(() => setRevision((current) => current + 1), []);
  const key = path && token ? `${token}:${path}:${revision}` : "";

  useEffect(() => {
    if (!path || !token) return;
    const requestPath = path;
    const accessToken = token;
    let active = true;
    async function load() {
      try {
        const data = await apiRequest<T>(requestPath, { token: accessToken });
        if (active) setResult({ key, data, error: null });
      } catch (reason) {
        if (active) {
          setResult({
            key,
            error: reason instanceof Error ? reason.message : "Unable to load data.",
          });
        }
      }
    }
    void load();

    return () => {
      active = false;
    };
  }, [key, path, token]);

  if (!key) return { data: undefined, loading: false, error: null, refresh };
  if (result?.key !== key) return { data: undefined, loading: true, error: null, refresh };
  return { data: result.data, loading: false, error: result.error, refresh };
}
