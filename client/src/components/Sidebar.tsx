// DESIGN: "导演手册" 工业风暗色系
// Left sidebar: fixed workflow step navigator with film-counter style numbers
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/ProjectContext";
import { WORKFLOW_STEPS } from "@/lib/workflowData";
import { CheckCircle2, Circle, Film } from "lucide-react";

export default function Sidebar() {
  const { activePhase, setActivePhase, completedPhases, projectInfo, scriptAnalysis } = useProject();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-40"
      style={{ background: "oklch(0.12 0.005 240)", borderRight: "1px solid oklch(0.25 0.008 240)" }}>
      {/* Logo / Header */}
      <div className="px-6 py-5 border-b" style={{ borderColor: "oklch(0.25 0.008 240)" }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
            style={{ background: "oklch(0.75 0.17 65)", color: "oklch(0.1 0.005 240)", fontFamily: "'JetBrains Mono', monospace" }}>
            AI
          </div>
          <span className="text-xs tracking-widest uppercase font-medium"
            style={{ color: "oklch(0.55 0.01 240)", fontFamily: "'Space Grotesk', sans-serif" }}>
            Film Workflow
          </span>
        </div>
        <h1 className="text-sm font-semibold leading-tight"
          style={{ color: "oklch(0.92 0.005 60)", fontFamily: "'Space Grotesk', sans-serif" }}>
          AI 影片制作<br />工作流工具
        </h1>
      </div>

      {/* Steps */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <p className="text-xs px-3 mb-3 tracking-widest uppercase"
          style={{ color: "oklch(0.45 0.008 240)", fontFamily: "'JetBrains Mono', monospace" }}>
          制作阶段
        </p>
        <ul className="space-y-1">
          {WORKFLOW_STEPS.map((step) => {
            const isActive = activePhase === step.id;
            const isDone = completedPhases.has(step.id);
            return (
              <li key={step.id}>
                <button
                  onClick={() => setActivePhase(step.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded transition-all duration-200 group",
                    isActive
                      ? "text-[oklch(0.1_0.005_240)]"
                      : "hover:bg-[oklch(0.18_0.006_240)]"
                  )}
                  style={isActive ? {
                    background: "oklch(0.75 0.17 65)",
                  } : {}}
                >
                  <div className="flex items-center gap-3">
                    {/* Step number badge */}
                    <span className={cn(
                      "step-badge w-8 h-5 flex items-center justify-center rounded text-[10px] font-bold flex-shrink-0",
                      isActive
                        ? "bg-[oklch(0.1_0.005_240)] text-[oklch(0.75_0.17_65)]"
                        : isDone
                          ? "bg-[oklch(0.75_0.17_65)/20] text-[oklch(0.75_0.17_65)]"
                          : "bg-[oklch(0.22_0.006_240)] text-[oklch(0.55_0.01_240)]"
                    )}>
                      {step.number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "text-sm font-medium truncate",
                        isActive ? "text-[oklch(0.1_0.005_240)]" : isDone ? "text-[oklch(0.85_0.005_60)]" : "text-[oklch(0.70_0.008_240)]"
                      )} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {step.title}
                      </div>
                      <div className={cn(
                        "text-[10px] truncate",
                        isActive ? "text-[oklch(0.2_0.005_240)]" : "text-[oklch(0.45_0.008_240)]"
                      )} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {step.subtitle}
                      </div>
                    </div>
                    {isDone && !isActive && (
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.75 0.17 65)" }} />
                    )}
                    {!isDone && !isActive && (
                      <Circle className="w-3.5 h-3.5 flex-shrink-0 opacity-20" style={{ color: "oklch(0.55 0.01 240)" }} />
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Project info */}
      {(projectInfo.title || scriptAnalysis.episodes.length > 0) && (
        <div className="px-4 py-3 border-t" style={{ borderColor: "oklch(0.25 0.008 240)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Film className="w-3 h-3 flex-shrink-0" style={{ color: "oklch(0.75 0.17 65)" }} />
            <span className="text-xs font-semibold truncate" style={{ color: "oklch(0.85 0.005 60)", fontFamily: "'Space Grotesk', sans-serif" }}>
              {projectInfo.title || "未命名项目"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px]" style={{ color: "oklch(0.45 0.008 240)", fontFamily: "'JetBrains Mono', monospace" }}>
            {projectInfo.type && <span className="px-1.5 py-0.5 rounded" style={{ background: "oklch(0.22 0.006 240)" }}>{projectInfo.type}</span>}
            {scriptAnalysis.episodes.length > 0 && (
              <span className="px-1.5 py-0.5 rounded" style={{ background: "oklch(0.22 0.006 240)" }}>
                {scriptAnalysis.episodes.length} 集
              </span>
            )}
          </div>
        </div>
      )}

      {/* Progress bar at bottom */}
      <div className="px-5 py-4 border-t" style={{ borderColor: "oklch(0.25 0.008 240)" }}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] tracking-widest uppercase" style={{ color: "oklch(0.45 0.008 240)", fontFamily: "'JetBrains Mono', monospace" }}>
            进度
          </span>
          <span className="text-[10px] font-bold" style={{ color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace" }}>
            {completedPhases.size}/{WORKFLOW_STEPS.length}
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: "oklch(0.22 0.006 240)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(completedPhases.size / WORKFLOW_STEPS.length) * 100}%`,
              background: "oklch(0.75 0.17 65)",
            }}
          />
        </div>
      </div>
    </aside>
  );
}
