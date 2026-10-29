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

## 全部插件

### 编辑与大纲：把 Obsidian 用得像 Logseq / Roam

| 插件 | 作用 | 推荐度 | 需要什么 |
|---|---|---|---|
| **块引用增强**<br>[`block-ref-plus`](block-ref-plus) | 块引用显示被引用块的当前内容，被引用的块旁边标出被引用了几次（仿思源笔记） | ★★★ | 无 |
| **List Paste Merge**<br>[`list-paste-merge`](list-paste-merge) | 在列表里粘贴一段列表时不会多出一层「- 」，缩进和编号自动接上 | ★★★ | 无 |
| **List Outdent Plain**<br>[`list-outdent-plain`](list-outdent-plain) | 在顶格列表项上再按 ⌘[，它就变成普通段落，子项跟着往前提一级 | ★★★ | 无 |
| **任务状态快切**<br>[`task-toggle`](task-toggle) | ⌘/ 循环切换 TODO → DOING → DONE，自动写上开始和结束时间；⌘⇧/ 切换暂停、取消等状态 | ★★ | 用 Logseq 式任务关键词 |
| **Outline Block**<br>[`outline-block`](outline-block) | 一键把一大段文字整理成层级列表并加上双链，先预览再替换 | ★★ | 本机 Claude Code（`claude` 命令行） |
| **Chrome 书签**<br>[`chrome-bookmarks`](chrome-bookmarks) | 侧栏里一棵和 Chrome 双向同步的书签树：点一下用内置浏览器（或 Chrome）打开；在这里新建、改名、拖动、删除，Chrome 那边跟着变，反过来也一样。命令「搜索 Chrome 书签」在 Better Command Palette 里搜（要装 Palette Enhancements，没装就用自带的小面板）。在 Chrome 里新收藏的网页会按内容量自动记进笔记：单篇进待读、视频进待看、Wiki 式的进长期项目。要配合仓库里的 Chrome 扩展「Obsidian 书签桥」用，两边只走本机 127.0.0.1 通信。 |  |  |
| **Paste Image Scale**<br>[`paste-image-scale`](paste-image-scale) | 粘贴或拖进来的图片，默认按原图宽度的 50% 显示：插好 ![[图片]] 之后自动补上 \|宽度。Retina 截图（@2x）正好回到屏幕上看到的大小。比例可调。 |  |  |

### 知识库与 AI：本地语义检索、LLM Wiki、复习和写作

| 插件 | 作用 | 推荐度 | 需要什么 |
|---|---|---|---|
| **第二大脑（自用）**<br>[`second-brain-local`](second-brain-local) | 跑在本机的语义检索层：写作时实时找出库里意思相近的段落；替 LLM Wiki 挑材料；每日回顾从 Wiki 条目里随机漫步、回看存疑条目、找孤岛笔记；生成库周报。笔记不离开这台电脑。刷卡已拆成 Card Walk | ★★ | Ollama + EmbeddingGemma |
| **LLM Wiki**<br>[`llm-wiki`](llm-wiki) | 仿 Karpathy 的 LLM Wiki：让 Claude 把散在日记和笔记里的内容整理成主题条目，每句话都链回原文出处；自带体检 | ★★ | 本机 Claude Code；配合第二大脑效果更好 |
| **Palette Enhancements**<br>[`palette-split-open`](palette-split-open) | 增强 Better Command Palette 的文件搜索：在右侧拆分打开、搜不到文件名时改搜正文、⌘O 之后打一个符号只搜某一类内容（、书签和看板 / ？Chrome 书签 / 《 选题台 / @ 小说选题台 / # Wiki 条目 / ！卡片，中英文标点等效） | ★★ | Better Command Palette |
| **稿件台**<br>[`draft-desk`](draft-desk) | 写稿工作台：压测观点、补素材、扩写、正式化、一键排版，挂在第二大脑的写作面板上 | ★ | 本机 Claude Code、第二大脑、作者的写作 skill |
| **追问成稿（QWS / grill-me）**<br>[`qws-bridge`](qws-bridge) | 把当前笔记和它的所有反链打包，交给 AI 来采访或盘问你，帮你把想法说清楚；写作模式面板上有按钮，在稿子里也认得出原来的选题 | ★ | Claudian 插件 + QWS / grill-me skill |
| **日记整理**<br>[`journal-tidy`](journal-tidy) | 整理日记，分两种方式：基础整理在本地把手打的编号（- 1.）改成有序列表、任务分区、聚拢链接、给带标签的条目补上字段、折起做完的；你放进 DOING 区的 TODO、母块还没做完时里面做完的子项、你自己加的分割线都不动，Agent 自动记的做完的事收进 DONE 栏顶上的「🤖 Agent 记录」；进阶整理再请 Claude 联网回答日记里的问题，把 AI 助手自动记下的任务行按主题收拢，给摘录挂上记号。另外在 Claude 桌面 app 里归档一个会话，日记里自动记一笔。「今天是哪一篇日记」跟着螺旋日程的「日记日期分界」走（装了螺旋日程的话），两边不会差一天 | ★ | 本机 Claude Code；Logseq 式任务 |

### 日程与任务

| 插件 | 作用 | 推荐度 | 需要什么 |
|---|---|---|---|
| **任务提醒**<br>[`nautilus-notify`](nautilus-notify) | 螺旋日程的提醒搭档：事件快开始、待办过了点、做得太久、今天排不下时，用 macOS 通知提醒你；按健身计划提醒开练、追练、断档、称重；人不在电脑前时转发到 Telegram，并定时推送螺旋日程、健身早报、拖延任务（带按钮）、闪卡到期、经期预测、周日周洞察 | ★ | 螺旋日程；macOS；Telegram 推送要 [Telegram Companion](https://github.com/MatsuriMW/telegram-companion)；周洞察用 Telegram Companion 里选的模型 |
| **块去向**<br>[`done-to-top`](done-to-top) | 决定一个块去哪儿：日记里的任务按 DONE / DOING / TODO 自动分区（已经做成闪卡的块归 DONE 区），DOING / TODO 区里按优先级 [#A] → [#B] → [#C] 排，DONE 区里 SUSPENDED / FAILED / CANCELLED 各自聚在一起（拿主意的 YES 跟 DONE、NO 跟 CANCELLED，MAYBE 跟 WAITING 留在 TODO 区）；⌥⌘D 一键把光标所在块连同子块委派给 Claude（后台开会话、答完进桌面版，这一行改成 DELEGATED 挪进 DOING 区）；⌥⌘S 把光标所在块连同子项发到页面顶部、明天的日记、Claude CLI、Claudian 的 Inline edit、MD Flow、macOS 日历、提醒事项，或者交给 AI 解释（讲讲这一块是什么意思、里面的英文词和术语各指什么，答案记成这一块下面的 💡 子块，再发一次是换成新的）。发给 Claude CLI 时在这一行下面记下是哪个会话（🔗）；选中几块并列的，每块各开一个会话；也可以让母块当共同背景、每个子块各开一个，或者只开一个会话、每个子块交给它派出的一个 subagent，结论回到这一个会话里汇总（装了螺旋日程的话，这些 subagent 在跑还是跑完、最近一步、用了多少 token 都显示在这一行下面，每答完一轮记一行 🤖 子代理）。会话可以开在终端窗口里、放在后台的 tmux 里，或者用 claude -p 无头跑。发到日历 / 提醒事项时认 SCHEDULED、DEADLINE 和行里的 14:00、8pm、下午3点这类时刻。还可以让 Obsidian 自带的斜杠命令只留名字里带「块」的命令。给 AI 的 TODO：昨天、今天、明天日记里状态写成 TODOFORAI / TODO4AI / TODO2AI / TODOTOAI 的条目，停手一会儿后自动连同子块发给 Claude 开一个新会话，这一行不改、下面记一行 🔗 绑定；撞着限额就交给 limit-resume 排到额度恢复以后，第一轮答完导入 Claude 桌面版 | ★★ | Logseq 式任务关键词；Claude CLI 之后的几个去向只在 macOS 上有，各自要装对应的工具（放后台要装 tmux） |
| **日记翻页 + 刷新**<br>[`diary-nav`](diary-nav) | 在日记里前进 / 后退就是翻到后一天 / 前一天；⌘R 刷新当前页面 | ★★★ | 无 |
| **看板直达**<br>[`board-jump`](board-jump) | 跳到常用看板：看板切换器（开在 Better Command Palette 里，书签和看板一起搜）、obsidian:// 链接、看板全宽显示 | ★★ | 看板笔记带 `type: 看板` 属性；切换器要配合 Better Command Palette 和 Palette Enhancements |
| **看板聚焦**<br>[`board-zoom`](board-zoom) | 从 Dataview 看板点开某一条时，自动聚焦到那个列表块 | ★ | Dataview + Bullet |

### 界面与导航

| 插件 | 作用 | 推荐度 | 需要什么 |
|---|---|---|---|
| **新标签页选项**<br>[`newtab-home`](newtab-home) | ⌘T 新标签页换成一个搜索条和一列快捷按钮，按钮可以设成打开某篇笔记、某个插件页面或执行某条命令；背景图可以自己上传 | ★★★ | 仅桌面端 |
| **快捷键总览**<br>[`hotkey-atlas`](hotkey-atlas) | 快捷键设置页按插件分组，显示每个插件改过几个键、哪里有冲突；只在特定场景生效的按键也一并列出 | ★★★ | 无 |
| **书签图标**<br>[`bookmark-icons`](bookmark-icons) | 书签面板里每篇笔记显示各自的彩色图标，不再是一排一样的文件图标。看板背后的数据笔记更新了、你还没打开看过时，图标上亮一个小红点（放在图形留空的那个角），打开那篇看板就灭；盯哪份数据用笔记属性 badge-watch 指定 | ★★★ | 无 |
| **Close Sidebar Files**<br>[`close-sidebar-files`](close-sidebar-files) | 一键关掉两侧边栏里打开的笔记（⌥⌘W），插件面板保持不动；也可以只关右侧栏的。设置页里看得到现在绑的键，点一下去改 | ★★★ | 无 |

### 改过的社区插件

| 插件 | 作用 | 推荐度 | 需要什么 |
|---|---|---|---|
| **SuperTags（自用）**<br>[`supertags-local`](supertags-local) | Tana 式 supertag：在日记里写一行带 #标签 的内容，就建成一篇带字段的笔记。改动：标签按词边界匹配、每个标签可以定义字段（可以写可选值，待读 / 待看 / 待听看板按字段显示维度、筛选）、同名笔记不重复建、兼容 Bike | ★★ | 无 |
| **Journals**<br>[`journals`](journals) | 日记日历。改动：日历上标出每篇日记整理完没有，⌘⇧J 列出近两个月没整理完的；日记总是以编辑模式打开；侧栏日历更紧凑 | ★★ | 无 |
| **Flashcards**<br>[`flashcards-obsidian`](flashcards-obsidian) | 从笔记生成并同步 Anki 卡片。改动：卡片的上下文会带上包着它的各层母块，在 Anki 里也知道这张卡在讲什么 | ★★ | Anki + AnkiConnect |
| **Expandomatic**<br>[`expandomatic`](expandomatic) | 选区按 词 → 句 → 段 → 节 → 全文 逐级扩大，和 VSCode 的扩选一样。改动：和「编辑体验 Logseq 化」的块选中配合调整过 | ★★★ | 无 |
| **MDFlow（自用）**<br>[`mdflow-local`](mdflow-local) | 把 Markdown 排成公众号文章、X Articles 和小红书图片，可以一键发到 Hexo 博客、一次分发到几个平台。本地版，不跟插件市场更新 | ★★ | 无 |
| **TODOseq**<br>[`todoseq`](todoseq) | 用 Logseq 式关键词（TODO / DOING / DONE）做轻量任务跟踪。改动：切换状态的快捷键让给了「任务状态快切」；关键词上不再挂悬停说明；关键词按状态上色（低饱和的蓝、红、绿，停下来的、没成的用暖灰色）；行里写的 2/3 这种进度不再被当成日期；优先级可以简写成 todoa、todo a、doing b，光标离开那一行就改成 TODO [#A]；⌃⇧I / ⌃⇧U 切换「重要」「紧急」（A 重要且紧急、B 紧急不重要、C 重要不紧急，从块去向搬过来的）；加了四个给 AI 的 TODO 状态 TODOFORAI / TODO4AI / TODO2AI / TODOTOAI（和 TODO 同类，可切到 DOING），小写的光标离开时改成大写；加了两个 Agent 会话的 DOING 中间态 TOREVIEW（停下来等你看）/ NEEDOK（等你点允许，显示成 NEEDOK?）/ ERRORED（报错停了）/ HITLIMIT（撞了用量限额，显示成 HITLIMIT!）/ QUEUED（已排队等续跑）/ DELEGATED（委派给 Agent 了）；关键词前面加了 lucide-animated 的动效小图标（DONE 是画勾的圆圈、DOING 是一直转的圈、TOREVIEW 是眨眼……），DOING 一直转，别的只在刚切换那一下播一次，和 PAUSED 一样点一下回 DOING、用渐变色区分，由螺旋日程按会话状态自动切；加了拿主意的三个词 YES / NO / MAYBE（YES、NO 和 DONE 一样算定了，MAYBE 和 WAITING 一样还悬着），各配一个图标（竖大拇指、倒大拇指、问号） | ★★ | 无 |
| **NoteTweet**<br>[`notetweet`](notetweet) | 在笔记里写推文和线程直接发到 X。改动：撰写框照 X 和 Typefully 重做——头像 + 账号、Write / Preview 两档（Preview 按 X 时间线排出整串帖子：线程线、图片宫格、#话题 @提及 链接上色）；字数改成 X 式的进度环（剩 30 字变暖色出数字，超了变红、卡片抖一下）；按钮换成 Lucide 动效图标（照 lucide-animated，悬停时自己动）；加帖、删帖、换顺序都有平滑过渡；弹窗贴上方开不再上下跳；按钮样式和 Obsidian 原生对齐；发帖中有转圈提示、发完有画出来的勾；编辑器右键选中文字可「Compose post from selection」；加了「Post current block」（命令 + 左侧功能区纸飞机按钮 + 右键菜单）：光标在列表项里取这一项连同子项，在段落里取整段，去掉列表符号、TODOseq 关键词、双链和粗体高亮记号后带进撰写框，嵌入的图片变附件，发完在这一块第一行末尾（块 id 前）打 #tweeted；各个动作有轻声的合成音效（加帖、删帖、换顺序、拆帖、加图、超限、发出、发成功），设置里能关 | ★★ | X 开发者账号的 API 密钥 |

### 附：没改代码、只固定了版本的社区插件

| 插件 | 作用 | 推荐度 | 需要什么 |
|---|---|---|---|
| **Breadcrumbs**<br>[`breadcrumbs`](breadcrumbs) | 没改代码，只把版本固定住，不让插件市场自动更新 | — | 无 |

### 已拆成单独仓库的插件

这些插件各有自己的仓库（含 Release，可用 BRAT 安装），这里不再放代码。

| 插件 | 作用 | 仓库 |
|---|---|---|
| **Agent Deck** | Track Claude Code, Codex, WorkBuddy and DeepSeek Harness; drag sessions onto note items and items onto agents; keep agent status in the macOS menu bar. | [MatsuriMW/obsidian-agent-deck](https://github.com/MatsuriMW/obsidian-agent-deck) |
| **Card Walk** | 刷卡：从库里抽 #card 卡片和 ==挖空==，在侧栏一张张揭开、作答，排程走 Anki。手机上也能刷，作答经 Upstash 中转几秒内进电脑上的 Anki；面板顶上一条同步状态，每次作答「已记 → 已到中转 → 已进 Anki」三步看得见，别的设备刚答过的卡会当场变灰。中英文界面，单独仓库发布 | [MatsuriMW/card-walk](https://github.com/MatsuriMW/card-walk) |
| **Chrome Tab Groups** | Chrome 式标签页分组：命名、配色、折叠、整组拖动、移到新窗口，右键菜单也和 Chrome 一样 | [MatsuriMW/obsidian-chrome-tab-groups](https://github.com/MatsuriMW/obsidian-chrome-tab-groups) |
| **Emacs Logseq Inspired Outline** | 受 Logseq 和 Emacs 启发的大纲编辑：Esc 选中整块，↑↓ 在块之间移动；选中文字后输入括号、引号会把文字包起来；⌘K 插分割线；⌘⌥↑ 跳到母块（光标停在母块末尾）、⌘Enter 在同级末尾新建块（有序列表接着编号）、把几块收进一个新母块；块可以在无序列表、有序列表（1. / 4.1 / a.）和普通段落之间转换，⌘\ 一键循环切换 | [MatsuriMW/emacs-logseq-inspired-outline](https://github.com/MatsuriMW/emacs-logseq-inspired-outline) |
| **Hover Outline** | 编辑区角落的隐藏式目录（仿 Claude Code，位置可选左 / 右 × 上 / 中 / 下，默认左中）：平时只有一列短横线，鼠标移上去展开，点一下跳过去并把那一行停在正中 | [MatsuriMW/hover-outline](https://github.com/MatsuriMW/hover-outline) |
| **Logseq Style Alias** | Make [[alias]] links open the page that has the alias, the way Logseq does, instead of creating an empty page. | [MatsuriMW/logseq-style-alias](https://github.com/MatsuriMW/logseq-style-alias) |
| **Logseq Style Fold** | Remember how list items are folded by writing a Logseq-style collapsed:: true line into the note, hidden from view. The marker text is configurable. | [MatsuriMW/logseq-style-fold](https://github.com/MatsuriMW/logseq-style-fold) |
| **Nautilus Spiral** | A spiral day planner driven by your daily note: events stay pinned, to-dos flow from now into the free gaps, and time spent in AI agent sessions can be logged back as DOING and PAUSED tasks. Interface in Chinese. | [MatsuriMW/nautilus-spiral](https://github.com/MatsuriMW/nautilus-spiral) |
| **Roam Backlinks** | Edit backlinks in place, block by block, just like in Logseq and Roam Research, with breadcrumbs that expand context, relevance sorting, co-mention filters and PDF export with backlinks. | [MatsuriMW/roam-backlinks](https://github.com/MatsuriMW/roam-backlinks) |
| **Telegram Companion** | Capture Telegram messages into your daily note, and chat with a bot that has read your recent notes. It keeps a profile note about you and works with the model you choose. | [MatsuriMW/telegram-companion](https://github.com/MatsuriMW/telegram-companion) |
| **Token Receipt** | Turn a day of Claude Code, Codex and WorkBuddy token usage into a shop receipt: tokens by model, cost at API prices, plan limits. Watch it print, pick a scene, then copy it or save it as an image or animated SVG. Reads local session logs only. | [MatsuriMW/token-receipt](https://github.com/MatsuriMW/token-receipt) |

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
