// DESIGN: "鎏光机" 导演手册工业风暗色系 — Landing Page
// Layout: Full-page vertical scroll with cinematic sections
// Colors: bg oklch(0.11), amber oklch(0.75 0.17 65), steel oklch(0.22 0.006 240)
// Font: Space Grotesk headings, JetBrains Mono labels, Noto Sans SC body

import { motion } from "framer-motion";
import { Clapperboard, ChevronRight, ArrowRight, Film, Layers, Wand2, Clapperboard as Clap, Cpu, Music, CheckCircle2, Star } from "lucide-react";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381754893/9BgyFdoC3HjLKXJmyAaqgB/landing-hero-4sV3bxk8aqsm9qMnnuMVrt.webp";
const IMG_SCRIPT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381754893/9BgyFdoC3HjLKXJmyAaqgB/landing-feature-script-nC3NBkYd6NhgywYY3gLWgY.webp";
const IMG_ASSET = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381754893/9BgyFdoC3HjLKXJmyAaqgB/landing-feature-asset-cnQDBnGrhBsmXKCbxFcH2G.webp";
const IMG_SHOT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381754893/9BgyFdoC3HjLKXJmyAaqgB/landing-feature-shot-V56ZhV2uHqcfJJLfPeBPq5.webp";
const IMG_PROMPT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663381754893/9BgyFdoC3HjLKXJmyAaqgB/landing-feature-prompt-TpBz8DFunqsDjyWkCCnXVx.webp";

const WORKFLOW_STEPS = [
  { num: "01", title: "项目定义", desc: "上传剧本，AI 自动解析分集、识别人物场景道具，支持 .txt/.md/.docx/.pdf/.fountain 五种格式", icon: <Film size={18} /> },
  { num: "02", title: "核心资产设计", desc: "生成 MJ7 风格资产提示词，固定 Nanobananapro 三视图模板，按集分类管理人物、场景、道具", icon: <Layers size={18} /> },
  { num: "03", title: "分镜设计", desc: "AI 按集数时长自动生成分镜，可视化情绪曲线时间轴，灵活调整镜头类型与节奏", icon: <Clap size={18} /> },
  { num: "04", title: "提示词撰写", desc: "按集生成 Seedance 2.0 多镜头视频片段提示词，含旁白 VO 与音效 SFX，一键复制", icon: <Wand2 size={18} /> },
  { num: "05", title: "生成与后期", desc: "MJ → Nanobananapro → 即梦 Seedance 全流程指引，角色一致性技巧，转场建议", icon: <Cpu size={18} /> },
  { num: "06", title: "参考素材库", desc: "情绪关键词、光影描述词、音效标签一键复制，快速调用创作灵感", icon: <Music size={18} /> },
];

const FEATURES = [
  {
    img: IMG_SCRIPT,
    tag: "智能解析",
    title: "剧本一键拆解",
    desc: "上传任意格式剧本，AI 自动识别集数、人物关系、核心场景与关键道具，为后续所有阶段建立统一的数据底座。",
    points: ["支持 5 种文件格式", "自动识别人物对话", "按集数智能分组"],
  },
  {
    img: IMG_ASSET,
    tag: "资产管理",
    title: "全局资产提示词库",
    desc: "角色三视图、场景多角度图提示词模板固定在最顶部，全局人物提示词一次生成、全集复用，分集资产按类别清晰罗列。",
    points: ["Nanobananapro 固定模板", "MJ7 风格提示词", "人物/场景/道具分类"],
  },
  {
    img: IMG_SHOT,
    tag: "分镜设计",
    title: "AI 自动分镜 + 情绪曲线",
    desc: "输入集数时长，AI 按 25 镜/分钟自动生成完整分镜表，SVG 情绪曲线时间轴直观展示全集节奏，辅助把控叙事张力。",
    points: ["自动生成分镜表", "情绪曲线可视化", "镜头类型智能配比"],
  },
  {
    img: IMG_PROMPT,
    tag: "提示词工程",
    title: "多镜头视频提示词生成",
    desc: "将分镜自动组装为 2-5 镜头的视频片段提示词，内嵌旁白与音效描述，符合 Seedance 2.0 全能参考模式规范，无 @ 无版权引用。",
    points: ["2-5 镜头一段", "VO + SFX 内嵌", "一键复制全集"],
  },
];

const TOOLS = [
  { name: "Midjourney 7", role: "风格参考 & 资产提示词", color: "oklch(0.65 0.15 280)" },
  { name: "Nanobananapro", role: "高精度角色三视图 & 场景图", color: "oklch(0.75 0.17 65)" },
  { name: "即梦 Seedance 2.0", role: "多镜头视频生成（全能参考模式）", color: "oklch(0.65 0.18 160)" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

interface LandingProps {
  onEnter: () => void;
}

export default function Landing({ onEnter }: LandingProps) {
  return (
    <div style={{ background: "oklch(0.11 0.005 240)", color: "oklch(0.88 0.005 60)", fontFamily: "'Noto Sans SC', 'Space Grotesk', sans-serif", overflowX: "hidden" }}>

      {/* ── NAV ── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, borderBottom: "1px solid oklch(0.20 0.006 240 / 0.8)", backdropFilter: "blur(12px)", background: "oklch(0.11 0.005 240 / 0.85)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "oklch(0.75 0.17 65)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clapperboard size={16} style={{ color: "oklch(0.1 0.005 240)" }} />
            </div>
            <div>
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", fontFamily: "'Space Grotesk', sans-serif", color: "oklch(0.92 0.005 60)" }}>鎏光机</span>
              <span style={{ fontSize: 10, marginLeft: 8, color: "oklch(0.50 0.01 240)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>AI FILM WORKFLOW</span>
            </div>
          </div>
          <button
            onClick={onEnter}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "oklch(0.75 0.17 65)", color: "oklch(0.1 0.005 240)", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", transition: "opacity 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            进入工具 <ChevronRight size={14} />
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", paddingTop: 60 }}>
        <img src={HERO_BG} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
        {/* Dark gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, oklch(0.11 0.005 240 / 0.97) 0%, oklch(0.11 0.005 240 / 0.85) 45%, oklch(0.11 0.005 240 / 0.5) 100%)" }} />
        {/* Bottom fade */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 200, background: "linear-gradient(to bottom, transparent, oklch(0.11 0.005 240))" }} />

        <div style={{ position: "relative", zIndex: 10, maxWidth: 1200, margin: "0 auto", padding: "0 2rem", width: "100%" }}>
          <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.12 } } }}>
            {/* Tag line */}
            <motion.div variants={fadeUp} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <div style={{ height: 1, width: 40, background: "oklch(0.75 0.17 65)" }} />
              <span style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace" }}>
                AI Film Production Workflow
              </span>
            </motion.div>

            {/* Main heading */}
            <motion.h1 variants={fadeUp} style={{ fontSize: "clamp(3rem, 7vw, 6rem)", fontWeight: 800, lineHeight: 1.0, letterSpacing: "-0.03em", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 8 }}>
              <span style={{ color: "oklch(0.95 0.005 60)" }}>鎏</span>
              <span style={{ color: "oklch(0.75 0.17 65)" }}>光</span>
              <span style={{ color: "oklch(0.95 0.005 60)" }}>机</span>
            </motion.h1>
            <motion.h2 variants={fadeUp} style={{ fontSize: "clamp(1.2rem, 3vw, 2.2rem)", fontWeight: 500, color: "oklch(0.72 0.008 240)", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 28, letterSpacing: "-0.01em" }}>
              AI 影片制作全流程工作流工具
            </motion.h2>

            {/* Description */}
            <motion.p variants={fadeUp} style={{ fontSize: 16, lineHeight: 1.8, color: "oklch(0.65 0.01 240)", maxWidth: 520, marginBottom: 40 }}>
              从剧本上传到视频生成，六阶段全流程引导。<br />
              MJ 7 → Nanobananapro → 即梦 Seedance 2.0，<br />
              让每一帧都精准落地。
            </motion.p>

            {/* CTA buttons */}
            <motion.div variants={fadeUp} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={onEnter}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "oklch(0.75 0.17 65)", color: "oklch(0.1 0.005 240)", border: "none", borderRadius: 10, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", transition: "transform 0.2s, opacity 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
              >
                立即开始创作 <ArrowRight size={16} />
              </button>
              <button
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", color: "oklch(0.78 0.008 240)", border: "1px solid oklch(0.30 0.008 240)", borderRadius: 10, padding: "14px 28px", fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", transition: "border-color 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "oklch(0.75 0.17 65 / 0.5)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "oklch(0.30 0.008 240)"; }}
              >
                了解功能
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div variants={fadeUp} style={{ display: "flex", gap: 32, marginTop: 56, paddingTop: 32, borderTop: "1px solid oklch(0.22 0.006 240 / 0.5)", flexWrap: "wrap" }}>
              {[
                { val: "6", label: "制作阶段" },
                { val: "5+", label: "剧本格式" },
                { val: "3", label: "AI 工具链" },
                { val: "∞", label: "项目管理" },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: 12, color: "oklch(0.55 0.01 240)", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── WORKFLOW STEPS ── */}
      <section style={{ padding: "100px 0", background: "oklch(0.11 0.005 240)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2rem" }}>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
            <motion.div variants={fadeUp} style={{ marginBottom: 60 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ height: 1, width: 32, background: "oklch(0.75 0.17 65)" }} />
                <span style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace" }}>Six-Phase Workflow</span>
              </div>
              <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 700, letterSpacing: "-0.02em", fontFamily: "'Space Grotesk', sans-serif", color: "oklch(0.92 0.005 60)", marginBottom: 12 }}>
                六阶段全流程引导
              </h2>
              <p style={{ fontSize: 15, color: "oklch(0.60 0.01 240)", maxWidth: 480 }}>
                从创意到成片，每个阶段都有清晰的操作路径和 AI 辅助工具，让创作者专注于内容本身。
              </p>
            </motion.div>

            {/* Steps grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
              {WORKFLOW_STEPS.map((step, i) => (
                <motion.div key={step.num} variants={fadeUp}
                  style={{ background: "oklch(0.14 0.006 240)", border: "1px solid oklch(0.22 0.006 240)", borderRadius: 14, padding: "24px", position: "relative", overflow: "hidden", transition: "border-color 0.2s, transform 0.2s" }}
                  whileHover={{ y: -4 }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "oklch(0.75 0.17 65 / 0.4)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "oklch(0.22 0.006 240)")}
                >
                  {/* Number watermark */}
                  <div style={{ position: "absolute", right: 16, top: 12, fontSize: 48, fontWeight: 900, color: "oklch(0.75 0.17 65 / 0.06)", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, userSelect: "none" }}>
                    {step.num}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, background: "oklch(0.75 0.17 65 / 0.12)", border: "1px solid oklch(0.75 0.17 65 / 0.25)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "oklch(0.75 0.17 65)", flexShrink: 0 }}>
                      {step.icon}
                    </div>
                    <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "oklch(0.75 0.17 65)", letterSpacing: "0.1em" }}>PHASE {step.num}</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "oklch(0.90 0.005 60)", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 8 }}>{step.title}</h3>
                  <p style={{ fontSize: 13, color: "oklch(0.58 0.01 240)", lineHeight: 1.7 }}>{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: "100px 0", background: "oklch(0.125 0.005 240)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2rem" }}>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} style={{ marginBottom: 60 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ height: 1, width: 32, background: "oklch(0.75 0.17 65)" }} />
              <span style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace" }}>Core Features</span>
            </div>
            <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 700, letterSpacing: "-0.02em", fontFamily: "'Space Grotesk', sans-serif", color: "oklch(0.92 0.005 60)" }}>
              核心功能
            </h2>
          </motion.div>

          <div style={{ display: "flex", flexDirection: "column", gap: 80 }}>
            {FEATURES.map((feat, i) => (
              <motion.div key={i}
                initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
                variants={{ show: { transition: { staggerChildren: 0.15 } } }}
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}
              >
                {/* Image — alternating sides */}
                <motion.div variants={fadeUp} style={{ order: i % 2 === 1 ? 2 : 1 }}>
                  <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid oklch(0.22 0.006 240)", position: "relative", aspectRatio: "1/1" }}>
                    <img src={feat.img} alt={feat.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, oklch(0.11 0.005 240 / 0.3) 0%, transparent 60%)" }} />
                    {/* Tag */}
                    <div style={{ position: "absolute", top: 16, left: 16, background: "oklch(0.75 0.17 65 / 0.15)", border: "1px solid oklch(0.75 0.17 65 / 0.4)", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace", backdropFilter: "blur(8px)" }}>
                      {feat.tag}
                    </div>
                  </div>
                </motion.div>

                {/* Text */}
                <motion.div variants={fadeUp} style={{ order: i % 2 === 1 ? 1 : 2 }}>
                  <h3 style={{ fontSize: "clamp(1.4rem, 2.5vw, 2rem)", fontWeight: 700, color: "oklch(0.92 0.005 60)", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 16, letterSpacing: "-0.02em" }}>
                    {feat.title}
                  </h3>
                  <p style={{ fontSize: 15, color: "oklch(0.62 0.01 240)", lineHeight: 1.8, marginBottom: 24 }}>
                    {feat.desc}
                  </p>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                    {feat.points.map(pt => (
                      <li key={pt} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "oklch(0.75 0.008 240)" }}>
                        <CheckCircle2 size={15} style={{ color: "oklch(0.75 0.17 65)", flexShrink: 0 }} />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOOL CHAIN ── */}
      <section style={{ padding: "100px 0", background: "oklch(0.11 0.005 240)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2rem" }}>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={{ show: { transition: { staggerChildren: 0.1 } } }}>
            <motion.div variants={fadeUp} style={{ textAlign: "center", marginBottom: 60 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ height: 1, width: 32, background: "oklch(0.75 0.17 65)" }} />
                <span style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace" }}>AI Tool Chain</span>
                <div style={{ height: 1, width: 32, background: "oklch(0.75 0.17 65)" }} />
              </div>
              <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 700, letterSpacing: "-0.02em", fontFamily: "'Space Grotesk', sans-serif", color: "oklch(0.92 0.005 60)", marginBottom: 12 }}>
                三工具黄金链路
              </h2>
              <p style={{ fontSize: 15, color: "oklch(0.60 0.01 240)", maxWidth: 480, margin: "0 auto" }}>
                精心设计的工具协作流程，每个工具各司其职，发挥最大效能。
              </p>
            </motion.div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, flexWrap: "wrap" }}>
              {TOOLS.map((tool, i) => (
                <motion.div key={tool.name} variants={fadeUp} style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ background: "oklch(0.14 0.006 240)", border: `1px solid ${tool.color}40`, borderRadius: 16, padding: "28px 32px", textAlign: "center", minWidth: 200 }}>
                    <div style={{ width: 48, height: 48, background: `${tool.color}18`, border: `1px solid ${tool.color}40`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 20, fontWeight: 900, color: tool.color, fontFamily: "'JetBrains Mono', monospace" }}>
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "oklch(0.90 0.005 60)", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 6 }}>{tool.name}</div>
                    <div style={{ fontSize: 12, color: "oklch(0.58 0.01 240)", lineHeight: 1.5 }}>{tool.role}</div>
                  </div>
                  {i < TOOLS.length - 1 && (
                    <div style={{ display: "flex", alignItems: "center", padding: "0 12px" }}>
                      <ArrowRight size={20} style={{ color: "oklch(0.75 0.17 65 / 0.5)" }} />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "120px 0", background: "oklch(0.125 0.005 240)", position: "relative", overflow: "hidden" }}>
        {/* Ambient glow */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 600, height: 300, background: "oklch(0.75 0.17 65 / 0.06)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 2rem", textAlign: "center", position: "relative", zIndex: 1 }}>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={{ show: { transition: { staggerChildren: 0.12 } } }}>
            <motion.div variants={fadeUp} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "oklch(0.75 0.17 65 / 0.1)", border: "1px solid oklch(0.75 0.17 65 / 0.3)", borderRadius: 20, padding: "6px 16px", marginBottom: 24 }}>
              <Star size={12} style={{ color: "oklch(0.75 0.17 65)" }} />
              <span style={{ fontSize: 12, color: "oklch(0.75 0.17 65)", fontFamily: "'JetBrains Mono', monospace" }}>免费使用 · 无需注册</span>
            </motion.div>
            <motion.h2 variants={fadeUp} style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, letterSpacing: "-0.03em", fontFamily: "'Space Grotesk', sans-serif", color: "oklch(0.92 0.005 60)", marginBottom: 16, lineHeight: 1.1 }}>
              开始你的<br />
              <span style={{ color: "oklch(0.75 0.17 65)" }}>AI 影片创作</span>
            </motion.h2>
            <motion.p variants={fadeUp} style={{ fontSize: 16, color: "oklch(0.60 0.01 240)", marginBottom: 40, lineHeight: 1.8 }}>
              上传剧本，让 AI 帮你规划从资产设计到视频生成的每一步。
            </motion.p>
            <motion.div variants={fadeUp}>
              <button
                onClick={onEnter}
                style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "oklch(0.75 0.17 65)", color: "oklch(0.1 0.005 240)", border: "none", borderRadius: 12, padding: "16px 36px", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", transition: "transform 0.2s, box-shadow 0.2s", boxShadow: "0 0 40px oklch(0.75 0.17 65 / 0.25)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 40px oklch(0.75 0.17 65 / 0.4)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 40px oklch(0.75 0.17 65 / 0.25)"; }}
              >
                <Clapperboard size={18} /> 进入鎏光机工作台
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid oklch(0.18 0.006 240)", padding: "28px 2rem", background: "oklch(0.11 0.005 240)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, background: "oklch(0.75 0.17 65)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clapperboard size={12} style={{ color: "oklch(0.1 0.005 240)" }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "oklch(0.70 0.008 240)", fontFamily: "'Space Grotesk', sans-serif" }}>鎏光机 AI 影片工作流工具</span>
          </div>
          <span style={{ fontSize: 11, color: "oklch(0.40 0.008 240)", fontFamily: "'JetBrains Mono', monospace" }}>
            MJ 7 → Nanobananapro → Seedance 2.0
          </span>
        </div>
      </footer>
    </div>
  );
}
