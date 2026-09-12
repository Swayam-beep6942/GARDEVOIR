"use client";

import React, { useState } from "react";
import { GithubRepo } from "../lib/types";

interface LandingHeroProps {
  githubConnected: boolean;
  githubLogin: string;
  repos: GithubRepo[];
  loadingRepos: boolean;
  isLoading: boolean;
  error: string | null;
  onConnectGithub: () => void;
  onSelectRepo: (owner: string, repo: string) => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  githubConnected,
  githubLogin,
  repos,
  loadingRepos,
  isLoading,
  error,
  onConnectGithub,
  onSelectRepo,
}) => {
  const [authorized, setAuthorized] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const requireAuth = () => {
    if (!authorized) {
      setLocalError("You must confirm ownership before importing a project.");
      return false;
    }
    setLocalError(null);
    return true;
  };

  const shownError = localError || (error === "[object Object]" || error === "Field required"
    ? "GitHub import failed. Connect GitHub and choose a repository you control."
    : error);

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col px-2 py-6">
      <p className="text-white/40 font-medium uppercase" style={{ letterSpacing: "0.22em", fontSize: "0.62rem" }}>
        Assessment
      </p>
      <h1 className="mt-4 font-black leading-none text-white" style={{ fontSize: "clamp(3rem,8vw,5.5rem)", letterSpacing: "-0.025em", lineHeight: 0.9 }}>
        TEST<br />YOUR<br />WEB
      </h1>
      <p className="mt-6 max-w-sm text-white/50 leading-loose" style={{ fontSize: "0.92rem", letterSpacing: "0.04em" }}>
        Import a GitHub repository you control. URL paste is not allowed.
      </p>

      <label className="lg lg-static mt-10 flex items-start gap-3 p-4" style={{ borderRadius: 12 }}>
        <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.currentTarget.checked)} className="mt-1" />
        <span className="text-sm text-white/60 leading-relaxed">
          I confirm that I own this project or have admin/push rights to assess it.
        </span>
      </label>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={isLoading}
          onClick={() => {
            if (!requireAuth()) return;
            onConnectGithub();
          }}
          className="lg text-white font-semibold uppercase"
          style={{ letterSpacing: "0.15em", fontSize: "0.78rem", padding: "1rem 2rem", borderRadius: 14 }}
        >
          {githubConnected ? "Choose GitHub repo  →" : "Import from GitHub  →"}
        </button>
      </div>

      {githubConnected && (
        <div className="lg lg-static mt-6 p-4" style={{ borderRadius: 16 }}>
          <p className="uppercase text-white/40" style={{ letterSpacing: "0.18em", fontSize: "0.62rem" }}>
            GitHub · {githubLogin || "connected"}
          </p>
          {loadingRepos ? (
            <p className="mt-3 text-sm text-white/50">Loading repositories…</p>
          ) : repos.length === 0 ? (
            <p className="mt-3 text-sm text-white/50">No repositories returned. Reconnect GitHub if this looks wrong.</p>
          ) : (
            <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto">
              {repos.map((repo) => (
                <li key={repo.full_name}>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      if (!requireAuth()) return;
                      onSelectRepo(repo.owner, repo.name);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10"
                  >
                    <span>{repo.full_name}</span>
                    <span className="text-white/35" style={{ fontSize: "0.62rem" }}>
                      {repo.private ? "private" : "public"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {shownError && (
        <p className="mt-4 text-sm text-white/70" style={{ overflowWrap: "anywhere" }}>
          {shownError}
        </p>
      )}
      {isLoading && <p className="mt-3 text-sm text-white/50">Importing repository…</p>}
    </div>
  );
};
