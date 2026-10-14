import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import {
  Activity,
  BarChart3,
  FlaskConical,
  FolderGit2,
  LayoutDashboard,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import { useTheme } from "@/hooks/useTheme";
import { useHotkey } from "@/hooks/useHotkey";
import { Logo } from "./Logo";
import { NewRunModal } from "./NewRunModal";
import { pageVariants } from "./motion";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, badge: null },
  { to: "/runs", label: "Audit Tasks", icon: Activity, end: false, badge: "Active" },
  { to: "/bench", label: "Benchmarks", icon: BarChart3, end: false, badge: null },
  { to: "/settings", label: "Settings", icon: Settings, end: false, badge: null },
];

function HealthStatusBadge() {
  const { healthOk, health, mode } = useSession();
  const isHealthy = healthOk === true;
  return (
    <div className="flex items-center gap-2">
      <div
        className={clsx(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
          isHealthy
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        )}
        title={isHealthy ? `Connected to cluster · v${health?.version ?? "1.0"}` : "Simulated offline preview engine"}
      >
        <span className="relative flex h-2 w-2">
          {isHealthy && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />}
          <span className={clsx("relative inline-flex h-2 w-2 rounded-full", isHealthy ? "bg-emerald-500" : "bg-amber-500")} />
        </span>
        <span className="text-[11px] font-semibold">{isHealthy ? "Cluster Live" : "Demo Engine"}</span>
      </div>
      {mode === "mock" && (
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-medium border border-indigo-500/20">
          <FlaskConical className="h-3 w-3" /> Sandbox Mode
        </span>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const { me, can } = useSession();
  const location = useLocation();
  const nav = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newRunOpen, setNewRunOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  useHotkey(
    "/",
    useCallback(
      (e: KeyboardEvent) => {
        if (location.pathname !== "/runs") {
          e.preventDefault();
          nav("/runs", { state: { focusSearch: true } });
        }
      },
      [location.pathname, nav],
    ),
  );

  // Close mobile menu on page change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      nav(`/runs?q=${encodeURIComponent(searchVal.trim())}`);
    } else {
      nav("/runs");
    }
  };

  return (
    <div className="min-h-screen flex bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[80] btn-primary">
        Skip to content
      </a>

      {/* Desktop Left Sidebar (Fireart Task Management signature) */}
      <aside className="hidden lg:flex w-64 xl:w-72 flex-col fixed inset-y-0 left-0 z-30 bg-white/90 dark:bg-[#0e121e]/90 backdrop-blur-xl border-r border-slate-200/90 dark:border-white/[0.07] select-none">
        {/* Workspace Brand Header */}
        <div className="p-5 border-b border-slate-200/80 dark:border-white/[0.06]">
          <NavLink to="/" className="flex items-center gap-3 group" aria-label="Sentinel home">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-base">Sentinel</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  AI AUDIT
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px]">Security Operations</p>
            </div>
          </NavLink>

          {/* Quick Action: Start New Audit */}
          <button
            onClick={() => setNewRunOpen(true)}
            className="w-full mt-4 btn-primary py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-[0.98] transition-all"
            disabled={!can("operator")}
            title={can("operator") ? "Start an autonomous codebase audit" : "Operator permissions required"}
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>New Audit Task</span>
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-4 py-5 overflow-y-auto space-y-6">
          <div>
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Main Menu
            </p>
            <nav className="space-y-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                      isActive
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-semibold"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <item.icon
                          className={clsx(
                            "h-4 w-4 transition-colors",
                            isActive ? "text-white" : "text-slate-400 dark:text-slate-400 group-hover:text-indigo-500",
                          )}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={clsx(
                            "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Monitored Repositories & Workspaces */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Audited Targets
              </span>
              <FolderGit2 className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="space-y-1 text-xs">
              {[
                { name: "acme/payments-api", lang: "Python", dot: "bg-emerald-500" },
                { name: "northwind/inventory-svc", lang: "TypeScript", dot: "bg-sky-500" },
                { name: "contoso/scheduler", lang: "Python", dot: "bg-indigo-500" },
              ].map((repo) => (
                <button
                  key={repo.name}
                  onClick={() => nav(`/runs?q=${encodeURIComponent(repo.name)}`)}
                  className="w-full text-left flex items-center justify-between px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={clsx("h-1.5 w-1.5 rounded-full", repo.dot)} />
                    <span className="truncate font-medium">{repo.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{repo.lang}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Autonomous Agent Status Widget */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-violet-500/10 border border-indigo-500/15 dark:border-indigo-400/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Multi-Agent Engine</span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">READY</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              LangGraph ReAct hunters with isolated Docker sandbox verification.
            </p>
            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-indigo-500/10">
              <span>Sandboxed Verifier</span>
              <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300">Active</span>
            </div>
          </div>
        </div>

        {/* User Profile & Theme Switcher Footer */}
        <div className="p-4 border-t border-slate-200/80 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
              {me?.name ? me.name.slice(0, 2).toUpperCase() : "OP"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate text-slate-900 dark:text-white">
                {me?.name ?? "Security Analyst"}
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                {me?.role ?? "Operator"}
              </p>
            </div>
          </div>
          <button
            onClick={toggle}
            className="btn-icon btn-ghost p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 xl:pl-72">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-[#0a0d14]/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.06] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Mobile Sidebar Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden btn-icon btn-ghost p-2 text-slate-600 dark:text-slate-300"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Global Quick Search (Fireart style with / shortcut) */}
            <form onSubmit={handleHeaderSearch} className="relative w-full max-w-md hidden sm:block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search audits, repos, SHAs, or vulnerabilities..."
                className="w-full pl-9 pr-14 py-2 rounded-xl text-xs bg-slate-100/80 dark:bg-white/[0.04] border border-transparent focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-[#121624] placeholder:text-slate-400 transition-all outline-none"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 kbd text-[10px] pointer-events-none">
                /
              </kbd>
            </form>
          </div>

          {/* Header Actions & Status */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <HealthStatusBadge />

            {/* Header "+ New Audit" CTA (especially on mobile/tablets) */}
            <button
              onClick={() => setNewRunOpen(true)}
              className="btn-primary py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              disabled={!can("operator")}
              title="Start a new audit"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">New Audit</span>
            </button>

            {/* Theme switcher on mobile */}
            <button
              onClick={toggle}
              className="lg:hidden btn-icon btn-ghost p-2 text-slate-500"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main id="main" className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit">
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Quiet Modern Footer */}
        <footer className="px-6 py-4 border-t border-slate-200/60 dark:border-white/[0.04] text-xs text-slate-400 dark:text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-[1600px] w-full mx-auto">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Sentinel</span>
            <span>·</span>
            <span>Autonomous Multi-Agent Codebase Auditor</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Press <kbd className="kbd">/</kbd> to search</span>
            <span>·</span>
            <span>Isolated Sandbox Verified</span>
          </div>
        </footer>
      </div>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileMenu}
              className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#0e121e] border-r border-slate-200 dark:border-white/[0.08] shadow-2xl flex flex-col"
            >
              <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <Logo />
                  <span className="font-bold tracking-tight text-base">Sentinel</span>
                </div>
                <button onClick={closeMobileMenu} className="btn-icon btn-ghost p-1.5" aria-label="Close menu">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                <button
                  onClick={() => {
                    closeMobileMenu();
                    setNewRunOpen(true);
                  }}
                  className="w-full btn-primary py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold shadow-md shadow-indigo-500/20"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Audit Task</span>
                </button>

                <nav className="space-y-1">
                  {NAV.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={closeMobileMenu}
                      className={({ isActive }) =>
                        clsx(
                          "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
                          isActive
                            ? "bg-indigo-600 text-white font-semibold"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]",
                        )
                      }
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/20 text-white">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </nav>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
                <span className="text-xs text-slate-500">{me?.name ?? "Operator"}</span>
                <button onClick={toggle} className="btn-icon btn-ghost p-2" aria-label="Toggle theme">
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Global New Run Modal */}
      <NewRunModal open={newRunOpen} onClose={() => setNewRunOpen(false)} />
    </div>
  );
}
