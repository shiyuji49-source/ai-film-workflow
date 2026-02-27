# 鎏光机 AI 影片工作流工具 — TODO

## 已完成功能

- [x] 全栈项目搭建（React + TypeScript + Vite + tRPC + Gemini API）
- [x] 品牌设计：「鎏光机」工业风暗色系（炭灰 + 琥珀橙）
- [x] 营销落地页（Landing Page）：Hero + 工作流展示 + CTA
- [x] 多项目管理 Dashboard（新建/复制/删除/导出/分享/导入）
- [x] localStorage 持久化 + 迁移逻辑
- [x] 剧本上传：支持 .txt/.md/.fountain/.docx/.pdf 五种格式
- [x] 两级风格体系（大类 2D/3D/CG/真人 + 可选小类）
- [x] Phase1：剧本上传 + Gemini AI 解析 + 风格选择
- [x] Phase2：人物与机甲资产（MJ7 竖版 2:3 参考图提示词）
- [x] Phase2b：场景与道具资产（按集分类，MJ7 横版 16:9 + 1:1）
- [x] Phase3：AI 自动分镜生成（按集时长 × 25 镜头）+ 情绪曲线可视化
- [x] Phase4：Seedance 2.0 多镜头中文视频提示词生成（含 VO/SFX）
- [x] Phase5：生成与后期操作指南
- [x] Phase6：参考素材库（情绪光影关键词）
- [x] Sidebar 导航 + 返回项目管理入口
- [x] 修复 TypeScript 错误：addShotsFromAI 方法添加到 ProjectContext
- [x] 修复 Phase3 中 characters 引用错误
- [x] 移除 Phase4 中未使用的 STYLE_TAGS 导入

## 已修复的错误

- [x] 修复 Gemini API 输出截断导致 JSON 解析失败（Unterminated string in JSON）：将 maxOutputTokens 从 8192 提升至 65536，添加 finishReason=MAX_TOKENS 检测，限制分镜生成每次最多 60 个镜头

## 待完成功能

- [ ] Phase1 剧本解析进度条（实时步骤显示）
- [ ] Phase2/Phase2b「重新生成全部」按钮（风格变更后批量刷新）
- [ ] 分镜导出功能（PDF/Markdown 格式）
- [ ] 视频提示词批量导出功能
- [x] 分镜生成严格遵循原剧本：旁白/台词/情节不得改动，画面描述只能在原剧本基础上补充细节
