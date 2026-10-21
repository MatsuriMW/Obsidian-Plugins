# Obsidian Plugins

马自立（[@MatsuriMW](https://github.com/MatsuriMW)）自己写的、以及改过的 Obsidian 插件，一共 30 多个。它们为一件事服务：**把 Obsidian 变成一个以块为单位写东西、能自己整理知识、还能帮你排时间的个人系统。**

背后的想法是「文件系统 + Agent」：主库是 Markdown 加 Git，Claude、Pi、Codex、WorkBuddy 读写同一个库；工作记录一半由人主动写、一半由 AI 自动记；同一份日记既是陪伴 Agent 的上下文，也是个人任务管理。

这些插件解决的是我自己每天碰到的问题，分成四块：

- **编辑与大纲**：Obsidian 原生的列表编辑和反链比 Logseq / Roam 弱一截，这一组把「块」的体验补回来：整块选中和移动、Roam 式反链面板、块引用显示内容、列表与段落互转。
- **知识库与 AI**：笔记越记越多，就越难再找到、再用上。这一组在本机建一个语义检索层（笔记不出这台电脑），再让 Claude 把散落的笔记整理成带出处的 Wiki、在写作时推荐相关段落、把卡片复习接进 Anki。
- **日程与任务**：在日记里用 TODO / DOING / DONE 写任务，插件把它们画成一圈螺旋日程，按预计时长自动排进今天的空档，并记下实际用时。一行任务还能直接交给 Claude Code 去做：发出去的是这一块，进度、用掉的 token 和它最后说的话都回到这一行下面。
- **界面与导航**：Chrome 式标签页分组、可以自定义的新标签页、按插件整理的快捷键总览等，让窗口管理更顺手。

## 推荐度怎么看

| 推荐度 | 意思 |
|---|---|
| ★★★ | 装上就能用，不依赖我的库结构，推荐任何人试试 |
| ★★ | 好用，但要配合别的工具（Claude Code、Anki、某个社区插件），或者要按一套写法记笔记 |
| ★ | 和我的库结构、写作流程绑得比较深，更适合参考代码、改成你自己的版本 |

## 先看这几个

- **Emacs Logseq Inspired Outline**（独立仓库 [MatsuriMW/emacs-logseq-inspired-outline](https://github.com/MatsuriMW/emacs-logseq-inspired-outline)，原「编辑体验 Logseq 化」）★★★：如果你从 Logseq 搬过来，最想念的「Esc 选中整块、↑↓ 在块之间跳」在这里。还有选中文字后输入括号会把文字包起来（连按两次 `[` 就是双链），以及块在无序列表、有序列表（含论文式 4.1、a. b. c.）和普通段落之间一键转换（⌘\ 在无序 → 有序 → 段落之间循环）。
- **Roam Backlinks**（独立仓库 [MatsuriMW/roam-backlinks](https://github.com/MatsuriMW/roam-backlinks)，原 Backlinks and Export）★★★：在 Obsidian 里获得和 Logseq、Roam Research 一致的反链编辑体验。反链按块显示整段内容，点面包屑逐级展开上下文，能就地编辑，按关系紧密度排序；导出 PDF 时还能把所有提到这页的内容一起带上。正在上架 Obsidian 社区插件市场，中英文界面
- **第二大脑**（[`second-brain-local`](second-brain-local)）★★：本机跑的语义检索（EmbeddingGemma 向量 + BM25），写作时侧栏实时列出库里意思相近的段落；每日回顾从卡片和 Wiki 里随机漫步，作答直接记进 Anki。整个「知识库与 AI」这一组都建在它上面。[用法和原理 →](second-brain/README.md)
- **螺旋日程**（独立仓库 [MatsuriMW/nautilus-spiral](https://github.com/MatsuriMW/nautilus-spiral)）★★：一圈螺旋就是今天剩下的时间，事件钉在时刻上，待办按顺序和预计时长填进空档，没做完的自动往后流，一眼看出今天还排不排得下。日记大纲同时是 Agent 干活的仪表盘：任务行下面有进度条和会话最后说的话，状态栏报几个在跑、几个在等你。[用法和原理 →](https://github.com/MatsuriMW/nautilus-spiral/blob/main/README.zh-CN.md)
- **块去向**（[`done-to-top`](done-to-top)）★★：决定一个块去哪儿。日记里的任务按 DONE / DOING / TODO 自动分区；`⌥⌘S` 把光标所在的块连同子块发到别处：页面顶部、明天的日记、日历、提醒事项，或者 Claude Code。发给 Claude Code 时一块就是一个会话：选中几块并列的，同时开几个；让母块当共同背景，每个子块各开一个。会话可以开在终端窗口里，也可以放在后台的 tmux 里跑，配合螺旋日程在大纲里看进度。
- **Telegram Companion**（独立仓库 [`telegram-companion`](https://github.com/MatsuriMW/telegram-companion)）★★★：手机上随手发给 Telegram 机器人的话直接进日记；想聊的时候，它读着你近一周的日记回你。可以给它换人设、教它你的口癖、切换背后的模型。
- **Chrome Tab Groups**（独立仓库 [MatsuriMW/obsidian-chrome-tab-groups](https://github.com/MatsuriMW/obsidian-chrome-tab-groups)）★★★：标签页一多就找不到？照 Chrome 做了分组、配色、折叠、整组拖动和同款右键菜单。
