// DESIGN: "鎏光机" 导演手册工业风暗色系
// Main layout: Dashboard (project list) ↔ Workflow (6-phase editor)
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectManager } from "@/contexts/ProjectManagerContext";
import Phase1 from "./phases/Phase1";
import Phase2 from "./phases/Phase2";
import Phase2b from "./phases/Phase2b";
import Phase3 from "./phases/Phase3";
import Phase4 from "./phases/Phase4";
import Phase5 from "./phases/Phase5";
import Phase6 from "./phases/Phase6";
import Dashboard from "./Dashboard";
import Landing from "./Landing";
import { useState, useEffect } from "react";
import { Menu, Clapperboard } from "lucide-react";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381754893/9BgyFdoC3HjLKXJmyAaqgB/hero-bg-aFre9kdGFYSWzCA6sTB4wa.webp";

const PHASE_MAP: Record<string, React.ReactNode> = {
  phase1: <Phase1 />,
  phase2: <Phase2 />,
  phase2b: <Phase2b />,
  phase3: <Phase3 />,
  phase4: <Phase4 />,
  phase5: <Phase5 />,
  phase6: <Phase6 />,
};

export default function Home() {
  const { activePhase } = useProject();
  const { activeProjectId } = useProjectManager();
  const [view, setView] = useState<"landing" | "dashboard" | "workflow">("landing");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // When active project changes (e.g. after create), auto-switch to workflow
  useEffect(() => {
    if (view === "workflow") {
      // stay in workflow when switching projects
    }
  }, [activeProjectId]);

  // Check URL hash for share link on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#share=")) {
      setView("workflow");
    }
  }, []);

  if (view === "landing") {
    return <Landing onEnter={() => setView("dashboard")} />;
  }

  if (view === "dashboard") {
    return <Dashboard onOpenProject={() => setView("workflow")} />;
  }

  return (
    <div className="min-h-screen flex" style={{ background: "oklch(0.13 0.005 240)" }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <Sidebar onBackToDashboard={() => setView("dashboard")} />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 lg:hidden"
              style={{ background: "oklch(0 0 0 / 0.6)" }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 z-40 lg:hidden"
            >
              <Sidebar onBackToDashboard={() => { setSidebarOpen(false); setView("dashboard"); }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar (mobile) */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b"
          style={{ background: "oklch(0.15 0.006 240)", borderColor: "oklch(0.25 0.008 240)" }}>
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded"
            style={{ color: "oklch(0.70 0.008 240)" }}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Clapperboard size={16} style={{ color: "oklch(0.75 0.17 65)" }} />
            <span className="text-sm font-bold" style={{ color: "oklch(0.88 0.005 60)", fontFamily: "'Space Grotesk', sans-serif" }}>
              鎏光机
            </span>
          </div>
          <div className="w-8" />
        </div>

        {/* Hero section (only on phase1) */}
        {activePhase === "phase1" && (
          <div className="relative overflow-hidden" style={{ height: "200px" }}>
            <img src={HERO_BG} alt="Film production" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to right, oklch(0.13 0.005 240 / 0.95) 0%, oklch(0.13 0.005 240 / 0.75) 60%, oklch(0.13 0.005 240 / 0.4) 100%)" }} />
            <div className="relative z-10 h-full flex flex-col justify-center px-8 lg:px-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px w-8" style={{ background: "oklch(0.75 0.17 65)" }} />
                <span className="text-xs tracking-widest uppercase" style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace" }}>
                  AI Film Workflow Tool
                </span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold leading-tight mb-2"
                style={{ color: "oklch(0.95 0.005 60)", fontFamily: "'Space Grotesk', sans-serif" }}>
                鎏光机<br />
                <span className="text-xl font-medium" style={{ color: "oklch(0.75 0.17 65)" }}>AI 影片工作流工具</span>
              </h1>
              <p className="text-sm max-w-md" style={{ color: "oklch(0.70 0.008 240)" }}>
                MJ → Nanobananapro → 即梦 Seedance 2.0 · 六阶段全流程引导
              </p>
            </div>
          </div>
        )}

        {/* Phase content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePhase}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {PHASE_MAP[activePhase]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-3 border-t flex items-center justify-between"
          style={{ borderColor: "oklch(0.22 0.006 240)", background: "oklch(0.12 0.005 240)" }}>
          <span className="text-[10px] tracking-widest uppercase" style={{ color: "oklch(0.35 0.008 240)", fontFamily: "'JetBrains Mono', monospace" }}>
            鎏光机 AI 影片工作流工具
          </span>
          <span className="text-[10px]" style={{ color: "oklch(0.35 0.008 240)", fontFamily: "'JetBrains Mono', monospace" }}>
            MJ → Nanobananapro → Seedance 2.0
          </span>
        </div>
      </div>
    </div>
  );
}
