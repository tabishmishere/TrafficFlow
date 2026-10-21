"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiState } from "@/components/api-state";
import { useProject } from "@/components/project-provider";
import type { Project } from "@/lib/api";
import { apiRequest } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useApiData } from "@/lib/use-api-data";

interface ApiKeyState {
  apiKey: null | {
    maskedKey: string;
    createdAt: string;
    lastUsedAt: string | null;
  };
}

export function ProjectSettings() {
  const { project, refreshProject } = useProject();
  const { session } = useSession();
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [targetApiUrl, setTargetApiUrl] = useState(project.targetApiUrl);
  const [healthEndpoint, setHealthEndpoint] = useState(project.healthEndpoint ?? "");
  const [rateLimitRequests, setRateLimitRequests] = useState(String(project.rateLimit.requests));
  const [rateLimitWindow, setRateLimitWindow] = useState(String(project.rateLimit.windowSeconds));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [keyAction, setKeyAction] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [generatedKey, setGeneratedKey] = useState("");
  const [keyError, setKeyError] = useState("");
  const keyResource = useApiData<ApiKeyState>(
    `/api/projects/${encodeURIComponent(project.projectId)}/api-key`,
    session?.token,
  );

  function validHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }
    if (!validHttpUrl(targetApiUrl.trim())) {
      setError("Enter a valid HTTP or HTTPS target API URL.");
      return;
    }
    if (healthEndpoint.trim() && !validHttpUrl(healthEndpoint.trim())) {
      setError("Health endpoint must be a valid HTTP or HTTPS URL, or left empty.");
      return;
    }
    const requests = Number(rateLimitRequests);
    const windowSeconds = Number(rateLimitWindow);
    if (!Number.isInteger(requests) || requests < 1 || requests > 1_000_000) {
      setError("Request limit must be an integer from 1 to 1,000,000.");
      return;
    }
    if (!Number.isInteger(windowSeconds) || windowSeconds < 1 || windowSeconds > 86_400) {
      setError("Time window must be an integer from 1 to 86,400 seconds.");
      return;
    }
    if (!session) {
      setError("Sign in before saving project settings.");
      return;
    }

    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<{ project: Project }>(`/api/projects/${encodeURIComponent(project.projectId)}`, {
        method: "PATCH",
        token: session.token,
        body: {
          name: name.trim(),
          description: description.trim() || null,
          targetApiUrl: targetApiUrl.trim(),
          healthEndpoint: healthEndpoint.trim() || null,
          rateLimitRequests: requests,
          rateLimitWindowSeconds: windowSeconds,
        },
      });
      setName(result.project.name);
      setDescription(result.project.description ?? "");
      setTargetApiUrl(result.project.targetApiUrl);
      setHealthEndpoint(result.project.healthEndpoint ?? "");
      setRateLimitRequests(String(result.project.rateLimit.requests));
      setRateLimitWindow(String(result.project.rateLimit.windowSeconds));
      setNotice("Project settings saved.");
      refreshProject();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save project settings.");
    } finally {
      setIsSaving(false);
    }
  }

  async function generateKey() {
    if (!session) return;
    setKeyAction(true);
    setKeyError("");
    setGeneratedKey("");
    try {
      const result = await apiRequest<{ apiKey: string; message: string }>(
        `/api/projects/${encodeURIComponent(project.projectId)}/api-key`,
        { method: "POST", token: session.token },
      );
      setGeneratedKey(result.apiKey);
      setNotice(result.message);
      keyResource.refresh();
    } catch (reason) {
      setKeyError(reason instanceof Error ? reason.message : "Unable to generate API key.");
    } finally {
      setKeyAction(false);
    }
  }

  async function revokeKey() {
    if (!session) return;
    setKeyAction(true);
    setKeyError("");
    setGeneratedKey("");
    try {
      await apiRequest<void>(`/api/projects/${encodeURIComponent(project.projectId)}/api-key`, {
        method: "DELETE",
        token: session.token,
      });
      setNotice("API key revoked.");
      keyResource.refresh();
    } catch (reason) {
      setKeyError(reason instanceof Error ? reason.message : "Unable to revoke API key.");
    } finally {
      setKeyAction(false);
    }
  }

  async function deleteProject() {
    if (!session) return;
    setIsDeleting(true);
    setError("");
    try {
      await apiRequest<void>(`/api/projects/${encodeURIComponent(project.projectId)}`, {
        method: "DELETE",
        token: session.token,
      });
      router.push("/projects");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete project.");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  }

  function handleDialogKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") setShowDeleteConfirm(false);
  }

  if (keyResource.loading) return <ApiState loading message="Loading project API-key status…" />;
  if (keyResource.error) return <ApiState message={keyResource.error} />;
  if (!keyResource.data) return <ApiState message="The API returned an incomplete API-key response." />;

  return (
    <>
      <form className="settings-grid" onSubmit={saveSettings}>
        <section className="settings-section">
          <h2>Project</h2>
          <div className="settings-form-grid">
            <div className="form-field">
              <label className="form-label" htmlFor="project-name">Project name</label>
              <input className="form-control" id="project-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="target-url">Target API URL</label>
              <input className="form-control" id="target-url" inputMode="url" value={targetApiUrl} onChange={(event) => setTargetApiUrl(event.target.value)} required />
            </div>
            <div className="form-field wide">
              <label className="form-label" htmlFor="project-description">Description <span>Optional</span></label>
              <textarea className="form-control" id="project-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} />
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2>Gateway</h2>
          <div className="settings-form-grid">
            <div className="form-field wide">
              <label className="form-label" htmlFor="gateway-url">Gateway URL</label>
              <input className="form-control" id="gateway-url" value={project.gatewayUrl} readOnly />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="rate-limit">Rate-limit requests</label>
              <input className="form-control" id="rate-limit" type="number" min={1} max={1_000_000} step={1} value={rateLimitRequests} onChange={(event) => setRateLimitRequests(event.target.value)} required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="rate-window">Time window (seconds)</label>
              <input className="form-control" id="rate-window" type="number" min={1} max={86_400} step={1} value={rateLimitWindow} onChange={(event) => setRateLimitWindow(event.target.value)} required />
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2>Health check</h2>
          <label className="form-label" htmlFor="health-url">Health endpoint URL <span>Optional</span></label>
          <input className="form-control" id="health-url" inputMode="url" value={healthEndpoint} onChange={(event) => setHealthEndpoint(event.target.value)} placeholder="https://api.example.com/health" />
        </section>
        {error && <p className="field-error" role="alert">{error}</p>}
        {notice && <p className="demo-notice" role="status">{notice}</p>}
        <div className="settings-actions">
          <button className="button button-primary" type="submit" disabled={isSaving}>
            {isSaving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>

      <section className="settings-section danger-zone">
        <h2>API key</h2>
        <p>Full key is shown once.</p>
        {keyResource.data.apiKey ? (
          <div className="key-row">
            <span className="key-mask">{keyResource.data.apiKey.maskedKey}</span>
            <button className="button button-secondary" type="button" onClick={generateKey} disabled={keyAction}>
              {keyAction ? "Working…" : "Replace key"}
            </button>
            <button className="button button-danger" type="button" onClick={revokeKey} disabled={keyAction}>Revoke key</button>
          </div>
        ) : (
          <button className="button button-secondary" type="button" onClick={generateKey} disabled={keyAction}>
            {keyAction ? "Generating…" : "Generate API key"}
          </button>
        )}
        {generatedKey && <p className="key-mask" role="status">Copy this key now: <code>{generatedKey}</code></p>}
        {keyError && <p className="field-error" role="alert">{keyError}</p>}
      </section>

      <section className="settings-section danger-zone">
        <h2>Delete project</h2>
        <p>Also deletes its logs and API key.</p>
        {error && <p className="field-error" role="alert">{error}</p>}
        <button className="button button-danger" type="button" onClick={() => setShowDeleteConfirm(true)}>Delete project</button>
      </section>

      {showDeleteConfirm && (
        <div className="modal-backdrop" onKeyDown={handleDialogKey}>
          <section
            aria-labelledby="delete-title"
            aria-describedby="delete-description"
            aria-modal="true"
            className="modal-card"
            role="dialog"
            tabIndex={-1}
          >
            <h2 id="delete-title">Delete {project.name}?</h2>
            <p id="delete-description">This cannot be undone.</p>
            {error && <p className="field-error" role="alert">{error}</p>}
            <div className="modal-actions">
              <button autoFocus className="button button-secondary" type="button" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>Cancel</button>
              <button className="button button-danger" type="button" onClick={deleteProject} disabled={isDeleting}>
                {isDeleting ? "Deleting…" : "Delete project"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
