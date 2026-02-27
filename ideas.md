# 设计方案探索

## 方案一：「导演手册」工业风暗色系
<response>
<text>
**Design Movement**: 工业极简主义 + 电影制作工业美学
**Core Principles**:
1. 暗色底+高对比度文字，模拟专业剪辑软件（DaVinci/Premiere）的视觉语言
2. 左侧固定导航栏（流程步骤），右侧内容区，类似专业工具的工作台布局
3. 橙色/琥珀色作为强调色，呼应胶片、灯光的暖色调
4. 大量留白与精准的网格对齐，体现专业感

**Color Philosophy**: 深炭灰背景（#1a1a1a）+ 橙琥珀强调（#F59E0B）+ 浅灰文字（#E5E5E5）。橙色来自胶片灯光与摄影棚氛围，传递创作热情与专业感。

**Layout Paradigm**: 左侧固定步骤导航（6个阶段），右侧内容区域分上下两部分——上方为当前阶段说明，下方为可交互的表单/工具区。非居中，强调工作台感。

**Signature Elements**:
1. 胶片帧计数器风格的步骤编号（01/02/03...）
2. 橙色进度条贯穿顶部，实时显示项目完成度
3. 代码块风格的提示词输出区（深色背景+等宽字体）

**Interaction Philosophy**: 每步完成后有明确的"锁定"动画，已完成步骤变为半透明，当前步骤高亮，未来步骤灰显。提示词一键复制。

**Animation**: 步骤切换时内容区从右侧滑入（300ms ease-out），完成标记时有橙色光晕扩散效果。

**Typography System**: 标题用 Space Grotesk（几何无衬线，工业感），正文用 Inter，提示词输出用 JetBrains Mono（等宽）。
</text>
<probability>0.08</probability>
</response>

## 方案二：「创作手稿」纸质温暖风
<response>
<text>
**Design Movement**: 新极简主义 + 手工质感
**Core Principles**:
1. 米白色/奶油色背景，模拟创意手稿/笔记本质感
2. 竖向时间线布局，每个阶段像一张卡片翻开
3. 深墨绿色作为主色，传递沉稳与专业
4. 手写风格装饰元素（虚线、手绘箭头）

**Color Philosophy**: 奶油白（#FAFAF7）背景 + 深墨绿（#1B4332）主色 + 暖金（#D97706）强调。像一本精心设计的创作日志。

**Layout Paradigm**: 单列竖向滚动，每个阶段是一张可展开的"卡片"，卡片之间有手绘风格的连接线。顶部固定进度导航。

**Signature Elements**:
1. 每个阶段卡片左侧有彩色竖条（不同阶段不同颜色）
2. 纸张纹理背景（subtle noise）
3. 手写体标注与装饰性箭头

**Interaction Philosophy**: 点击阶段卡片展开/收起（accordion），填写完成后卡片右上角出现绿色勾选印章效果。

**Animation**: 卡片展开时有轻微的纸张翻动感（transform + shadow变化），完成时有印章盖下的弹跳动画。

**Typography System**: 标题用 Playfair Display（优雅衬线），正文用 Source Han Sans，提示词用 Fira Code。
</text>
<probability>0.07</probability>
</response>

## 方案三：「控制台」深空科技风
<response>
<text>
**Design Movement**: 新未来主义 + 深空科技美学
**Core Principles**:
1. 深海蓝/深空黑背景，青色/电光蓝强调色，呼应AI与数字创作
2. 顶部横向步骤导航（像太空任务阶段），内容区分左右两栏
3. 玻璃拟态卡片（glassmorphism），半透明磨砂质感
4. 数据可视化元素（进度环、状态指示灯）

**Color Philosophy**: 深空黑（#0D1117）背景 + 电光青（#00D4FF）强调 + 星光白（#F0F6FF）文字。传递AI技术感与未来感，与"AI影片制作"主题高度契合。

**Layout Paradigm**: 顶部横向阶段导航（带连接线），下方左侧为阶段详情面板（40%宽），右侧为实时预览/提示词生成区（60%宽）。类似太空任务控制台。

**Signature Elements**:
1. 顶部阶段连接线（完成段变为亮青色流光动画）
2. 玻璃拟态卡片（backdrop-blur + 半透明边框）
3. 打字机效果的提示词实时生成动画

**Interaction Philosophy**: 左侧填写表单，右侧实时生成对应提示词预览，所见即所得。提示词区域有"复制"和"导出"按钮。

**Animation**: 阶段切换时有扫描线过渡效果，提示词生成时有逐字打印动画（typewriter effect），完成时有粒子扩散庆祝效果。

**Typography System**: 标题用 Orbitron（科技感几何字体），副标题用 Exo 2，正文用 Noto Sans SC，提示词用 Source Code Pro。
</text>
<probability>0.09</probability>
</response>

## 选定方案

**选定：方案一「导演手册」工业风暗色系**

理由：与AI影片制作的专业工具定位最契合，暗色系减少视觉疲劳（用户会长时间使用），橙色强调色与电影/摄影美学高度一致，工作台布局最适合多步骤工作流工具。
