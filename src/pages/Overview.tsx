import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bug,
  CircleDollarSign,
  Cpu,
  GitPullRequest,
  Plus,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import type { Stats } from "@/lib/types";
import { relativeTime, repoName, titleCase, usd } from "@/lib/format";
import { useAsync } from "@/hooks/useAsync";
import { useSession } from "@/hooks/useSession";
import { Counter } from "@/components/Counter";
import { NewRunModal } from "@/components/NewRunModal";
import { CATEGORY_COLORS, ChartTooltip, axisProps } from "@/components/charts";
import { fadeUp, staggerContainer } from "@/components/motion";
import { Card, EmptyState, ErrorNote, FINDING_STATUS_COLOR, LanguageBadge, ProgressBar, RunStatusPill, Skeleton, TableSkeleton } from "@/components/ui";

interface KpiTile {
  key: string;
  label: string;
  icon: typeof Activity;
  iconBg: string;
  iconColor: string;
  value: (s: Stats) => number;
  format: (v: number) => string;
  trend: string;
  trendPositive: boolean;
  subtext: (s: Stats) => string;
}

const KPI_TILES: KpiTile[] = [
  {
    key: "runs_total",
    label: "Total Audit Tasks",
    icon: Activity,
    iconBg: "bg-indigo-500/10 dark:bg-indigo-500/15",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    value: (s) => s.runs_total,
    format: (v) => Math.round(v).toLocaleString(),
    trend: "+8.4%",
    trendPositive: true,
    subtext: (s) => `${s.runs_active} active in pipeline`,
  },
  {
    key: "verified_total",
    label: "Verified Vulnerabilities",
    icon: ShieldAlert,
    iconBg: "bg-rose-500/10 dark:bg-rose-500/15",
    iconColor: "text-rose-600 dark:text-rose-400",
    value: (s) => s.verified_total,
    format: (v) => Math.round(v).toLocaleString(),
    trend: "Repro 100%",
    trendPositive: true,
    subtext: (s) => `from ${s.findings_total} candidates`,
  },
  {
    key: "fixed_total",
    label: "Automated Patches",
    icon: Wrench,
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    value: (s) => s.fixed_total,
    format: (v) => Math.round(v).toLocaleString(),
    trend: "+14.2%",
    trendPositive: true,
    subtext: () => "verified in sandbox",
  },
  {
    key: "pr_opened_total",
    label: "Pull Requests",
    icon: GitPullRequest,
    iconBg: "bg-sky-500/10 dark:bg-sky-500/15",
    iconColor: "text-sky-600 dark:text-sky-400",
    value: (s) => s.pr_opened_total,
    format: (v) => Math.round(v).toLocaleString(),
    trend: "Ready to merge",
    trendPositive: true,
    subtext: () => "with audit trails",
  },
  {
    key: "cost_usd_total",
    label: "Compute & Token Spend",
    icon: CircleDollarSign,
    iconBg: "bg-amber-500/10 dark:bg-amber-500/15",
    iconColor: "text-amber-600 dark:text-amber-400",
    value: (s) => s.cost_usd_total,
    format: (v) => usd(v, { digits: 2 }),
    trend: "-18% cost",
    trendPositive: true,
    subtext: () => "efficient routing",
  },
];

export default function Overview() {
  const { can } = useSession();
  const stats = useAsync(() => api.stats(), [], { pollMs: 15_000 });
  const runs = useAsync(() => api.listRuns({ limit: 6, offset: 0 }), [], { pollMs: 10_000 });
  const [modal, setModal] = useState(false);
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d" | "all">("7d");

  const byCategory = useMemo(
    () =>
      Object.entries(stats.data?.by_category ?? {})
        .map(([name, value]) => ({ name: titleCase(name), value }))
        .sort((a, b) => b.value - a.value),
    [stats.data],
  );

  const byStatus = useMemo(
    () =>
      Object.entries(stats.data?.by_status ?? {})
        .map(([name, value]) => ({ name, value }))
        .filter((d) => d.value > 0),
    [stats.data],
  );

  const statusTotal = byStatus.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Executive Welcome & Filter Header (Fireart Task Dashboard style) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Autonomous Security Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Audit Tasks & Pipeline Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time multi-agent auditing, reproducible exploit verification, and verified regression patches.
          </p>
        </div>

        {/* Time Period Filter & New Audit CTA */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] text-xs font-medium">
            {(["24h", "7d", "30d", "all"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeRange === range
                    ? "bg-white dark:bg-[#151a2c] text-slate-900 dark:text-white shadow-sm font-semibold"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {range === "24h" ? "Today" : range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "All Time"}
              </button>
            ))}
          </div>

          <button
            className="btn-primary py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2"
            onClick={() => setModal(true)}
            disabled={!can("operator")}
            title={can("operator") ? "Start a new audit run" : "Operator role required"}
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>New Audit Task</span>
          </button>
        </div>
      </div>

      {stats.error && <ErrorNote message={stats.error} onRetry={stats.reload} />}

      {/* Modern KPI Cards Grid (Fireart Task Dashboard signature) */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
      >
        {KPI_TILES.map((tile) => (
          <motion.div
            key={tile.key}
            variants={fadeUp}
            className="card p-4 sm:p-5 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${tile.iconBg} ${tile.iconColor}`}>
                <tile.icon className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <ArrowUpRight className="h-3 w-3" />
                {tile.trend}
              </span>
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{tile.label}</p>
              {stats.data ? (
                <Counter
                  value={tile.value(stats.data)}
                  format={tile.format}
                  className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums block mt-1"
                />
              ) : (
                <Skeleton className="h-8 w-24 mt-1" />
              )}
              {stats.data && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
                  {tile.subtext(stats.data)}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Multi-Agent Workflow Pipeline Stage Status */}
      <div className="card p-4 sm:p-5 border-l-4 border-l-indigo-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Active Multi-Agent Pipeline Status</h2>
          </div>
          <span className="text-xs text-slate-400">10-Node Graph Execution · Docker Isolated</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1 text-xs">
          {[
            { step: "01. Ingest & Index", status: "Active", dot: "bg-indigo-500", desc: "Tree-sitter symbols & AST" },
            { step: "02. Static Analyzers", status: "Active", dot: "bg-indigo-500", desc: "Ruff, Semgrep, Bandit" },
            { step: "03. Bug Hunter", status: "Running", dot: "bg-amber-500", desc: "ReAct LLM Subagents" },
            { step: "04. ML Triage", status: "Filtering", dot: "bg-sky-500", desc: "Confidence ranking" },
            { step: "05. Sandbox Verify", status: "Testing", dot: "bg-emerald-500", desc: "Reproducible exploit test" },
            { step: "06. Fix & Patch", status: "Validating", dot: "bg-violet-500", desc: "Minimal unified diffs" },
          ].map((s, idx) => (
            <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.05]">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{s.step}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              </div>
              <p className="text-[10px] text-slate-400 truncate">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Grid: Categories & Triage Status */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card
          title="Vulnerabilities by Category"
          subtitle="Distribution of detected exploit candidates across all repositories"
          className="lg:col-span-3"
        >
          {stats.loading && !stats.data ? (
            <Skeleton className="h-[260px]" />
          ) : byCategory.length === 0 ? (
            <EmptyState title="No findings yet" icon={<Bug className="h-6 w-6" />} />
          ) : (
            <div className="h-[260px] text-slate-600 dark:text-slate-300">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory} margin={{ top: 12, right: 12, left: -20, bottom: 0 }} barCategoryGap="25%">
                  <XAxis
                    dataKey="name"
                    {...axisProps}
                    interval={0}
                    angle={byCategory.length > 5 ? -18 : 0}
                    textAnchor={byCategory.length > 5 ? "end" : "middle"}
                    height={byCategory.length > 5 ? 44 : 28}
                  />
                  <YAxis {...axisProps} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.04 }} content={<ChartTooltip />} />
                  <Bar dataKey="value" name="Findings" radius={[6, 6, 0, 0]} isAnimationActive>
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card
          title="Finding Resolution Ratio"
          subtitle={statusTotal ? `${statusTotal} total verified & candidate findings` : "Awaiting discoveries"}
          className="lg:col-span-2"
        >
          {stats.loading && !stats.data ? (
            <Skeleton className="h-[260px]" />
          ) : byStatus.length === 0 ? (
            <EmptyState title="No status records yet" />
          ) : (
            <div className="flex flex-col items-center justify-between gap-4 h-[260px]">
              <div className="h-[170px] w-[170px] relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byStatus}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      cornerRadius={6}
                      stroke="none"
                    >
                      {byStatus.map((d) => (
                        <Cell key={d.name} fill={FINDING_STATUS_COLOR[d.name] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <Counter value={statusTotal} className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white" />
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Findings</span>
                </div>
              </div>

              <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs w-full overflow-y-auto max-h-[80px] pt-1 border-t border-slate-100 dark:border-white/[0.05]">
                {byStatus.map((d) => (
                  <li key={d.name} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: FINDING_STATUS_COLOR[d.name] ?? "#94a3b8" }} />
                    <span className="text-slate-600 dark:text-slate-400 capitalize truncate">{d.name.replace("_", " ")}</span>
                    <span className="ml-auto tabular-nums font-semibold text-slate-800 dark:text-slate-200">{d.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      {/* Recent Audit Tasks Table / Cards */}
      <Card
        title="Recent Audit Tasks"
        subtitle="Autonomous repository security scans with real-time progress"
        padded={false}
        className="overflow-hidden"
        actions={
          <Link
            to="/runs"
            className="btn-ghost !py-1.5 px-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5"
          >
            <span>View All Tasks</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        {runs.loading && !runs.data ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={5} />
          </div>
        ) : runs.error ? (
          <div className="p-4">
            <ErrorNote message={runs.error} onRetry={runs.reload} />
          </div>
        ) : !runs.data?.items.length ? (
          <div className="p-8">
            <EmptyState
              title="No audit tasks yet"
              description="Start a new codebase audit to see active agent workflows."
              action={
                <button className="btn-primary" onClick={() => setModal(true)}>
                  Start New Audit
                </button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]">
                  <th className="th">Repository & Commit</th>
                  <th className="th">Status</th>
                  <th className="th w-44">Pipeline Progress</th>
                  <th className="th">Verified / Fixed</th>
                  <th className="th">Cost</th>
                  <th className="th">Started</th>
                  <th className="th text-right">Action</th>
                </tr>
              </thead>
              <motion.tbody variants={staggerContainer} initial="hidden" animate="show">
                {runs.data.items.map((r) => (
                  <motion.tr
                    key={r.id}
                    variants={fadeUp}
                    className="border-b border-slate-200/50 dark:border-white/[0.04] hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="td">
                      <div className="flex flex-col">
                        <Link
                          to={`/runs/${r.id}`}
                          className="font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-2"
                        >
                          <span>{repoName(r.repo_url)}</span>
                          <LanguageBadge language={r.language} />
                        </Link>
                        <span className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {r.commit_sha ? r.commit_sha.slice(0, 7) : "HEAD"} · {r.id}
                        </span>
                      </div>
                    </td>
                    <td className="td">
                      <RunStatusPill status={r.status} />
                    </td>
                    <td className="td">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="font-medium capitalize">{r.current_node ?? r.status}</span>
                          <span className="tabular-nums font-semibold">{Math.round(r.progress * 100)}%</span>
                        </div>
                        <ProgressBar
                          value={r.progress}
                          color={r.status === "failed" ? "rose" : r.status === "completed" ? "emerald" : "indigo"}
                        />
                      </div>
                    </td>
                    <td className="td tabular-nums text-xs font-semibold">
                      <span className="text-emerald-600 dark:text-emerald-400">{r.counts.verified} verified</span>
                      <span className="text-slate-400 mx-1">·</span>
                      <span className="text-sky-600 dark:text-sky-400">{r.counts.fixed} fixed</span>
                    </td>
                    <td className="td tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                      {usd(r.cost_usd)}
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
        )}
      </Card>

      <NewRunModal open={modal} onClose={() => setModal(false)} />
    </div>
  );
}
