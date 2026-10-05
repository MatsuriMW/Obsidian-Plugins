// 段落块 → 层级列表（⌘⌥L）
//   · 只整理光标所在的那一个块：光标在列表项里 = 这一项连同它的子项；否则 = 光标所在的那一段（空行之间）
//   · 交给本机 Claude（claude -p，和 journal-tidy 同一套调用方式）拆成列表。层级按 backlink-defaults 改过的反链面板来定，
//     不按排版美观：链接写在哪一项，那一项连同全部子项就是该页反链里的一条（母项只显示成面包屑，子树里重复的链接会被并掉）。
//     所以引出 [[X]] 的那一项，后面展开讲 X 的内容都挂成它的子项，直到换话题 / 关联变弱再提回上层；
//     顺带提到的概念不链在带着无关子树的项上；同一棵子树里不重复链，隔开后重新展开时再链一次
//   · 原文本来就编号 / 分步骤的用有序列表，其余无序；只重新分层，不删减、不改写观点；分享口令之类的乱码去掉，链接保留
//   · 双链优先用库里已有的页面名 / 别名（先找出原文里出现过的页面名交给 Claude），原文写法和页面名不同时写成 [[页面名|原文写法]]
//   · 结果先预览：替换原文 / 插在下面（保留原文）/ 取消。替换是一步，⌘Z 可撤回；等结果期间原文被改过就不替换
// 整篇长文（⌘⌥⇧L）：有选中就整理选中的那几行，否则整理整篇（frontmatter 不动），规则和上面同一份 prompt
//   · 按标题 / 段落切成每份约 CHUNK_CHARS 字的几份，并行（PARALLEL 个）交给 Claude，再按原顺序拼回去；代码块原样保留不送
//   · 长文模式下第一层不再只有一个标题项：原文的 # 标题变成母项，没标题的按话题分成几个并列的顶层项
//   · 某一份失败会重试一次，还失败就保留那一份原文并提示；整理中再按一次 ⌘⌥⇧L 取消
//   · 预览后「替换」是一步，⌘Z 可撤回；等结果期间这一范围被改过就不替换，结果复制到剪贴板
const { Plugin, Modal, Notice, MarkdownView, MarkdownRenderer, Component } = require("obsidian");
const { spawn } = require("child_process");
const os = require("os");
const path = require("path");

const CLAUDE = "~/.local/bin/claude";
const TIMEOUT_SEC = 300;
const MAX_CANDIDATES = 120;
const LIST_RE = /^(\s*)([-*+]|\d+[.)])(\s+)/;
const TAB_WIDTH = 4;
const CHUNK_CHARS = 3000;     // 长文每份的目标字数（单个段落超长时那一段单独成一份）
const MIN_SECTION = 800;      // 遇到标题时，当前这份不到这么长就不另起一份，免得一个小标题一份
const PARALLEL = 3;
const FENCE_RE = /^\s*(```|~~~)/;
const HEADING_RE = /^#{1,6}\s/;

function indentWidth(line) {
	let w = 0;
	for (const c of line) { if (c === "\t") w += TAB_WIDTH; else if (c === " ") w += 1; else break; }
	return w;
}

// part：长文模式下的 { index, total, title }，单块模式不传
const PROMPT = (text, candidates, part) => `你是笔记整理助手。下面是我笔记里的一段文字（往往是从视频/文章复制来、被压成一大段的）。请把它整理成 Markdown 层级列表，并给核心概念加双链。

## 分层的目的（最重要）
层级不是为了排版好看，而是为了让每个双链在「反向链接面板」里取出来的那一块正好是在讲这个概念的内容。我的反链面板是这样显示的：
- 某一项里有 [[X]]，X 页面的反链就显示「这一项 + 它下面的全部子项」；它的各级母项只在上方显示成一行灰色路径（每个母项的第一句）。
- 所以：链接写在哪一项，那一项的整棵子树就会出现在 X 的反链里。子树里再链一次 [[X]] 不会另外显示（已经被母项带出来了）。

据此分层：
1. **概念带子块**：某一项引出了 [[X]]，后面接着展开讲 X 的内容（解释、原因、例子、数据、推论），都放成这一项的子项；一直到不再讲 X、转到新话题，或者和 X 的关联明显变弱了，才回到上一层（和这一项并列，或更上层）。
   例：「……这就是[[主权信用货币]]……」后面几句都在讲主权信用货币怎么发行、靠什么担保，这几句就是这一项的子项；后面开始讲黄金了，就回到上层。
2. **顺带提到的概念不要带出无关子树**：如果一项的子项不是在讲 Y，这一项里就不要链 [[Y]]——否则 Y 的反链里会出现一整串无关内容。可以把提到 Y 的那半句断成单独一项（没有子项，或子项正是讲 Y 的），在那里链；拆不开就不链。
3. **同一棵子树里不重复链**：X 已经在某一项链过，它的子孙项里不再链 X。但隔开一段之后又重新展开讲 X（不在那一项的子树里），在新展开的那一项再链一次，这样反链里会多出一条独立的引用。
4. **母项的第一句要能当路径看**：母项会在反链上方显示成一行路径，所以作为母项的那一句尽量是概括性的、短一点的句子（只是断句方式的选择，不改原话）。
${part ? `5. 这是一篇长文${part.title ? `《${part.title}》` : ""}的第 ${part.index}/${part.total} 部分，其他部分会另外整理、再按顺序拼在一起，所以不要给这一部分加总标题，也不要写「本部分」之类的话。第一层按原文结构来：原文里有「#」开头的标题，标题去掉 # 号当母项（标题级别越高层级越靠外），下面的内容挂成它的子项；没有标题的，按话题分成几个并列的第一层项，每项用该话题开头那句概括性的原话当母项。顶层项的链接会把它整棵子树带进反链，所以只链这棵子树真正的主题。层级最多 6 层。` : "5. 第一层只有一项：这段话的标题/主题（用原文开头的标题句）。这一项的链接会把整篇带进反链，所以只链整段话真正的总主题，别的概念不要链在标题上。层级最多 6 层。"}

## 其他要求
6. 只重新分层和断句，**不删减信息、不改写观点、不添加原文没有的内容**，尽量保留原话。
7. 原文本来就带编号、或者明显是并列要点/步骤的，用有序列表「1. 2. 3.」；其余用无序列表「- 」。原文里的「•」「1、」「四、」之类的记号换成对应的列表写法，不要重复保留。
8. 双链只给真正的关键概念/人名/机构/术语（一般 5～15 个），普通词不要链。下面「库里已有的页面」如果和某个概念对应，优先用它：原文写法和页面名一样就写 [[页面名]]，不一样就写 [[页面名|原文写法]]。库里没有、但确实是核心概念的，也可以直接写 [[概念名]]。原文里已有的 [[ ]] 保持不变。注意：有些别名指向的页面意思更窄或不同（比如「美元」是「美元指数」的别名、「泡沫」是「互联网泡沫」的别名），这种对不上的不要硬套，直接写 [[原词]] 或不链。
9. 抖音/小红书的分享口令、「复制此链接…」、随机字符这类乱码去掉；链接 URL 保留，单独作为最后一个子项「来源：URL」。
10. 每一级缩进用一个 Tab。
11. **只输出整理后的列表本身**，不要代码块、不要任何解释。

库里已有的页面（名字或别名，出现在原文里的）：
${candidates.length ? candidates.join("、") : "（无）"}

原文：
${text}`;

module.exports = class OutlineBlock extends Plugin {
	onload() {
		this.addCommand({
			id: "outline-current-block",
			name: "把光标所在的段落块整理成层级列表（含双链）",
			hotkeys: [{ modifiers: ["Mod", "Alt"], key: "L" }],
			editorCallback: (editor, view) => this.run(editor, view),
		});
		this.addCommand({
			id: "outline-whole-note",
			name: "把整篇笔记（或选中的部分）整理成层级列表（含双链）",
			hotkeys: [{ modifiers: ["Mod", "Alt", "Shift"], key: "L" }],
			editorCallback: (editor, view) => this.runArticle(editor, view),
		});
		this.children = new Set();
	}

	onunload() {
		for (const c of this.children) c.kill();
	}

	// 光标所在的块：列表项 = 自己 + 所有更深的子行；否则 = 空行之间的那一段
	blockAt(editor) {
		const n = editor.lineCount();
		const cur = editor.getCursor().line;
		const line = (i) => editor.getLine(i);
		if (!line(cur).trim()) return null;
		let start = cur;
		if (!LIST_RE.test(line(cur))) {
			// 续行：往上找到它所属的列表项；遇到空行或顶格普通段落就按普通段落处理
			let i = cur;
			while (i > 0 && line(i - 1).trim() && !LIST_RE.test(line(i))) i--;
			start = i;
		}
		const isList = LIST_RE.test(line(start));
		let end = start;
		if (isList) {
			const w0 = indentWidth(line(start));
			for (let i = start + 1; i < n; i++) {
				const l = line(i);
				if (!l.trim()) break;
				if (indentWidth(l) > w0 || (!LIST_RE.test(l) && indentWidth(l) > 0)) end = i; else break;
			}
		} else {
			while (end + 1 < n && line(end + 1).trim() && !LIST_RE.test(line(end + 1))) end++;
		}
		const lines = [];
		for (let i = start; i <= end; i++) lines.push(line(i));
		const indent = isList ? line(start).match(LIST_RE)[1] : "";
		return { start, end, lines, indent, isList };
	}

	// 库里在这段文字里出现过的页面名 / 别名（不含日记、太短的名字），长的优先
	candidates(text) {
		const low = text.toLowerCase();
		const seen = new Map();
		for (const f of this.app.vault.getMarkdownFiles()) {
			if (/^\d{4}[_-]\d{1,2}[_-]\d{1,2}$/.test(f.basename)) continue;
			const fm = (this.app.metadataCache.getFileCache(f) || {}).frontmatter || {};
			const al = fm.aliases == null ? (fm.alias == null ? [] : fm.alias) : fm.aliases;
			const names = [f.basename, ...(Array.isArray(al) ? al : String(al).split(",")).map((x) => String(x).trim())];
			names.forEach((n, i) => {
				if (!n || n.length < 2 || /^[\d\s.\-_]+$/.test(n)) return;
				if (!low.includes(n.toLowerCase())) return;
				// 英文名要作为完整单词出现：免得 https 里的「ps」、MLF 里的「ml」被当成概念
				if (/^[\x00-\x7f]+$/.test(n) && !new RegExp(`(?<![A-Za-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9])`, "i").test(text)) return;
				seen.set(n, i === 0 ? n : `${n}（别名，页面是「${f.basename}」）`);
			});
		}
		return [...seen.entries()].sort((a, b) => b[0].length - a[0].length).slice(0, MAX_CANDIDATES).map((x) => x[1]);
	}

	callClaude(prompt) {
		return new Promise((resolve, reject) => {
			const bin = CLAUDE.replace(/^~(?=\/)/, os.homedir());
			const args = ["-p", "--output-format", "json", "--no-session-persistence", "--strict-mcp-config"];
			const env = { ...process.env, PATH: [path.join(os.homedir(), ".local/bin"), "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", process.env.PATH || ""].join(":") };
			let child;
			try { child = spawn(bin, args, { cwd: os.tmpdir(), env }); }
			catch (e) { return reject(new Error(`启动 claude 失败（${bin}）：${e.message}`)); }
			this.children.add(child);
			let out = "", err = "";
			const timer = setTimeout(() => { child.kill(); reject(new Error(`等了 ${TIMEOUT_SEC} 秒没有结果，已放弃`)); }, TIMEOUT_SEC * 1000);
			child.stdout.on("data", (d) => (out += d));
			child.stderr.on("data", (d) => (err += d));
			child.on("error", (e) => { clearTimeout(timer); reject(new Error(`启动 claude 失败（${bin}）：${e.message}`)); });
			child.on("close", (code) => {
				clearTimeout(timer);
				this.children.delete(child);
				if (this.cancelled) return reject(new Error("已取消"));
				let d;
				try { d = JSON.parse(out); } catch (e) { return reject(new Error((err || out || `claude 退出码 ${code}`).trim().slice(0, 300))); }
				if (d.is_error) return reject(new Error(String(d.result || "claude 返回错误").slice(0, 300)));
				resolve(String(d.result || ""));
			});
			child.stdin.end(prompt);
		});
	}

	// 整理结果规范化：去掉代码块围栏，缩进统一成 Tab，整体挪到原块的缩进下
	normalize(result, baseIndent) {
		let lines = result.replace(/\r/g, "").replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/, "").split("\n").filter((l) => l.trim());
		const spaceIndents = lines.map((l) => (l.match(/^ +/) || [""])[0].length).filter((n) => n > 0);
		const unit = spaceIndents.length ? Math.min(...spaceIndents) : 4;
		lines = lines.map((l) => {
			const m = l.match(/^[ \t]*/)[0];
			let level = 0, sp = 0;
			for (const c of m) { if (c === "\t") level++; else sp++; }
			level += Math.round(sp / unit);
			return baseIndent + "\t".repeat(level) + l.trimStart();
		});
		return lines;
	}

	// 一段文字 → 规范化好的列表行（快捷键和测试共用这一条路径）
	async outline(text, baseIndent, part) {
		const result = await this.callClaude(PROMPT(text, this.candidates(text), part));
		const lines = this.normalize(result, baseIndent);
		if (!lines.length || !LIST_RE.test(lines[0])) throw new Error("返回的不是列表：" + result.slice(0, 120));
		return lines;
	}

	// 长文要整理的范围：有选中 = 选中涉及的整行；否则 = 整篇去掉 frontmatter
	articleRange(editor) {
		const n = editor.lineCount();
		if (editor.somethingSelected()) {
			const a = editor.getCursor("from"), b = editor.getCursor("to");
			let end = b.line;
			if (b.ch === 0 && end > a.line) end--;   // 选到下一行行首不算那一行
			return { start: a.line, end };
		}
		let start = 0;
		if (editor.getLine(0) === "---") {
			for (let i = 1; i < n; i++) if (/^(---|\.\.\.)\s*$/.test(editor.getLine(i))) { start = i + 1; break; }
		}
		while (start < n && !editor.getLine(start).trim()) start++;
		let end = n - 1;
		while (end > start && !editor.getLine(end).trim()) end--;
		return start < n && editor.getLine(start).trim() ? { start, end } : null;
	}

	// 行 → 份：先按空行切成段（代码块整个算一段、原样保留），再按标题 / 字数拼成每份约 CHUNK_CHARS 字
	splitArticle(lines) {
		const units = [];
		let buf = [], fence = null;
		const flush = () => { if (buf.length) units.push({ text: buf.join("\n") }); buf = []; };
		for (const l of lines) {
			if (fence) {
				buf.push(l);
				if (l.trim().startsWith(fence)) { units.push({ text: buf.join("\n"), verbatim: true }); buf = []; fence = null; }
				continue;
			}
			const m = l.match(FENCE_RE);
			if (m) { flush(); fence = m[1]; buf.push(l); continue; }
			if (!l.trim()) { flush(); continue; }
			if (HEADING_RE.test(l)) { flush(); units.push({ text: l, heading: true }); continue; }
			buf.push(l);
		}
		if (fence) units.push({ text: buf.join("\n"), verbatim: true }); else flush();

		const chunks = [];
		let cur = [], size = 0;
		const close = () => { if (cur.length) chunks.push({ text: cur.join("\n\n") }); cur = []; size = 0; };
		for (const u of units) {
			if (u.verbatim) { close(); chunks.push({ text: u.text, verbatim: true }); continue; }
			if (cur.length && ((u.heading && size >= MIN_SECTION) || size + u.text.length > CHUNK_CHARS)) {
				// 结尾的标题跟着下面的正文走，不留在上一份
				const carry = [];
				while (cur.length && HEADING_RE.test(cur[cur.length - 1]) && !cur[cur.length - 1].includes("\n")) carry.unshift(cur.pop());
				close();
				cur = carry;
				size = carry.reduce((a, t) => a + t.length, 0);
			}
			cur.push(u.text);
			size += u.text.length;
		}
		close();
		return chunks;
	}

	async runArticle(editor, view) {
		if (this.busy === "article") {
			this.cancelled = true;
			for (const c of this.children) c.kill();
			return new Notice("已取消整篇整理");
		}
		if (this.busy) return new Notice("上一段还在整理中…");
		const range = this.articleRange(editor);
		if (!range) return new Notice("没有可整理的内容");
		const orig = [];
		for (let i = range.start; i <= range.end; i++) orig.push(editor.getLine(i));
		const m = orig[0].match(LIST_RE);
		const baseIndent = editor.somethingSelected() && m ? m[1] : "";
		const chunks = this.splitArticle(orig.map((l) => l.startsWith(baseIndent) ? l.slice(baseIndent.length) : l));
		const todo = chunks.filter((c) => !c.verbatim && c.text.trim().length >= 40);
		if (!todo.length) return new Notice("内容太短了，不用整理");
		const file = view.file;
		const title = file ? file.basename : "";
		this.busy = "article";
		this.cancelled = false;
		const t0 = Date.now();
		let done = 0;
		const notice = new Notice("", 0);
		const show = () => notice.setMessage(`正在整理整篇（Claude）… ${done}/${todo.length} 份，${Math.round((Date.now() - t0) / 1000)} 秒\n再按 ⌘⌥⇧L 取消`);
		show();
		const tick = window.setInterval(show, 1000);
		const failed = [];
		try {
			let next = 0;
			const worker = async () => {
				while (next < todo.length && !this.cancelled) {
					const i = next++, c = todo[i];
					const part = { index: i + 1, total: todo.length, title };
					try {
						c.lines = await this.outline(c.text, baseIndent, part);
					} catch (e) {
						if (this.cancelled) return;
						try { c.lines = await this.outline(c.text, baseIndent, part); }
						catch (e2) { if (!this.cancelled) failed.push(`第 ${i + 1} 份：${e2.message}`); }
					}
					done++;
				}
			};
			await Promise.all(Array.from({ length: Math.min(PARALLEL, todo.length) }, worker));
		} finally {
			window.clearInterval(tick);
			notice.hide();
			this.busy = false;
		}
		if (this.cancelled) return;
		if (failed.length === todo.length) return new Notice("整理失败：" + failed[0], 10000);
		// 按原顺序拼：列表份之间不空行（保持一整棵列表），原样保留的部分前后空一行
		const out = [];
		let prevList = false;
		for (const c of chunks) {
			const isList = !!c.lines;
			const body = isList ? c.lines : c.text.split("\n").map((l) => baseIndent + l);
			if (out.length && !(isList && prevList)) out.push("");
			out.push(...body);
			prevList = isList;
		}
		if (failed.length) new Notice(`有 ${failed.length} 份没整理成功，预览里保留了那部分原文：\n${failed.join("\n")}`, 15000);
		const block = { start: range.start, end: range.end, lines: orig };
		new PreviewModal(this.app, out.join("\n"), file ? file.path : "", (mode) => this.apply(editor, view, file, block, out, mode), "整篇整理结果预览").open();
	}

	async run(editor, view) {
		if (this.busy) return new Notice("上一段还在整理中…");
		this.cancelled = false;
		const block = this.blockAt(editor);
		if (!block) return new Notice("光标所在的行是空的");
		const text = block.lines.map((l) => l.slice(block.indent.length)).join("\n");
		if (text.trim().length < 40) return new Notice("这一块太短了，不用整理");
		const file = view.file;
		this.busy = true;
		const t0 = Date.now();
		const notice = new Notice("正在整理这一段（Claude）…", 0);
		const tick = window.setInterval(() => notice.setMessage(`正在整理这一段（Claude）… ${Math.round((Date.now() - t0) / 1000)} 秒`), 1000);
		let lines;
		try {
			lines = await this.outline(text, block.indent);
		} catch (e) {
			new Notice("整理失败：" + e.message, 10000);
			return;
		} finally {
			window.clearInterval(tick);
			notice.hide();
			this.busy = false;
		}
		new PreviewModal(this.app, lines.join("\n"), file ? file.path : "", (mode) => this.apply(editor, view, file, block, lines, mode)).open();
	}

	apply(editor, view, file, block, lines, mode) {
		// 等结果期间文件换了 / 这一块被改过：不动原文
		const same = view.file === file && block.end < editor.lineCount()
			&& block.lines.every((l, i) => editor.getLine(block.start + i) === l);
		if (!same) {
			navigator.clipboard.writeText(lines.join("\n")).catch(() => {});
			return new Notice("这一段在整理期间被改过，没有替换。整理结果已复制到剪贴板。", 8000);
		}
		const endCh = editor.getLine(block.end).length;
		if (mode === "replace") {
			editor.transaction({ changes: [{ from: { line: block.start, ch: 0 }, to: { line: block.end, ch: endCh }, text: lines.join("\n") }] });
		} else {
			editor.transaction({ changes: [{ from: { line: block.end, ch: endCh }, text: "\n" + lines.join("\n") }] });
		}
		new Notice(mode === "replace" ? "已替换（⌘Z 可撤回）" : "已插在原文下面");
	}
};

class PreviewModal extends Modal {
	constructor(app, md, sourcePath, onPick, title) {
		super(app);
		this.title = title || "整理结果预览";
		this.md = md;
		this.sourcePath = sourcePath;
		this.onPick = onPick;
	}
	onOpen() {
		this.modalEl.addClass("outline-block-modal");
		this.titleEl.setText(this.title);
		const box = this.contentEl.createDiv({ cls: "outline-block-preview markdown-rendered" });
		this.comp = new Component();
		this.comp.load();
		MarkdownRenderer.render(this.app, this.md, box, this.sourcePath, this.comp);
		const btns = this.contentEl.createDiv({ cls: "modal-button-container" });
		const pick = (mode) => { this.close(); this.onPick(mode); };
		const rep = btns.createEl("button", { text: "替换原文", cls: "mod-cta" });
		rep.addEventListener("click", () => pick("replace"));
		btns.createEl("button", { text: "插在下面（保留原文）" }).addEventListener("click", () => pick("below"));
		btns.createEl("button", { text: "取消" }).addEventListener("click", () => this.close());
		this.scope.register(["Mod"], "Enter", () => { pick("replace"); return false; });
		setTimeout(() => rep.focus(), 0);
	}
	onClose() {
		if (this.comp) this.comp.unload();
		this.contentEl.empty();
	}
}
