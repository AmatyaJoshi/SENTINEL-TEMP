import { motion } from "framer-motion";
import clsx from "clsx";
import {
  Activity,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  FolderGit2,
  LayoutGrid,
  List,
  Plus,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import type { Run, RunStatus } from "@/lib/types";
import { relativeTime, repoName, shortSha, usd } from "@/lib/format";
import { useAsync } from "@/hooks/useAsync";
import { useHotkey } from "@/hooks/useHotkey";
import { useSession } from "@/hooks/useSession";
import { NewRunModal } from "@/components/NewRunModal";
import { fadeUp, staggerContainer } from "@/components/motion";
import {
  Card,
  EmptyState,
  ErrorNote,
  Kbd,
  LanguageBadge,
  ProgressBar,
  RunStatusPill,
  TableSkeleton,
} from "@/components/ui";

const PAGE = 24;
const STATUS_FILTERS: Array<{ id: RunStatus | "all"; label: string }> = [
  { id: "all", label: "All Tasks" },
  { id: "running", label: "Running" },
  { id: "awaiting_review", label: "Awaiting Review" },
  { id: "completed", label: "Completed" },
  { id: "failed", label: "Failed" },
  { id: "cancelled", label: "Cancelled" },
];

function CountChips({ counts }: { counts: Run["counts"] }) {
  const items: Array<[string, number, string]> = [
    ["verified", counts.verified, "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"],
    ["fixed", counts.fixed, "bg-emerald-500/20 text-emerald-700 dark:text-emerald-200"],
    ["cand", counts.candidate, "bg-amber-500/15 text-amber-700 dark:text-amber-300"],
    ["pr", counts.pr_opened, "bg-sky-500/15 text-sky-700 dark:text-sky-300"],
  ];
  return (
    <div className="flex gap-1.5 flex-wrap">
      {items
        .filter(([, v]) => v > 0)
        .map(([k, v, cls]) => (
          <span key={k} className={clsx("rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums", cls)} title={k}>
            {v} {k}
          </span>
        ))}
      {items.every(([, v]) => v === 0) && <span className="text-[10px] text-slate-400">-</span>}
    </div>
  );
}

export default function Runs() {
  const { can } = useSession();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const status = (params.get("status") ?? "all") as RunStatus | "all";
  const page = Math.max(0, Number(params.get("page") ?? 0));
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [modal, setModal] = useState(false);
  const [viewMode, setViewMode] = useState<"board" | "table">(() => {
    try {
      return (localStorage.getItem("sentinel.taskView") as "board" | "table") || "board";
    } catch {
      return "board";
    }
  });

  const searchRef = useRef<HTMLInputElement>(null);

  const runs = useAsync(
    () => api.listRuns({ limit: PAGE, offset: page * PAGE, status: status === "all" ? undefined : status }),
    [status, page],
    { pollMs: 10_000 },
  );

  useHotkey(
    "/",
    useCallback((e: KeyboardEvent) => {
      e.preventDefault();
      searchRef.current?.focus();
    }, []),
  );

  useEffect(() => {
    const st = location.state as { focusSearch?: boolean } | null;
    if (st?.focusSearch) setTimeout(() => searchRef.current?.focus(), 50);
  }, [location.state]);

  const toggleViewMode = (mode: "board" | "table") => {
    setViewMode(mode);
    try {
      localStorage.setItem("sentinel.taskView", mode);
    } catch {
      /* ignore */
    }
  };

  const setStatus = (s: RunStatus | "all") => {
    const next = new URLSearchParams(params);
    if (s === "all") next.delete("status");
    else next.set("status", s);
    next.delete("page");
    setParams(next, { replace: true });
  };

  const setPage = (p: number) => {
    const next = new URLSearchParams(params);
    if (p <= 0) next.delete("page");
    else next.set("page", String(p));
    setParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    const items = runs.data?.items ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (r) =>
        r.repo_url.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        (r.commit_sha ?? "").toLowerCase().startsWith(q) ||
        (r.language ?? "").toLowerCase().includes(q),
    );
  }, [runs.data, query]);

  const total = runs.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  // Partition tasks into Kanban columns
  const kanbanColumns = useMemo(() => {
    return [
      {
        id: "active",
        title: "In Progress / Hunting",
        dot: "bg-indigo-500",
        items: filtered.filter((r) => r.status === "running" || r.status === "created"),
      },
      {
        id: "review",
        title: "Awaiting Review",
        dot: "bg-amber-500",
        items: filtered.filter((r) => r.status === "awaiting_review"),
      },
      {
        id: "completed",
        title: "Completed & Verified",
        dot: "bg-emerald-500",
        items: filtered.filter((r) => r.status === "completed"),
      },
      {
        id: "failed",
        title: "Failed / Cancelled",
        dot: "bg-rose-500",
        items: filtered.filter((r) => r.status === "failed" || r.status === "cancelled"),
      },
    ];
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Page Header (Task Management Dashboard style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
            <Activity className="h-3.5 w-3.5" />
            <span>Audit Task Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Audit Tasks & Pipelines
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {total ? `${total.toLocaleString()} total audit runs executed across registered repositories` : "Repository audit backlog"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Switcher: Board (Kanban) vs Table (List) */}
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] flex items-center gap-1">
            <button
              onClick={() => toggleViewMode("board")}
              className={clsx(
                "p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all",
                viewMode === "board"
                  ? "bg-white dark:bg-[#151a2c] text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white",
              )}
              title="Kanban Board view"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              onClick={() => toggleViewMode("table")}
              className={clsx(
                "p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all",
                viewMode === "table"
                  ? "bg-white dark:bg-[#151a2c] text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white",
              )}
              title="Table List view"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          <button
            className="btn-primary py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2"
            onClick={() => setModal(true)}
            disabled={!can("operator")}
            title={can("operator") ? "Start a new audit task" : "Operator role required"}
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>New Audit Task</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        {/* Status Category Tabs */}
        <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                status === f.id
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                  : "bg-white dark:bg-[#121624] text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04]",
              )}
              onClick={() => setStatus(f.id)}
              aria-pressed={status === f.id}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative md:w-80">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            ref={searchRef}
            className="input pl-9 pr-9 py-2 text-xs"
            placeholder="Search repo, task ID, SHA..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search runs"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Kbd>/</Kbd>
          </span>
        </div>
      </div>

      {runs.error && <ErrorNote message={runs.error} onRetry={runs.reload} />}

      {/* Main View: Board vs Table */}
      {runs.loading && !runs.data ? (
        <TableSkeleton rows={6} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No tasks match your filters"
          description={query ? "Try adjusting your search criteria." : "Start a new audit task to begin."}
          action={
            <button className="btn-primary" onClick={() => setModal(true)}>
              Start New Audit
            </button>
          }
        />
      ) : viewMode === "board" ? (
        /* KANBAN BOARD VIEW (Fireart Task Management Signature) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {kanbanColumns.map((col) => (
            <div key={col.id} className="flex flex-col space-y-3">
              {/* Column Header */}
              <div className="flex items-center justify-between px-2 py-1">
                <div className="flex items-center gap-2">
                  <span className={clsx("h-2.5 w-2.5 rounded-full", col.dot)} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    {col.title}
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
                  {col.items.length}
                </span>
              </div>

              {/* Tasks List */}
              <div className="space-y-3 min-h-[300px]">
                {col.items.length === 0 ? (
                  <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200/80 dark:border-white/[0.06] text-center text-xs text-slate-400">
                    No tasks in this stage
                  </div>
                ) : (
                  col.items.map((r) => (
                    <motion.div
                      key={r.id}
                      whileHover={{ y: -3 }}
                      transition={{ duration: 0.15 }}
                      className="card p-4 space-y-3 hover:border-indigo-500/40 dark:hover:border-indigo-400/30 transition-all cursor-pointer group shadow-sm"
                    >
                      <Link to={`/runs/${r.id}`} className="block space-y-2.5">
                        {/* Task Card Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate flex items-center gap-1.5">
                              <FolderGit2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>{repoName(r.repo_url)}</span>
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-0.5">
                              <span>{r.id}</span>
                              <span>·</span>
                              <span>{shortSha(r.commit_sha)}</span>
                            </div>
                          </div>
                          <LanguageBadge language={r.language} />
                        </div>

                        {/* Progress Bar & Current Pipeline Stage */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-medium capitalize truncate max-w-[130px]">
                              {r.current_node ? `Node: ${r.current_node}` : r.status.replace("_", " ")}
                            </span>
                            <span className="font-semibold tabular-nums">{Math.round(r.progress * 100)}%</span>
                          </div>
                          <ProgressBar
                            value={r.progress}
                            color={r.status === "failed" ? "rose" : r.status === "completed" ? "emerald" : r.status === "awaiting_review" ? "amber" : "indigo"}
                            height="h-1.5"
                          />
                        </div>

                        {/* Finding Breakdown Chips */}
                        <div className="pt-1">
                          <CountChips counts={r.counts} />
                        </div>

                        {/* Card Footer: Cost & Duration */}
                        <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {usd(r.cost_usd)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {relativeTime(r.started_at)}
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]">
                  <th className="th">Repository & Task</th>
                  <th className="th">Status</th>
                  <th className="th w-48">Pipeline Progress</th>
                  <th className="th">Findings Breakdown</th>
                  <th className="th">Cost / Budget</th>
                  <th className="th">Started</th>
                  <th className="th text-right">Action</th>
                </tr>
              </thead>
              <motion.tbody key={`${status}-${page}`} variants={staggerContainer} initial="hidden" animate="show">
                {filtered.map((r) => (
                  <motion.tr
                    key={r.id}
                    variants={fadeUp}
                    className="border-b border-slate-200/50 dark:border-white/[0.04] hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="td">
                      <Link to={`/runs/${r.id}`} className="group block">
                        <span className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 inline-flex items-center gap-2">
                          {repoName(r.repo_url)}
                          <LanguageBadge language={r.language} />
                        </span>
                        <span className="block text-[11px] text-slate-400 font-mono mt-0.5">
                          {r.id} · {shortSha(r.commit_sha)}
                          {r.current_node && r.status === "running" ? ` · ${r.current_node}` : ""}
                        </span>
                      </Link>
                    </td>
                    <td className="td">
                      <RunStatusPill status={r.status} />
                    </td>
                    <td className="td">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="capitalize">{r.current_node ?? r.status}</span>
                          <span className="tabular-nums font-semibold">{Math.round(r.progress * 100)}%</span>
                        </div>
                        <ProgressBar
                          value={r.progress}
                          color={r.status === "failed" ? "rose" : r.status === "completed" ? "emerald" : r.status === "awaiting_review" ? "amber" : "indigo"}
                        />
                      </div>
                    </td>
                    <td className="td">
                      <CountChips counts={r.counts} />
                    </td>
                    <td className="td tabular-nums text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{usd(r.cost_usd)}</span>
                      <span className="text-slate-400 text-[11px]"> / {usd(r.budget.max_usd, { digits: 0 })}</span>
                    </td>
                    <td className="td text-xs text-slate-400 whitespace-nowrap" title={r.started_at ?? undefined}>
                      {relativeTime(r.started_at)}
                    </td>
                    <td className="td text-right">
                      <Link
                        to={`/runs/${r.id}`}
                        className="btn-outline !py-1 !px-2.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-1"
                      >
                        Inspect
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200/80 dark:border-white/[0.06] text-xs text-slate-500">
            <span>
              Page {page + 1} of {pages}
              {query && ` · ${filtered.length} matches shown`}
            </span>
            <div className="flex gap-1.5">
              <button
                className="btn-outline !py-1.5 !px-3 rounded-lg"
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>
              <button
                className="btn-outline !py-1.5 !px-3 rounded-lg"
                onClick={() => setPage(page + 1)}
                disabled={page + 1 >= pages}
                aria-label="Next page"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>
      )}

      <NewRunModal open={modal} onClose={() => setModal(false)} />
    </div>
  );
}
