"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import type { Project } from "@/lib/mock-data";

export function ProjectSettings({ project }: { project: Project }) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [targetApiUrl, setTargetApiUrl] = useState(project.targetApiUrl);
  const [healthEndpoint, setHealthEndpoint] = useState(project.healthEndpoint ?? "");
  const [rateLimitRequests, setRateLimitRequests] = useState(String(project.rateLimit.requests));
  const [rateLimitWindow, setRateLimitWindow] = useState(String(project.rateLimit.windowSeconds));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasDemoKey, setHasDemoKey] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function validHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  function saveSettings(event: FormEvent<HTMLFormElement>) {
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
    setError("");
    setNotice("Preview only. Changes were not saved or sent to the backend.");
  }

  function handleDialogKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") setShowDeleteConfirm(false);
  }

  return (
    <>
      <form className="settings-grid" onSubmit={saveSettings}>
        <section className="settings-section">
          <h2>General settings</h2>
          <p>These fields are editable in this local preview only.</p>
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
          <h2>Gateway settings</h2>
          <p>Gateway URL is assigned when the backend creates a project.</p>
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
          <h2>Health monitoring</h2>
          <p>Leave blank to disable scheduled health checks.</p>
          <label className="form-label" htmlFor="health-url">Health endpoint URL <span>Optional</span></label>
          <input className="form-control" id="health-url" inputMode="url" value={healthEndpoint} onChange={(event) => setHealthEndpoint(event.target.value)} placeholder="https://api.example.com/health" />
        </section>
        {error && <p className="field-error" role="alert">{error}</p>}
        {notice && <p className="demo-notice" role="status">{notice}</p>}
        <div className="settings-actions">
          <button className="button button-primary" type="submit">Save preview</button>
        </div>
      </form>

      <section className="settings-section danger-zone">
        <h2>API key</h2>
        <p>No key is included in the sample data. The backend supports generating, viewing, and revoking a project key.</p>
        {hasDemoKey ? (
          <div className="key-row">
            <span className="key-mask">Demo placeholder · no credential generated</span>
            <button className="button button-danger" type="button" onClick={() => {
              setHasDemoKey(false);
              setNotice("Preview only. The sample key state was removed; no API key was revoked.");
            }}>Revoke key (demo)</button>
          </div>
        ) : (
          <button className="button button-secondary" type="button" onClick={() => {
            setHasDemoKey(true);
            setNotice("Preview only. No API key was generated.");
          }}>Generate key (demo)</button>
        )}
      </section>

      <section className="settings-section danger-zone">
        <h2>Delete project</h2>
        <p>The backend supports project deletion. This preview will not delete project data.</p>
        <button className="button button-danger" type="button" onClick={() => setShowDeleteConfirm(true)}>Delete project (demo)</button>
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
            <p id="delete-description">This is only a confirmation preview. No project will be deleted.</p>
            <div className="modal-actions">
              <button autoFocus className="button button-secondary" type="button" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="button button-danger" type="button" onClick={() => {
                setShowDeleteConfirm(false);
                setNotice("Preview only. The project was not deleted.");
              }}>Confirm demo action</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
