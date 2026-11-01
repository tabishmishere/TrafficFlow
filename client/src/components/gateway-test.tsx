"use client";

import { useState, type FormEvent } from "react";
import { useProject } from "@/components/project-provider";

interface TestResult {
  status: number;
  durationMs: number;
  body: string;
  truncated: boolean;
}

const responseLimit = 10_000;

export function GatewayTest() {
  const { project } = useProject();
  const [apiKey, setApiKey] = useState("");
  const [path, setPath] = useState("/");
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function sendTestRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);

    const normalizedPath = path.trim();
    if (!apiKey.trim()) {
      setError("Paste this project's API key.");
      return;
    }
    if (!normalizedPath.startsWith("/") || normalizedPath.startsWith("//") || normalizedPath.includes("\\")) {
      setError("Path must start with one slash, for example / or /1.");
      return;
    }

    let requestUrl: URL;
    try {
      const gatewayUrl = new URL(project.gatewayUrl);
      const gatewayPath = gatewayUrl.pathname.replace(/\/+$/, "");
      requestUrl = new URL(`${gatewayPath}${normalizedPath}`, gatewayUrl.origin);
      if (requestUrl.origin !== gatewayUrl.origin || !requestUrl.pathname.startsWith(`${gatewayPath}/`)) {
        setError("Enter a path within this project's gateway.");
        return;
      }
    } catch {
      setError("This project's gateway URL is invalid. Check project settings.");
      return;
    }

    setIsSending(true);
    const startedAt = performance.now();
    try {
      const response = await fetch(requestUrl, {
        method: "GET",
        headers: { "X-TrafficFlow-Key": apiKey.trim(), Accept: "application/json" },
        cache: "no-store",
      });
      const responseText = await response.text();
      let body = responseText;
      try {
        body = JSON.stringify(JSON.parse(responseText), null, 2);
      } catch {
        // Keep non-JSON upstream responses readable as plain text.
      }

      setResult({
        status: response.status,
        durationMs: Math.round(performance.now() - startedAt),
        body: body.slice(0, responseLimit),
        truncated: body.length > responseLimit,
      });
    } catch (reason) {
      setError(reason instanceof Error
        ? `Could not reach the gateway: ${reason.message}`
        : "Could not reach the gateway. Check that the API server is running.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="panel gateway-test" id="test-api">
      <div className="panel-heading">
        <h2>Test your API</h2>
      </div>
      <form onSubmit={sendTestRequest}>
        <div className="gateway-test-fields">
          <div className="form-field">
            <label className="form-label" htmlFor="gateway-test-key">Project API key</label>
            <input
              autoComplete="off"
              className="form-control"
              id="gateway-test-key"
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="Paste the key you saved"
              type="password"
              value={apiKey}
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="gateway-test-path">Path</label>
            <input
              className="form-control"
              id="gateway-test-path"
              onChange={(event) => setPath(event.target.value)}
              placeholder="/ or /1"
              value={path}
            />
          </div>
          <button className="button button-primary gateway-test-button" disabled={isSending} type="submit">
            {isSending ? "Sending…" : "Send test"}
          </button>
        </div>
      </form>
      <p className="field-hint">
        Sends a GET request to {project.gatewayUrl}. The key stays in this page and is not saved.
      </p>
      {error && <p className="field-error" role="alert">{error}</p>}
      {result && (
        <div className="gateway-test-result" role="status">
          <div className="gateway-test-result-heading">
            <strong className={result.status >= 200 && result.status < 300 ? "test-success" : "test-failure"}>
              HTTP {result.status}
            </strong>
            <span>{result.durationMs} ms</span>
          </div>
          <pre>{result.body || "(empty response)"}{result.truncated ? "\n\n… response shortened" : ""}</pre>
        </div>
      )}
    </section>
  );
}
