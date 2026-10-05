# Obsidian Plugins

马自立自用的 Obsidian 插件，装在主库「马自立」的 `.obsidian/plugins/` 下。由 `sync.sh` 从库里同步，不要直接改这里的文件。

| 插件 | 版本 | 说明 |
|---|---|---|
| **Backlink Defaults** (`backlink-defaults`) | 0.1.0 | 反向链接面板默认按修改时间从新到旧排序，并显示更多上下文。 |
| **块引用增强** (`block-ref-plus`) | 0.1.0 | 仿思源：[[页#^id]] 显示被引用块的当前内容（动态锚文本）；被引用的块旁边显示引用次数，点开可跳到引用处。只改显示，不改文件。 |
| **看板直达** (`board-jump`) | 0.1.0 | 一键跳到常用看板：每个看板一条命令（可配快捷键）+ 看板切换器（自动列出 type: 看板 的笔记）+ obsidian://board 链接 |
| **看板聚焦** (`board-zoom`) | 0.1.0 | 从 DataView 看板点开某一条时，自动用 Bullet 插件 zoom in 聚焦到那个列表块。 |
| **Breadcrumbs** (`breadcrumbs`) | 9999.0.0 | Add structured hierarchies to your notes. |
| **Chrome Tab Groups** (`chrome-tab-groups`) | 1.0.0 | 仿 Chrome 的标签页管理：标签页分组（命名、颜色、折叠、拖色块移动整组、移至新窗口）、右键菜单（在右侧新建、向新拆分视图添加、添加到组、复制标签页）、搜索标签页。 |
| **Close Sidebar Files** (`close-sidebar-files`) | 1.0.0 | 一键关掉右侧栏里打开的笔记（只关文件，插件面板不动）。 |
| **Done To Top** (`done-to-top`) | 1.1.0 | 按状态把顶格任务块归位：DONE 在最上面、DOING 在中间、TODO 在 DOING 下面，分区之间用「- ---」隔开；一键整理；切换四象限的重要 / 紧急。 |
| **Esc Select Block** (`esc-select-block`) | 1.0.0 | 仿 Logseq：在列表里按 Esc 选中光标所在的整块（含所有子项），再按一次取消并回到原来的光标位置。 |
| **Expandomatic** (`expandomatic`) | 9999.0.0 | Expand selection outward through word, sentence, paragraph, section, document — like VSCode's expand selection. |
| **Flashcards** (`flashcards-obsidian`) | 9999.0.0 | Create and sync Anki flashcards from your notes. |
| **Journal Edit Mode** (`journal-edit-mode`) | 1.0.0 | 日记类命名（YYYY_MM_DD）的笔记始终以编辑模式打开。 |
| **日记整理** (`journal-tidy`) | 1.0.0 | 手动一键整理日记：任务按 DONE / DOING / TODO 分区；把问题汇总到一起，用本机的 Claude 联网查证后写上回答。 |
| **List Paste Merge** (`list-paste-merge`) | 1.0.0 | 在列表项里粘贴列表时，和当前行的列表符号合并，不会多出一个「- 」或「1. 」；缩进跟随当前行，顶层条目改成当前列表的符号并接着编号。 |
| **LLM Wiki** (`llm-wiki`) | 0.1.0 | 左侧栏的 Wiki 面板：按主题列出 Wiki/ 里的页面，提示哪些新笔记还没摄入，一键让本机 Claude 摄入 / 回答问题，本地体检 wiki 规则。 |
| **MDFlow（自用）** (`mdflow-local`) | 1.4.1-local | 把 Markdown 排成公众号、X Articles、小红书图片。本地自用版，不从插件市场更新。 |
| **任务提醒** (`nautilus-notify`) | 0.1.0 | 用 macOS 通知横幅提醒今天日记里的任务：快开始的事件、过点没做的待办、做太久的 DOING、完成时的祝贺、排不下的容量预警、下一件该做什么、今日简报和收尾提醒。分析全部来自螺旋日程插件。 |
| **螺旋日程** (`nautilus-spiral`) | 0.1.0 | 仿 Roam 的 Nautilus：把今天日记里的事件和待办画成螺旋日程，未完成的任务从「现在」往后流，带容量条。只读日记不写日记，日记可以在 Bike 里写。 |
| **Outline Block** (`outline-block`) | 1.0.0 | ⌘⌥L：把光标所在的那一个长段落块，整理成层级列表并给核心概念加双链，层级按反链面板来定：引出 [[X]] 的那一项，展开讲 X 的内容都挂成它的子项（调用本机 Claude）。先预览再替换。 |
| **Palette Enhancements** (`palette-split-open`) | 1.0.0 | Better Command Palette 文件搜索增强：⌘⌥↵ 在右侧拆分打开（最多 3 栏）；文件名没有匹配时改做全库内容搜索，结果直接在面板里选。 |
| **追问成稿（QWS / grill-me）** (`qws-bridge`) | 1.0.0 | 把当前笔记和它的全部反链整理成素材包，交给 Claudian 用 QWS 采访或 grill-me 盘问。 |
| **第二大脑（自用）** (`second-brain`) | 0.2.0 | 每日回顾（那年今日 / 随机旧块 / 孤岛笔记）、写作模式（相关笔记 + Claudian）、库周报。 |
| **SuperTags（自用）** (`supertags-local`) | 1.2.3-local | Tana 式 supertag：日记里一行带 #标签 → 建成带属性的笔记。自用改版：边界匹配、字段、Bike 安全。 |
| **任务状态快切** (`task-toggle`) | 0.1.0 | ⌘/ 在编辑器里直接切换任务状态（无 → TODO → DOING 时间 → DONE 时间段 → 无），和 Bike 的宏一样；不写文件、不等保存，可以连按 |
| **Telegram Inbox（自用）** (`telegram-inbox-local`) | 1.9.2 | Receive messages from Telegram bot and add them to daily note. |
| **TODOseq** (`todoseq`) | 9999.0.0 | Lightweight keyword-based task tracker using Logseq style keywords. |

安装：把对应目录复制到库的 `.obsidian/plugins/` 下，完全退出并重新打开 Obsidian，再到「第三方插件」里启用。
