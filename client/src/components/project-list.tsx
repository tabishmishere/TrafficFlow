"use client";

import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { PageHeader, ProjectCard } from "@/components/ui";
import { projects as sampleProjects, type Project } from "@/lib/mock-data";

type ProjectForm = {
  name: string;
  targetApiUrl: string;
  description: string;
};

const emptyForm: ProjectForm = { name: "", targetApiUrl: "", description: "" };

export function ProjectList() {
  const [projects, setProjects] = useState(sampleProjects);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [notice, setNotice] = useState("");

  function closeDialog() {
    setIsOpen(false);
    setForm(emptyForm);
    setError("");
  }

  function addProject(event: FormEvent<HTMLFormElement>) {
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

    const projectId = `proj_preview_${Date.now()}`;
    const project: Project = {
      projectId,
      name,
      description: form.description.trim() || null,
      targetApiUrl: targetUrl.toString(),
      healthEndpoint: null,
      rateLimit: { requests: 100, windowSeconds: 60 },
      gatewayUrl: `http://localhost:4000/g/${projectId}`,
    };

    setProjects((current) => [project, ...current]);
    setNotice(`${name} was added to this page preview. It is not saved and will disappear when you leave or reload.`);
    closeDialog();
  }

  return (
    <>
      <PageHeader
        title="Projects"
        description="APIs configured for the gateway."
        action={
          <button className="button button-primary" type="button" onClick={() => setIsOpen(true)}>
            <Plus size={15} /> Add Project
          </button>
        }
      />
      {notice && <p className="demo-notice" role="status">{notice}</p>}
      <div className="project-list">
        {projects.map((project) => (
          <ProjectCard
            key={project.projectId}
            project={project}
            interactive={sampleProjects.some((sample) => sample.projectId === project.projectId)}
          />
        ))}
      </div>
      <p className="panel-subtitle" style={{ marginTop: 14 }}>Sample projects are for frontend preview only. Creating a project here does not contact the backend.</p>

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
                <p>Enter the API details to preview a project card.</p>
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
                <button className="button button-primary" type="submit">Add project preview</button>
              </div>
              <p className="form-note">Preview only — no data is sent or saved.</p>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
