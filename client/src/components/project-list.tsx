"use client";

import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { PageHeader, ProjectCard } from "@/components/ui";
import { ApiState } from "@/components/api-state";
import type { Project } from "@/lib/api";
import { apiRequest } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useApiData } from "@/lib/use-api-data";

type ProjectForm = {
  name: string;
  targetApiUrl: string;
  description: string;
};

const emptyForm: ProjectForm = { name: "", targetApiUrl: "", description: "" };

export function ProjectList() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { session, ready } = useSession();
  const resource = useApiData<{ projects: Project[] }>(
    ready && session ? "/api/projects" : null,
    session?.token,
  );

  function closeDialog() {
    setIsOpen(false);
    setForm(emptyForm);
    setError("");
  }

  async function addProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError("Enter a project name.");
      return;
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(form.targetApiUrl.trim());
    } catch {
      setError("Enter a valid HTTP or HTTPS target API URL.");
      return;
    }
    if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
      setError("Target API URL must use HTTP or HTTPS.");
      return;
    }

    if (!session) {
      setError("Sign in before adding a project.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await apiRequest<{ project: Project }>("/api/projects", {
        method: "POST",
        token: session.token,
        body: {
          name,
          targetApiUrl: targetUrl.toString(),
          description: form.description.trim() || null,
        },
      });
      setNotice(`${name} was created.`);
      closeDialog();
      resource.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create project.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Projects"
        action={session ? (
          <button className="button button-primary" type="button" onClick={() => setIsOpen(true)}>
            <Plus size={15} /> Add Project
          </button>
        ) : null}
      />
      {!ready && <ApiState loading message="Checking your session…" />}
      {ready && !session && <ApiState message="Sign in to see your projects or create a new one." showApiHint={false} />}
      {ready && session && resource.loading && <ApiState loading message="Loading projects…" />}
      {ready && session && resource.error && <ApiState message={resource.error} />}
      {notice && <p className="demo-notice" role="status">{notice}</p>}
      {ready && session && !resource.loading && !resource.error && (
        resource.data?.projects.length ? (
          <div className="project-list">
            {resource.data.projects.map((project) => (
              <ProjectCard key={project.projectId} project={project} />
            ))}
          </div>
        ) : (
          <div className="panel empty-state">
            <h2>No projects yet</h2>
            <p>Add a project to configure its target API and gateway limits.</p>
          </div>
        )
      )}

      {isOpen && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section aria-labelledby="add-project-title" aria-modal="true" className="modal-card" role="dialog">
            <div className="modal-heading">
              <div>
                <h2 id="add-project-title">Add a project</h2>
              </div>
              <button className="icon-button" type="button" onClick={closeDialog} aria-label="Close form"><X size={17} /></button>
            </div>
            <form noValidate onSubmit={addProject}>
              <div className="form-field">
                <label className="form-label" htmlFor="new-project-name">Project name</label>
                <input
                  autoFocus
                  className="form-control"
                  id="new-project-name"
                  maxLength={100}
                  value={form.name}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, name: event.target.value }));
                    setError("");
                  }}
                  placeholder="Payments API"
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="new-project-url">Target API URL</label>
                <input
                  className="form-control"
                  id="new-project-url"
                  inputMode="url"
                  value={form.targetApiUrl}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, targetApiUrl: event.target.value }));
                    setError("");
                  }}
                  placeholder="https://api.example.com"
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="new-project-description">Description <span>Optional</span></label>
                <textarea
                  className="form-control"
                  id="new-project-description"
                  maxLength={500}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="What does this API do?"
                />
              </div>
              {error && <p className="field-error" role="alert">{error}</p>}
              <div className="modal-actions">
                <button className="button button-secondary" type="button" onClick={closeDialog}>Cancel</button>
                <button className="button button-primary" type="submit" disabled={isSaving}>
                  {isSaving ? "Creating…" : "Add project"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
