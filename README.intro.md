# Obsidian Plugins

马自立自用的 Obsidian 插件，装在主库「马自立」的 `.obsidian/plugins/` 下。大部分是自己从零写的，另外几个是改过的社区插件。

插件代码由 `sync.sh` 从库里同步，不要直接改插件目录里的文件。README 也是 `sync.sh` 生成的：上面这段介绍改 `README.intro.md`，下面清单的顺序和分组改 `order.txt`。

## 重点插件

### 日程与任务

- **螺旋日程**（[`nautilus-spiral`](nautilus-spiral)）：仿 Roam 的 Nautilus，把今天日记里的事件和待办画成一圈螺旋，没做完的任务从「现在」往后流，带容量条，一眼看出今天还排不排得下。只读日记，日记可以在 Bike 里写。
- **任务提醒**（[`nautilus-notify`](nautilus-notify)）：螺旋日程的搭档，用 macOS 通知横幅提醒：快开始的事件、过点没做的待办、做太久的 DOING、排不下的容量预警、下一件该做什么、今日简报和收尾。
- **Done To Top**（[`done-to-top`](done-to-top)）+ **日记整理**（[`journal-tidy`](journal-tidy)）：顶格任务按 DONE / DOING / TODO 分区归位，写着「明天 / 后天」的整块搬到那天的日记；日记整理再把日记里的问句汇总起来，交给本机 Claude 联网查证后写上回答。

### 知识库与写作

- **第二大脑**（[`second-brain`](second-brain)）：每日回顾（那年今日 / 随机旧块 / 孤岛笔记）；写作模式按光标所在段落实时找库里意思相近的块（本机 Ollama 向量 + BM25 混合）；每周生成库周报。
- **Backlink Defaults**（[`backlink-defaults`](backlink-defaults)）：反链面板按关系紧密度排页面，日记按日期分月 / 分年折叠，命中块带 Roam 式面包屑。
- **LLM Wiki**（[`llm-wiki`](llm-wiki)）：左侧栏的 Wiki 面板，按主题列页面、提示哪些新笔记还没摄入，一键让本机 Claude 摄入或回答问题。
- **Outline Block**（[`outline-block`](outline-block)）：⌘⌥L 把一段长文整理成层级列表并加双链，层级按反链面板的逻辑来定；先预览再替换。
- **块引用增强**（[`block-ref-plus`](block-ref-plus)）：仿思源，`[[页#^id]]` 显示被引用块的当前内容，被引用的块旁边显示引用次数。

### 界面与操作

- **Chrome Tab Groups**（[`chrome-tab-groups`](chrome-tab-groups)）：照 Chrome 做的标签页分组：命名、颜色、折叠、拖色块移动整组、移至新窗口，加上 Chrome 的右键菜单。
- **Palette Enhancements**（[`palette-split-open`](palette-split-open)）：Better Command Palette 文件搜索增强：⌘⌥↵ 右侧拆分打开；文件名搜不到时自动搜正文；Tab 在文件名结果下面再加一层全文搜索，再按一次打开 Obsidian 全局搜索。

### 改得最多的社区插件

- **Telegram Inbox（自用）**（[`telegram-inbox-local`](telegram-inbox-local)）：发给 Telegram 机器人的消息记进日记。自用补丁：时间按消息发出的时刻记，`done 写稿` 直接把今天没做完的那条改成 DONE，和螺旋日程、Done To Top 配合。
- **SuperTags（自用）**（[`supertags-local`](supertags-local)）：Tana 式 supertag。改写了处理流程：标签按边界匹配、行内 / 子项字段写进新页、同名笔记不重复建、Bike 开着日记时等它存完再处理。
