# Obsidian Plugins

马自立自用的 Obsidian 插件，装在主库「马自立」的 `.obsidian/plugins/` 下。大部分是自己从零写的，另外几个是改过的社区插件。

插件代码由 `sync.sh` 从库里同步，不要直接改插件目录里的文件。README 也是 `sync.sh` 生成的：上面这段介绍改 `README.intro.md`，下面清单的顺序和分组改 `order.txt`。

## 重点插件

### 日程与任务

- **螺旋日程**（[`nautilus-spiral`](nautilus-spiral)）：仿 Roam 的 Nautilus，把今天日记里的事件和待办画成一圈螺旋，没做完的任务从「现在」往后流，带容量条，一眼看出今天还排不排得下。只读日记，日记可以在 Bike 里写。
- **任务提醒**（[`nautilus-notify`](nautilus-notify)）：螺旋日程的搭档，用 macOS 通知横幅提醒：快开始的事件、过点没做的待办、做太久的 DOING、排不下的容量预警、下一件该做什么、今日简报和收尾。
- **Done To Top**（[`done-to-top`](done-to-top)）+ **日记整理**（[`journal-tidy`](journal-tidy)）：顶格任务按 DONE / DOING / TODO 分区归位，写着「明天 / 后天」的整块搬到那天的日记，光标所在块也能用 `/明天` 直接发送到明天的日记；日记整理再把日记里的问句汇总起来，交给本机 Claude 联网查证后写上回答。

### 知识库与写作

- **第二大脑**（[`second-brain`](second-brain)）：每日回顾（那年今日 / 随机旧块 / 孤岛笔记）；写作模式按光标所在段落实时找库里意思相近的块（本机 Ollama 向量 + BM25 混合）；每周生成库周报。
- **Backlinks and Export**（[`backlink-defaults`](backlink-defaults)）：反链与导出增强。反链面板按关系紧密度排页面，日记按日期分月 / 分年折叠，命中块带 Roam 式面包屑；导出 PDF 时可以附上「链接到当前文件」的内容，并选字体、强调色。
- **LLM Wiki**（[`llm-wiki`](llm-wiki)）：左侧栏的 Wiki 面板，按主题列页面、提示哪些新笔记还没摄入，一键让本机 Claude 摄入或回答问题。
- **Outline Block**（[`outline-block`](outline-block)）：⌘⌥L 把一段长文整理成层级列表并加双链，层级按反链面板的逻辑来定；先预览再替换。
- **块引用增强**（[`block-ref-plus`](block-ref-plus)）：仿思源，`[[页#^id]]` 显示被引用块的当前内容，被引用的块旁边显示引用次数。

### 界面与操作

- **Chrome Tab Groups**（[`chrome-tab-groups`](chrome-tab-groups)）：照 Chrome 做的标签页分组：命名、颜色、折叠、拖色块移动整组、移至新窗口，加上 Chrome 的右键菜单。
- **书签图标**（[`bookmark-icons`](bookmark-icons)）：书签面板里每个看板换成各自的彩色图标，不再是一排一样的文件图标；笔记属性 `icon` / `icon-color` 可以自己指定。
- **Palette Enhancements**（[`palette-split-open`](palette-split-open)）：Better Command Palette 文件搜索增强：⌘⌥↵ 右侧拆分打开；文件名搜不到时自动搜正文；Tab 在文件名结果下面再加一层全文搜索，再按一次打开 Obsidian 全局搜索。

### 改得最多的社区插件

- **Telegram Inbox（自用）**（[`telegram-inbox-local`](telegram-inbox-local)）：发给 Telegram 机器人的消息记进日记。自用补丁：时间按消息发出的时刻记，`done 写稿` 直接把今天没做完的那条改成 DONE，和螺旋日程、Done To Top 配合。
- **SuperTags（自用）**（[`supertags-local`](supertags-local)）：Tana 式 supertag。改写了处理流程：标签按边界匹配、行内 / 子项字段写进新页、同名笔记不重复建、Bike 开着日记时等它存完再处理。

## 全部插件

### 自己做的

| 插件 | 版本 | 说明 |
|---|---|---|
| **螺旋日程** ([`nautilus-spiral`](nautilus-spiral)) | 0.1.0 | 仿 Roam 的 Nautilus：把今天日记里的事件和待办画成螺旋日程，未完成的任务从「现在」往后流，带容量条。只读日记不写日记，日记可以在 Bike 里写。 |
| **第二大脑（自用）** ([`second-brain`](second-brain)) | 0.2.0 | 每日回顾（那年今日 / 随机旧块 / 孤岛笔记）、写作模式（相关笔记 + Claudian）、库周报。 |
| **Backlinks and Export** ([`backlink-defaults`](backlink-defaults)) | 0.1.0 | 反链与导出增强。反链面板：页面按关系紧密度在前（互链 > 属性链接 > 提及次数），日记按日期在后、按月 / 按年折叠，命中块带 Roam 式面包屑，未链接提及默认折叠，「转为链接」后不打断阅读位置。导出 PDF：可附上「链接到当前文件」的内容，可选字体、字号、强调色和精致排版。 |
| **Chrome Tab Groups** ([`chrome-tab-groups`](chrome-tab-groups)) | 1.0.0 | 仿 Chrome 的标签页管理：标签页分组（命名、颜色、折叠、拖色块移动整组、移至新窗口）、右键菜单（在右侧新建、向新拆分视图添加、添加到组、复制标签页）、搜索标签页。 |
| **LLM Wiki** ([`llm-wiki`](llm-wiki)) | 0.1.0 | 左侧栏的 Wiki 面板：按主题列出 Wiki/ 里的页面，提示哪些新笔记还没摄入，一键让本机 Claude 摄入 / 回答问题，本地体检 wiki 规则。 |
| **Outline Block** ([`outline-block`](outline-block)) | 1.1.0 | ⌘⌥L：把光标所在的那一个长段落块，整理成层级列表并给核心概念加双链，层级按反链面板来定：引出 [[X]] 的那一项，展开讲 X 的内容都挂成它的子项（调用本机 Claude）。⌘⌥⇧L：整篇笔记（或选中的部分）按同一套规则整理，自动按标题/段落分份并行处理再拼回。先预览再替换。 |
| **Done To Top** ([`done-to-top`](done-to-top)) | 1.2.0 | 按状态把顶格任务块归位：DONE 在最上面、DOING 在中间、TODO 在 DOING 下面，分区之间用「- ---」隔开；一键整理；切换四象限的重要 / 紧急；「发送到明天」把光标所在块移到明天的日记（编辑器里打 /明天 也能叫出来）。 |
| **日记整理** ([`journal-tidy`](journal-tidy)) | 1.0.0 | 手动一键整理日记：任务按 DONE / DOING / TODO 分区；把问题汇总到一起，用本机的 Claude 联网查证后写上回答。 |
| **任务提醒** ([`nautilus-notify`](nautilus-notify)) | 0.1.0 | 用 macOS 通知横幅提醒今天日记里的任务：快开始的事件、过点没做的待办、做太久的 DOING、完成时的祝贺、排不下的容量预警、下一件该做什么、今日简报和收尾提醒。分析全部来自螺旋日程插件。 |
| **块引用增强** ([`block-ref-plus`](block-ref-plus)) | 0.1.0 | 仿思源：[[页#^id]] 显示被引用块的当前内容（动态锚文本）；被引用的块旁边显示引用次数，点开可跳到引用处。只改显示，不改文件。 |
| **Palette Enhancements** ([`palette-split-open`](palette-split-open)) | 1.0.0 | Better Command Palette 文件搜索增强：⌘⌥↵ 在右侧拆分打开（最多 3 栏）；文件名没有匹配时改做全库内容搜索，结果直接在面板里选；Tab 在文件名结果下面再加一层全文搜索，再按一次打开 Obsidian 全局搜索。 |
| **书签图标** ([`bookmark-icons`](bookmark-icons)) | 0.1.0 | 书签面板里每个笔记换成各自的图标（淡色底小方块），不再都是同一个文件图标；笔记属性 icon / icon-color 可以自己指定。只改显示。 |
| **追问成稿（QWS / grill-me）** ([`qws-bridge`](qws-bridge)) | 1.0.0 | 把当前笔记和它的全部反链整理成素材包，交给 Claudian 用 QWS 采访或 grill-me 盘问。 |
| **稿件台** ([`draft-desk`](draft-desk)) | 0.0.1 | 写稿时按步骤调用工具：① 脉络（grill-me 压测、方向发散）② 落实（填坑、概念锚点检索、QWS 补料）④ 扩写（扩写、正式化、文白交杂）⑤ 修整（规范排版、口癖计数、列表连成段落）。挂在写作模式面板上。设计中，还没有代码。 |
| **List Paste Merge** ([`list-paste-merge`](list-paste-merge)) | 1.0.0 | 在列表项里粘贴列表时，和当前行的列表符号合并，不会多出一个「- 」或「1. 」；缩进跟随当前行，顶层条目改成当前列表的符号并接着编号。 |
| **看板直达** ([`board-jump`](board-jump)) | 0.1.0 | 一键跳到常用看板：每个看板一条命令（可配快捷键）+ 看板切换器（自动列出 type: 看板 的笔记）+ obsidian://board 链接 |
| **编辑体验 Logseq 化** ([`esc-select-block`](esc-select-block)) | 2.1.0 | 仿 Logseq：Esc 选中光标所在的整个列表块（含所有子项；普通段落不算块），选中后 ↑↓ 在列表块之间切换（跳过中间的段落和标题）、⇧↑↓ 扩选、Enter 回到编辑；选中文字后输入成对符号（括号、引号、书名号等，含中文，不分输入法）会把文字包起来而不是替换，连按两次 [ 就是双链。 |
| **任务状态快切** ([`task-toggle`](task-toggle)) | 0.1.0 | ⌘/ 在编辑器里直接切换任务状态（无 → TODO → DOING 时间 → DONE 时间段 → 无），和 Bike 的宏一样；不写文件、不等保存，可以连按 |
| **Close Sidebar Files** ([`close-sidebar-files`](close-sidebar-files)) | 1.0.0 | 一键关掉右侧栏里打开的笔记（只关文件，插件面板不动）。 |
| **看板聚焦** ([`board-zoom`](board-zoom)) | 0.1.0 | 从 DataView 看板点开某一条时，自动用 Bullet 插件 zoom in 聚焦到那个列表块。 |
| **Journal Edit Mode** ([`journal-edit-mode`](journal-edit-mode)) | 1.0.0 | 日记类命名（YYYY_MM_DD）的笔记始终以编辑模式打开。 |
| **List Outdent Plain** ([`list-outdent-plain`](list-outdent-plain)) | 1.0.0 | ⌘[ 在已经顶格的列表项上再按一次：去掉列表符号（连同复选框），变成一段顶格的普通文字；它下面的子项跟着往前提一级。不是顶格列表项时照常减少缩进。 |

### 改过的社区插件（改动从多到少）

| 插件 | 版本 | 说明 |
|---|---|---|
| **Telegram Inbox（自用）** ([`telegram-inbox-local`](telegram-inbox-local)) | 1.9.2 | Receive messages from Telegram bot and add them to daily note. |
| **SuperTags（自用）** ([`supertags-local`](supertags-local)) | 1.2.3-local | Tana 式 supertag：日记里一行带 #标签 → 建成带属性的笔记。自用改版：边界匹配、字段、Bike 安全。 |
| **Flashcards** ([`flashcards-obsidian`](flashcards-obsidian)) | 9999.0.0 | Create and sync Anki flashcards from your notes. |
| **Expandomatic** ([`expandomatic`](expandomatic)) | 9999.0.0 | Expand selection outward through word, sentence, paragraph, section, document — like VSCode's expand selection. |
| **MDFlow（自用）** ([`mdflow-local`](mdflow-local)) | 1.4.1-local | 把 Markdown 排成公众号、X Articles、小红书图片。本地自用版，不从插件市场更新。 |
| **TODOseq** ([`todoseq`](todoseq)) | 9999.0.0 | Lightweight keyword-based task tracker using Logseq style keywords. |

### 只锁定版本（没改代码，只是不让插件市场覆盖）

| 插件 | 版本 | 说明 |
|---|---|---|
| **Breadcrumbs** ([`breadcrumbs`](breadcrumbs)) | 9999.0.0 | Add structured hierarchies to your notes. |

## 安装

把对应目录复制到库的 `.obsidian/plugins/` 下，完全退出并重新打开 Obsidian，再到「第三方插件」里启用。
