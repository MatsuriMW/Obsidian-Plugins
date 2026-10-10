# Obsidian Plugins

马自立（[@MatsuriMW](https://github.com/MatsuriMW)）自己写的、以及改过的 Obsidian 插件，一共 30 多个。它们为一件事服务：**把 Obsidian 变成一个以块为单位写东西、能自己整理知识、还能帮你排时间的个人系统。**

这些插件解决的是我自己每天碰到的问题，分成四块：

- **编辑与大纲**：Obsidian 原生的列表编辑和反链比 Logseq / Roam 弱一截，这一组把「块」的体验补回来：整块选中和移动、Roam 式反链面板、块引用显示内容、列表与段落互转。
- **知识库与 AI**：笔记越记越多，就越难再找到、再用上。这一组在本机建一个语义检索层（笔记不出这台电脑），再让 Claude 把散落的笔记整理成带出处的 Wiki、在写作时推荐相关段落、把卡片复习接进 Anki。
- **日程与任务**：在日记里用 TODO / DOING / DONE 写任务，插件把它们画成一圈螺旋日程，按预计时长自动排进今天的空档，并记下实际用时。
- **界面与导航**：Chrome 式标签页分组、可以自定义的新标签页、按插件整理的快捷键总览等，让窗口管理更顺手。

## 推荐度怎么看

| 推荐度 | 意思 |
|---|---|
| ★★★ | 装上就能用，不依赖我的库结构，推荐任何人试试 |
| ★★ | 好用，但要配合别的工具（Claude Code、Anki、某个社区插件），或者要按一套写法记笔记 |
| ★ | 和我的库结构、写作流程绑得比较深，更适合参考代码、改成你自己的版本 |

## 先看这几个

- **编辑体验 Logseq 化**（[`esc-select-block`](esc-select-block)）★★★：如果你从 Logseq 搬过来，最想念的「Esc 选中整块、↑↓ 在块之间跳」在这里。还有选中文字后输入括号会把文字包起来（连按两次 `[` 就是双链），以及块在无序列表、有序列表（含论文式 4.1、a. b. c.）和普通段落之间一键转换（⌘\ 在无序 → 有序 → 段落之间循环）。
- **Roam Backlinks**（独立仓库 [MatsuriMW/roam-backlinks](https://github.com/MatsuriMW/roam-backlinks)，原 Backlinks and Export）★★★：在 Obsidian 里获得和 Logseq、Roam Research 一致的反链编辑体验。反链按块显示整段内容，点面包屑逐级展开上下文，能就地编辑，按关系紧密度排序；导出 PDF 时还能把所有提到这页的内容一起带上。正在上架 Obsidian 社区插件市场，中英文界面
- **第二大脑**（[`second-brain`](second-brain)）★★：本机跑的语义检索（EmbeddingGemma 向量 + BM25），写作时侧栏实时列出库里意思相近的段落；每日回顾从卡片和 Wiki 里随机漫步，作答直接记进 Anki。整个「知识库与 AI」这一组都建在它上面。[用法和原理 →](second-brain/README.md)
- **螺旋日程**（[`nautilus-spiral`](nautilus-spiral)）★★：一圈螺旋就是今天剩下的时间，事件钉在时刻上，待办按顺序和预计时长填进空档，没做完的自动往后流，一眼看出今天还排不排得下。[用法和原理 →](nautilus-spiral/README.md)
- **Telegram Inbox · 陪伴版**（[`telegram-inbox-local`](telegram-inbox-local)）★★：手机上随手发给 Telegram 机器人的话直接进日记；而且它读得到你的日记和日程，所以你说「好累」时它知道你这几天熬到几点、手上压着什么，说「搞定了」时它知道你搞定的是什么，「呱呱呱」它也会呱回来。睡前说一声「睡了」，它回一条今天的小结。[它能做什么 →](telegram-inbox-local/README.md)
- **Chrome Tab Groups**（[`chrome-tab-groups`](chrome-tab-groups)）★★★：标签页一多就找不到？照 Chrome 做了分组、配色、折叠、整组拖动和同款右键菜单。

## 全部插件

### 编辑与大纲：把 Obsidian 用得像 Logseq / Roam

| 插件 | 作用 | 推荐度 | 需要什么 |
|---|---|---|---|
| **编辑体验 Logseq 化**<br>[`esc-select-block`](esc-select-block) | 让列表编辑接近 Logseq：Esc 选中整块，↑↓ 在块之间移动；选中文字后输入括号、引号会把文字包起来；⌘K 插分割线；跳到母块、把几块收进一个新母块；块可以在无序列表、有序列表（1. / 4.1 / a.）和普通段落之间转换，⌘\ 一键循环切换 | ★★★ | 无（和 Bullet 一起用更顺手） |
| **块引用增强**<br>[`block-ref-plus`](block-ref-plus) | 块引用显示被引用块的当前内容，被引用的块旁边标出被引用了几次（仿思源笔记） | ★★★ | 无 |
| **Hover Outline**<br>[`hover-outline`](hover-outline) | 编辑区左上角的隐藏式目录（仿 Claude Code）：平时只有一列短横线，鼠标移上去展开，点一下跳过去并把那一行停在正中 | ★★★ | 无 |
| **List Paste Merge**<br>[`list-paste-merge`](list-paste-merge) | 在列表里粘贴一段列表时不会多出一层「- 」，缩进和编号自动接上 | ★★★ | 无 |
| **List Outdent Plain**<br>[`list-outdent-plain`](list-outdent-plain) | 在顶格列表项上再按 ⌘[，它就变成普通段落，子项跟着往前提一级 | ★★★ | 无 |
| **任务状态快切**<br>[`task-toggle`](task-toggle) | ⌘/ 循环切换 TODO → DOING → DONE，自动写上开始和结束时间；⌘⇧/ 切换暂停、取消等状态 | ★★ | 用 Logseq 式任务关键词 |
| **Outline Block**<br>[`outline-block`](outline-block) | 一键把一大段文字整理成层级列表并加上双链，先预览再替换 | ★★ | 本机 Claude Code（`claude` 命令行） |

### 知识库与 AI：本地语义检索、LLM Wiki、复习和写作

| 插件 | 作用 | 推荐度 | 需要什么 |
|---|---|---|---|
| **第二大脑（自用）**<br>[`second-brain`](second-brain) | 跑在本机的语义检索层：写作时实时找出库里意思相近的段落；替 LLM Wiki 挑材料；每日回顾从卡片和 Wiki 里随机漫步，作答直接记进 Anki；生成库周报。笔记不离开这台电脑 | ★★ | Ollama + EmbeddingGemma；Anki + AnkiConnect（可选） |
| **LLM Wiki**<br>[`llm-wiki`](llm-wiki) | 仿 Karpathy 的 LLM Wiki：让 Claude 把散在日记和笔记里的内容整理成主题条目，每句话都链回原文出处；自带体检 | ★★ | 本机 Claude Code；配合第二大脑效果更好 |
| **Palette Enhancements**<br>[`palette-split-open`](palette-split-open) | 增强 Better Command Palette 的文件搜索：在右侧拆分打开、搜不到文件名时改搜正文、一键只搜某一类笔记 | ★★ | Better Command Palette |
| **稿件台**<br>[`draft-desk`](draft-desk) | 写稿工作台：压测观点、补素材、扩写、正式化、一键排版，挂在第二大脑的写作面板上 | ★ | 本机 Claude Code、第二大脑、作者的写作 skill |
| **追问成稿（QWS / grill-me）**<br>[`qws-bridge`](qws-bridge) | 把当前笔记和它的所有反链打包，交给 AI 来采访或盘问你，帮你把想法说清楚 | ★ | Claudian 插件 + QWS / grill-me skill |
| **日记整理**<br>[`journal-tidy`](journal-tidy) | 一键整理日记：任务分区、给带标签的条目补上字段，再把日记里的问题交给 Claude 联网查证、写上回答 | ★ | 本机 Claude Code；Logseq 式任务 |

### 日程与任务

| 插件 | 作用 | 推荐度 | 需要什么 |
|---|---|---|---|
| **螺旋日程**<br>[`nautilus-spiral`](nautilus-spiral) | 螺旋日程：把今天日记里的事件和待办画成一圈螺旋，待办按预计时长自动排进空档，一眼看出今天还排不排得下，并记下实际用时；可以读入 macOS 日历；还能生成发到 Telegram 的图文版（⭐ 正在做、接下来、排不下） | ★★ | 日记里用 Logseq 式任务写法；macOS 日历、Raycast 可选 |
| **任务提醒**<br>[`nautilus-notify`](nautilus-notify) | 螺旋日程的提醒搭档：事件快开始、待办过了点、做得太久、今天排不下时，用 macOS 通知提醒你；按健身计划提醒开练、追练、断档、称重；人不在电脑前时转发到 Telegram，并定时推送螺旋日程、健身早报、拖延任务（带按钮）、闪卡到期、经期预测、周日周洞察和收工小结 | ★ | 螺旋日程；macOS；Telegram 推送要 Telegram Inbox；周洞察和小结要 claude 命令行 |
| **Done To Top**<br>[`done-to-top`](done-to-top) | 日记里的任务按 DONE / DOING / TODO 自动分区；写着「明天」的事一键发到明天的日记 | ★★ | Logseq 式任务关键词 |
| **日记翻页 + 刷新**<br>[`diary-nav`](diary-nav) | 在日记里前进 / 后退就是翻到后一天 / 前一天；⌘R 刷新当前页面 | ★★★ | 无 |
| **看板直达**<br>[`board-jump`](board-jump) | 常用看板一键直达：每个看板一条命令，外加看板切换器和 obsidian:// 链接 | ★★ | 看板笔记带 `type: 看板` 属性 |
| **看板聚焦**<br>[`board-zoom`](board-zoom) | 从 Dataview 看板点开某一条时，自动聚焦到那个列表块 | ★ | Dataview + Bullet |

### 界面与导航

| 插件 | 作用 | 推荐度 | 需要什么 |
|---|---|---|---|
| **Chrome Tab Groups**<br>[`chrome-tab-groups`](chrome-tab-groups) | Chrome 式标签页分组：命名、配色、折叠、整组拖动、移到新窗口，右键菜单也和 Chrome 一样 | ★★★ | 仅桌面端 |
| **新标签页选项**<br>[`newtab-home`](newtab-home) | ⌘T 新标签页换成一个搜索条和一列快捷按钮，按钮可以设成打开某篇笔记、某个插件页面或执行某条命令；背景图可以自己上传 | ★★★ | 仅桌面端 |
| **快捷键总览**<br>[`hotkey-atlas`](hotkey-atlas) | 快捷键设置页按插件分组，显示每个插件改过几个键、哪里有冲突；只在特定场景生效的按键也一并列出 | ★★★ | 无 |
| **书签图标**<br>[`bookmark-icons`](bookmark-icons) | 书签面板里每篇笔记显示各自的彩色图标，不再是一排一样的文件图标 | ★★★ | 无 |
| **Close Sidebar Files**<br>[`close-sidebar-files`](close-sidebar-files) | 一键关掉右侧栏里打开的笔记，插件面板保持不动 | ★★★ | 无 |

### 改过的社区插件

| 插件 | 作用 | 推荐度 | 需要什么 |
|---|---|---|---|
| **Telegram Inbox · 陪伴版**<br>[`telegram-inbox-local`](telegram-inbox-local) | 一个读过你日记的 Telegram 陪伴机器人，分记录和对话两种模式：记录模式下消息随手发过去就记进日记，对话模式下每句都接着聊（对话不进日记），要等的回复先给一条「收到，在想……」；说「哈喽」「呱呱呱」马上回你，说累、难受、想念某人时读你的陪伴档案和最近日记陪你聊，开心时跟你一起高兴；「睡了」收工并回一条今天的小结，「?」看图文版螺旋日程，还能点「任务提醒」发来的按钮处理拖延任务。[说明 →](telegram-inbox-local/README.md) | ★★ | 自己的 Telegram 机器人；陪伴和小结要「任务提醒」「螺旋日程」和 Claude Code 命令行 |
| **SuperTags（自用）**<br>[`supertags-local`](supertags-local) | Tana 式 supertag：在日记里写一行带 #标签 的内容，就建成一篇带字段的笔记。改动：标签按词边界匹配、每个标签可以定义字段（可以写可选值，待读 / 待看 / 待听看板按字段显示维度、筛选）、同名笔记不重复建、兼容 Bike | ★★ | 无 |
| **Journals**<br>[`journals`](journals) | 日记日历。改动：日历上标出每篇日记整理完没有，⌘⇧J 列出近两个月没整理完的；日记总是以编辑模式打开；侧栏日历更紧凑 | ★★ | 无 |
| **Flashcards**<br>[`flashcards-obsidian`](flashcards-obsidian) | 从笔记生成并同步 Anki 卡片。改动：卡片的上下文会带上包着它的各层母块，在 Anki 里也知道这张卡在讲什么 | ★★ | Anki + AnkiConnect |
| **Expandomatic**<br>[`expandomatic`](expandomatic) | 选区按 词 → 句 → 段 → 节 → 全文 逐级扩大，和 VSCode 的扩选一样。改动：和「编辑体验 Logseq 化」的块选中配合调整过 | ★★★ | 无 |
| **MDFlow（自用）**<br>[`mdflow-local`](mdflow-local) | 把 Markdown 排成公众号文章、X Articles 和小红书图片。本地版，不跟插件市场更新 | ★★ | 无 |
| **TODOseq**<br>[`todoseq`](todoseq) | 用 Logseq 式关键词（TODO / DOING / DONE）做轻量任务跟踪。改动：切换状态的快捷键让给了「任务状态快切」 | ★★ | 无 |

### 附：没改代码、只固定了版本的社区插件

| 插件 | 作用 | 推荐度 | 需要什么 |
|---|---|---|---|
| **Breadcrumbs**<br>[`breadcrumbs`](breadcrumbs) | 没改代码，只把版本固定住，不让插件市场自动更新 | — | 无 |

## 安装

1. 把想要的插件目录复制到你的库的 `.obsidian/plugins/` 下
2. 完全退出并重新打开 Obsidian
3. 到「设置 → 第三方插件」里启用

几点说明：

- 标了「仅桌面端」或要调用本机程序（Claude Code、Ollama、macOS 日历）的插件只能在电脑上用，主要在 macOS 上测过。
- 用到 Claude 的插件调用的是本机的 [Claude Code](https://claude.com/claude-code) 命令行（`claude -p`），要先装好并登录。
- 改过的社区插件把版本号锁成了 `9999.0.0` 或带 `-local` 后缀，这样插件市场不会用原版覆盖它们。想用原版的话，去插件市场装原作者的版本就行。
- 快捷键都注册成了 Obsidian 命令，可以在「设置 → 快捷键」里搜到、改掉。

## 致谢

改过的社区插件的原作者：Telegram Inbox、SuperTags（Daniele D'Amico）、Journals（Sergii Kostyrko）、Flashcards（Alex Colucci）、Expandomatic（Onsi Fakhouri）、MDFlow、TODOseq（Stephen Cross）、Breadcrumbs（MichaelPPorter）。这些插件的许可证以原项目为准。
