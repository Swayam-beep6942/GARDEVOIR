import { ScanReport, DemoTargetInfo, GithubRepo } from "./types";
import { authHeaders, getToken } from "./auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

function humanError(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "string") {
    if (value === "[object Object]" || value === "Field required") {
      return "GitHub import failed. Connect GitHub and choose a repository you control.";
    }
    return value;
  }
  if (value instanceof Error) return humanError(value.message);
  if (Array.isArray(value)) {
    return value.map((item) => humanError(item)).filter(Boolean).join(" ");
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    if (typeof rec.msg === "string") return rec.msg;
    if (typeof rec.message === "string") return rec.message;
    if (typeof rec.summary === "string") return rec.summary;
    if ("detail" in rec) return humanError(rec.detail);
    try {
      return JSON.stringify(value);
    } catch {
      return "Import failed. Try again.";
    }
  }
  return String(value);
}

function detailFrom(res: Response, data: any): string {
  return humanError(data) || `Request failed (${res.status})`;
}

export { humanError };

export function githubConnectUrl(): string {
  const token = getToken() || "";
  return `${API_BASE_URL}/ingest/github/connect?token=${encodeURIComponent(token)}`;
}

export async function listGithubRepos(): Promise<{ login: string; repos: GithubRepo[] }> {
  const res = await fetch(`${API_BASE_URL}/ingest/github/repos`, { headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(detailFrom(res, data));
  return data;
}

export async function importGithubRepo(owner: string, repo: string, authorized: boolean): Promise<ScanReport> {
  const res = await fetch(`${API_BASE_URL}/ingest/github/import`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ owner, repo, authorized }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(detailFrom(res, data));
  if (!data.scan) throw new Error("GitHub import did not start an assessment.");
  return data.scan as ScanReport;
}

export async function startScan(targetUrl: string, authorized: boolean): Promise<ScanReport> {
  const res = await fetch(`${API_BASE_URL}/scans`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      target_url: targetUrl,
      authorized: authorized,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || `Failed to initiate scan (${res.status})`);
  }

  return res.json();
}

export async function getScan(scanId: string): Promise<ScanReport> {
  const res = await fetch(`${API_BASE_URL}/scans/${scanId}`, {
    cache: "no-store",
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch scan (${res.status})`);
  }

  return res.json();
}

export async function getDemoTargetInfo(): Promise<DemoTargetInfo> {
  const res = await fetch(`${API_BASE_URL}/demo/target`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load demo target information");
  }

  return res.json();
}
