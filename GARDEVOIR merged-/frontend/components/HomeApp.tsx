"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getScan, githubConnectUrl, humanError, importGithubRepo, listGithubRepos } from "../lib/api";
import { AuthUser, GithubRepo, ScanReport } from "../lib/types";
import { LandingHero } from "./LandingHero";
import { AnalyzingProgress } from "./AnalyzingProgress";
import { AnalystPage, RegionsPage, ScorePage } from "./results/OverviewPages";
import { WhyPointsLost } from "./WhyPointsLost";
import { FindingsTable } from "./FindingsTable";
import { TimelineView } from "./TimelineView";
import { AppSidebar2, type SidebarActive } from "./blocks/app-sidebar-2";
import { clearToken, fetchMe, getToken, setToken } from "../lib/auth";
import { greetName, type PageOrigin, type ResultsView } from "../lib/results-nav";
import { SidebarPageTransition } from "./results/SidebarPageTransition";
import { createSphereAnim, SphereCanvas } from "./gardevoir/SphereCanvas";

export function HomeApp() {
  const router = useRouter();
  const animRef = useRef(createSphereAnim({
    phase: "orbit",
    cxFrac: 0.18,
    cyFrac: 0.82,
    rFrac: 0.12,
  }));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [currentScan, setCurrentScan] = useState<ScanReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<ResultsView>("overview-score");
  const [pageOrigin, setPageOrigin] = useState<PageOrigin | null>(null);
  const [revealResults, setRevealResults] = useState(false);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const loadRepos = () => {
    setLoadingRepos(true);
    listGithubRepos()
      .then((data) => setRepos(data.repos || []))
      .catch((err) => setImportError(humanError(err) || "Could not load GitHub repositories."))
      .finally(() => setLoadingRepos(false));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const incoming = params.get("token");
    if (incoming) {
      setToken(incoming);
      params.delete("token");
      const next = params.toString();
      window.history.replaceState({}, "", `/home${next ? `?${next}` : ""}`);
    }
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchMe()
      .then((me) => {
        setUser(me);
        if (me.github_connected || params.get("github") === "connected") {
          loadRepos();
        }
      })
      .catch(() => {
        clearToken();
        router.replace("/login");
      })
      .finally(() => setChecking(false));
  }, [router]);

  useEffect(() => {
    if (!currentScan || currentScan.status === "COMPLETED" || currentScan.status === "FAILED") {
      return;
    }
    const timer = setInterval(async () => {
      try {
        const updated = await getScan(currentScan.scan_id);
        setCurrentScan(updated);
        if (updated.status === "COMPLETED" || updated.status === "FAILED") {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to poll scan status", err);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [currentScan?.scan_id, currentScan?.status]);

  const handleStarFinished = () => setRevealResults(true);

  const beginScan = async (runner: () => Promise<ScanReport>) => {
    try {
      setImportError(null);
      setIsLoading(true);
      setRevealResults(false);
      setActiveView("overview-score");
      const scan = await runner();
      setCurrentScan(scan);
      router.replace("/home");
    } catch (err: any) {
      setImportError(humanError(err) || "Failed to start assessment");
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentScan(null);
    setIsLoading(false);
    setRevealResults(false);
    setActiveView("overview-score");
  };

  if (checking || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#02040b]">
        <p className="uppercase text-white/40" style={{ letterSpacing: "0.28em", fontSize: "0.62rem" }}>Loading…</p>
      </main>
    );
  }

  const isFailed = Boolean(currentScan && currentScan.status === "FAILED");
  const isCompleted = Boolean(currentScan && currentScan.status === "COMPLETED" && revealResults);
  const showAnalyzing =
    (isLoading && !currentScan) ||
    Boolean(currentScan && currentScan.status !== "FAILED" && !isCompleted);
  const firstName = greetName(user.name, user.email);
  const sidebarActive: SidebarActive = isCompleted ? activeView : "assess";

  const signOut = () => {
    clearToken();
    router.push("/");
  };

  const selectView = (view: ResultsView, origin?: PageOrigin | null) => {
    if (origin) setPageOrigin(origin);
    setActiveView(view);
  };

  const githubConnected = Boolean(user.github_connected) || repos.length > 0;

  return (
    <main className="relative flex h-screen overflow-hidden bg-[#02040b]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <SphereCanvas
        animRef={animRef}
        interactive={false}
        style={{ zIndex: 0, pointerEvents: "none", position: "fixed" }}
      />

      <div className="relative z-10 flex h-full min-h-0 w-full gap-4 p-3 sm:p-4">
        <AppSidebar2
          active={sidebarActive}
          resultsEnabled={isCompleted}
          onSelect={selectView}
          findingsCount={currentScan?.findings.length ?? 0}
          onNewAssessment={handleReset}
          onSignOut={signOut}
        />

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {isCompleted && currentScan ? (
            <SidebarPageTransition pageKey={activeView} origin={pageOrigin}>
              <div className="flex h-full min-h-0 flex-col">
                <div className="px-2 pb-4 pt-2 sm:px-4 sm:pt-3">
                  <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    Hey {firstName}!
                  </h1>
                  <p className="mt-2 truncate text-sm text-white/40">{currentScan.target_url}</p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-8 sm:px-4">
                  {activeView === "overview-score" && (
                    <ScorePage scan={currentScan} onWhyPoints={() => selectView("why_points")} />
                  )}
                  {activeView === "overview-regions" && <RegionsPage scan={currentScan} />}
                  {activeView === "overview-analyst" && <AnalystPage scan={currentScan} />}
                  {activeView === "why_points" && currentScan.scoring && (
                    <WhyPointsLost
                      penalties={currentScan.scoring.penalties}
                      totalPointsLost={currentScan.scoring.total_points_lost}
                      overallScore={currentScan.scoring.overall_score}
                      onViewFinding={() => selectView("findings")}
                    />
                  )}
                  {activeView === "findings" && <FindingsTable findings={currentScan.findings} />}
                  {activeView === "timeline" && <TimelineView timeline={currentScan.timeline} />}
                </div>
              </div>
            </SidebarPageTransition>
          ) : (
            <div className="flex h-full min-h-0 flex-col overflow-y-auto">
              <div className="px-2 pb-2 pt-2 sm:px-4 sm:pt-3">
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Hey {firstName}!
                </h1>
              </div>
              <div className="min-h-0 flex-1 px-2 pb-8 sm:px-4">
                {isFailed && currentScan ? (
                  <div className="lg lg-static mx-auto mt-8 max-w-md p-8 text-center" style={{ borderRadius: 24 }}>
                    <h3 className="font-black text-2xl">Assessment failed</h3>
                    <p className="mt-2 text-sm text-white/50">{currentScan.current_step}</p>
                    <button onClick={handleReset} className="lg mt-4 px-5 py-2 uppercase" style={{ letterSpacing: "0.16em", fontSize: "0.62rem", borderRadius: 999 }}>
                      Try again
                    </button>
                  </div>
                ) : showAnalyzing ? (
                  <AnalyzingProgress
                    scan={
                      currentScan ?? {
                        scan_id: "pending",
                        target_url: "",
                        status: "PENDING",
                        created_at: "",
                        tests_completed: [],
                        test_results: {},
                        findings: [],
                        timeline: [],
                        current_step: "Initializing…",
                      }
                    }
                    onFinished={handleStarFinished}
                  />
                ) : (
                  <LandingHero
                    githubConnected={githubConnected}
                    githubLogin={user.github_login || ""}
                    repos={repos}
                    loadingRepos={loadingRepos}
                    isLoading={isLoading}
                    error={importError}
                    onConnectGithub={() => {
                      if (githubConnected) {
                        loadRepos();
                        return;
                      }
                      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"}/auth/providers`)
                        .then((res) => res.json())
                        .then((providers) => {
                          if (!providers?.github) {
                            setImportError("GitHub is not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in backend/.env, then try again.");
                            return;
                          }
                          window.location.href = githubConnectUrl();
                        })
                        .catch(() => setImportError("Could not reach GitHub. Check that the API is running on port 8000."));
                    }}
                    onSelectRepo={(owner, repo) => beginScan(() => importGithubRepo(owner, repo, true))}
                  />
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
