// Better Command Palette 文件搜索：⌘⌥↵ 在右侧新拆分视图打开（Open in split view）
//   · 分栏上限 3 栏：已经有 3 栏时不再拆分，改在最右边那一栏开新标签页
//   · 不改 Better Command Palette 本身（它更新会覆盖），在它的面板打开时给这个面板加按键和底部提示
//   · 键位和 Obsidian 自带快速切换器的「在右侧打开」一样
//   · 没有搜索结果时什么都不做（和 ⇧↵ 一样），不会把输入框的字当成新文件名去建文件；新建只用 ⌘↵
//   · 打开逻辑借面板自己的：调用期间把 workspace.openLinkText 的 newLeaf 换成 "split"（默认就是向右拆分）
// 文件名没有匹配时，改做全库内容搜索（相当于把 ⌘⇧F 并进来）：
//   · 输入按空格拆成几个词，笔记正文里每个词都出现才算命中；含全部词的那一行做摘要，词高亮
//   · 排序：有一行同时含全部词的在前，再按出现次数，再按日记日期从新到旧
//   · 结果就是面板里的普通条目：↵ 打开并跳到那一行，⇧↵ 新标签页，⌘⌥↵ 右侧拆分；最后一条「在搜索面板中查看全部」打开 Obsidian 自带的全局搜索
//   · 全文按修改时间缓存在内存里（全库约 13 MB），启动后空闲时先读一遍，之后只读改过的文件
const { Plugin, Modal, MarkdownView } = require("obsidian");

const PALETTE_CLS = "better-command-palette";
const HINT = "Open in split view";
const MAX_COLUMNS = 3;
const CONTENT_LIMIT = 50;
const JOURNAL_RE = /^日记\/(\d{4})_(\d{2})_(\d{2})\.md$/;
const SNIPPET_LEN = 90;
// 和 journal-edit-mode 同一套日记命名：这些笔记直接以编辑模式打开，免得它再切模式、把光标恢复到上次的位置
const JOURNAL_NAME_RE = /^\d{4}[_-]\d{1,2}[_-]\d{1,2}$/;

// 和 leaf 同一个窗口里现在有几栏，以及最右边一栏的标签栏（那一栏上下又分过的，取最近用过的那格）
function columnsOf(ws, leaf) {
	const root = leaf.getRoot();
	const groups = new Set();
	ws.iterateAllLeaves((l) => { if (l.parent && l.getRoot() === root) groups.add(l.parent); });
	const boxes = [...groups].map((g) => ({ g, r: g.containerEl.getBoundingClientRect() })).filter((x) => x.r.width > 0);
	const lefts = [];
	for (const b of boxes) if (!lefts.some((x) => Math.abs(x - b.r.left) < 4)) lefts.push(b.r.left);
	const maxLeft = Math.max(...lefts);
	const recent = (g) => Math.max(0, ...g.children.map((l) => l.activeTime || 0));
	const rightmost = boxes.filter((b) => Math.abs(b.r.left - maxLeft) < 4).map((b) => b.g).sort((a, b) => recent(b) - recent(a))[0];
	return { count: lefts.length, rightmost };
}

module.exports = class PaletteSplitOpen extends Plugin {
	onload() {
		const plugin = this;
		this.textCache = new Map();   // path → { mtime, size, low }
		this.app.workspace.onLayoutReady(() => { this.warmTimer = window.setTimeout(() => this.fillCache(), 8000); });
		this.register(() => window.clearTimeout(this.warmTimer));
		const orig = Modal.prototype.open;
		const patched = function (...args) {
			if (this.modalEl?.hasClass(PALETTE_CLS) && !this.__splitOpen) plugin.enhance(this);
			return orig.apply(this, args);
		};
		Modal.prototype.open = patched;
		this.register(() => { if (Modal.prototype.open === patched) Modal.prototype.open = orig; });
	}

	enhance(palette) {
		palette.__splitOpen = true;
		const isFiles = () => palette.currentAdapter && palette.currentAdapter === palette.fileAdapter;

		palette.scope.register(["Mod", "Alt"], "Enter", (evt) => {
			if (!isFiles()) return;
			evt.preventDefault();
			const list = palette.currentSuggestions || [];
			const item = list[palette.chooser?.selectedItem ?? 0];
			if (item) this.openInSplit(palette, item, evt);
			return false;
		});

		// 底部提示：插在「Open file in new pane」后面；面板切模式时会重建提示，所以包一层
		const origUpdate = palette.updateInstructions;
		palette.updateInstructions = function (...args) {
			const r = origUpdate.apply(this, args);
			if (isFiles()) {
				const box = this.modalEl.querySelector(".prompt-instructions");
				if (box && !box.querySelector(".pso-hint")) {
					const item = box.createDiv({ cls: "prompt-instruction pso-hint" });
					item.createSpan({ cls: "prompt-instruction-command", text: "⌘ ⌥ ↵" });
					item.createSpan({ text: HINT });
					box.insertBefore(item, box.children[2] || null);
				}
			}
			return r;
		};
		palette.updateInstructions();
		this.hookContentSearch(palette, isFiles);
	}

	// ---------- 文件名没匹配 → 全库内容搜索 ----------
	hookContentSearch(palette, isFiles) {
		const plugin = this;
		const adapter = palette.fileAdapter;
		palette.__csToken = 0;

		const origReceived = palette.receivedSuggestions;
		palette.receivedSuggestions = function (...args) {
			origReceived.apply(this, args);
			if (isFiles()) plugin.scheduleContentSearch(palette);
		};

		const origRender = adapter.renderSuggestion;
		adapter.renderSuggestion = function (item, content, aux) {
			if (!item || !item.__cs) return origRender.call(this, item, content, aux);
			plugin.renderHit(item, content, aux);
		};

		const origChoose = adapter.onChooseSuggestion;
		adapter.onChooseSuggestion = function (item, evt) {
			if (!item || !item.__cs) return origChoose.call(this, item, evt);
			return plugin.openHit(palette, item, evt);
		};
	}

	queryOf(palette) {
		return palette.fileAdapter.cleanQuery((palette.inputEl.value || "").trim()).trim();
	}

	scheduleContentSearch(palette) {
		window.clearTimeout(palette.__csTimer);
		const token = ++palette.__csToken;
		const q = this.queryOf(palette);
		if (palette.__csEmpty === undefined) palette.__csEmpty = palette.emptyStateText;
		if (!q || (palette.currentSuggestions && palette.currentSuggestions.length)) { palette.emptyStateText = palette.__csEmpty; return; }
		palette.emptyStateText = `文件名里没有「${q}」，正在全文搜索…`;
		palette.updateSuggestions();
		palette.__csTimer = window.setTimeout(async () => {
			const hits = await this.contentSearch(q);
			if (token !== palette.__csToken || !palette.modalEl.isConnected) return;   // 期间又改了输入，或面板关了
			const Item = palette.fileAdapter.allItems[0] && palette.fileAdapter.allItems[0].constructor;
			if (!Item) return;
			const items = hits.map((h) => Object.assign(new Item(h.path, h.path, []), { __cs: h }));
			if (items.length) items.push(Object.assign(new Item("__pso_global_search__", "", []), { __cs: { panel: true, q } }));
			palette.currentSuggestions = items;
			palette.limit = items.length;
			palette.emptyStateText = items.length ? palette.__csEmpty : `文件名和正文里都没有「${q}」`;
			palette.updateSuggestions();
		}, 200);
	}

	async fillCache(files) {
		files = files || this.app.vault.getMarkdownFiles();
		const todo = files.filter((f) => { const c = this.textCache.get(f.path); return !c || c.mtime !== f.stat.mtime || c.size !== f.stat.size; });
		for (let i = 0; i < todo.length; i += 100) {
			await Promise.all(todo.slice(i, i + 100).map(async (f) => {
				try {
					const text = await this.app.vault.cachedRead(f);
					this.textCache.set(f.path, { mtime: f.stat.mtime, size: f.stat.size, low: text.toLowerCase() });
				} catch (e) { /* 读不了的跳过 */ }
			}));
		}
	}

	async contentSearch(q) {
		const terms = [...new Set(q.toLowerCase().split(/\s+/).filter(Boolean))];
		if (!terms.length) return [];
		const files = this.app.vault.getMarkdownFiles();
		await this.fillCache(files);
		const hits = [];
		for (const f of files) {
			const c = this.textCache.get(f.path);
			if (!c || !terms.every((t) => c.low.includes(t))) continue;
			const lines = c.low.split("\n");
			let best = 0, bestN = 0;
			for (let i = 0; i < lines.length; i++) {
				const n = terms.filter((t) => lines[i].includes(t)).length;
				if (n > bestN) { best = i; bestN = n; if (n === terms.length) break; }
			}
			let count = 0;
			for (let at = c.low.indexOf(terms[0]); at >= 0 && count < 99; at = c.low.indexOf(terms[0], at + terms[0].length)) count++;
			const m = f.path.match(JOURNAL_RE);
			hits.push({ path: f.path, file: f, line: best, allInLine: bestN === terms.length, count, date: m ? +(m[1] + m[2] + m[3]) : 0, terms });
		}
		hits.sort((a, b) => (b.allInLine - a.allInLine) || (b.count - a.count) || (b.date - a.date) || a.path.localeCompare(b.path, "zh"));
		const top = hits.slice(0, CONTENT_LIMIT);
		// 摘要取原文（保留大小写），只读命中的这几篇
		await Promise.all(top.map(async (h) => {
			const text = await this.app.vault.cachedRead(h.file);
			h.snippet = this.snippet((text.split("\n")[h.line] || "").trim(), terms);
		}));
		return top;
	}

	// 一行摘要：去掉列表记号，太长就以第一个命中词为中心截一段
	snippet(line, terms) {
		line = line.replace(/^([-*+]|\d+[.)])\s+(\[.\]\s+)?/, "");
		if (line.length <= SNIPPET_LEN) return line;
		const low = line.toLowerCase();
		const at = Math.max(0, Math.min(...terms.map((t) => { const i = low.indexOf(t); return i < 0 ? Infinity : i; })));
		const start = Math.max(0, Math.min(at - 20, line.length - SNIPPET_LEN));
		return (start > 0 ? "…" : "") + line.slice(start, start + SNIPPET_LEN) + (start + SNIPPET_LEN < line.length ? "…" : "");
	}

	renderHit(item, content, aux) {
		const h = item.__cs;
		aux.empty();   // 去掉「隐藏这一项」的叉
		if (h.panel) {
			content.createDiv({ cls: "suggestion-title", text: `🔍 在搜索面板中查看「${h.q}」的全部结果` });
			content.createDiv({ cls: "suggestion-note", text: "Obsidian 全局搜索（⌘⇧F），支持 path: tag: 等搜索语法" });
			return;
		}
		content.createDiv({ cls: "suggestion-title", text: h.path.replace(/\.md$/, "") });
		const note = content.createDiv({ cls: "suggestion-note pso-snippet" });
		const s = h.snippet || "", low = s.toLowerCase();
		const marks = [];
		for (const t of h.terms) for (let i = low.indexOf(t); i >= 0; i = low.indexOf(t, i + t.length)) marks.push([i, i + t.length]);
		marks.sort((a, b) => a[0] - b[0]);
		let pos = 0;
		for (const [a, b] of marks) {
			if (a < pos) continue;
			if (a > pos) note.appendText(s.slice(pos, a));
			note.createSpan({ cls: "suggestion-highlight", text: s.slice(a, b) });
			pos = b;
		}
		note.appendText(s.slice(pos));
		aux.createSpan({ cls: "suggestion-flair", text: `L${h.line + 1}` });
	}

	async openHit(palette, item, evt) {
		const h = item.__cs;
		if (h.panel) {
			const gs = this.app.internalPlugins.getPluginById("global-search");
			if (gs && gs.instance) gs.instance.openGlobalSearch(h.q);
			return;
		}
		const mod = palette.plugin && palette.plugin.settings && palette.plugin.settings.openInNewTabMod;
		const newLeaf = !!evt && (mod === "Shift" ? evt.shiftKey : (evt.metaKey || evt.ctrlKey));
		const ws = this.app.workspace;
		const shows = () => { const out = []; ws.iterateAllLeaves((l) => { if (l.view instanceof MarkdownView && l.view.file && l.view.file.path === h.path) out.push(l); }); return out; };
		const before = new Set(shows());
		const journal = JOURNAL_NAME_RE.test(h.file.basename);
		await ws.openLinkText(h.path, "", newLeaf, journal ? { state: { mode: "source" }, eState: { line: h.line } } : { eState: { line: h.line } });
		// 光标放到命中那一行并选中第一个命中词（只给 line 的话 Obsidian 只滚动，光标还在上次的位置）。
		// 新标签页刚打开时不一定是当前标签页，所以按「打开前后多出来的那个」找；没多出来就是在原标签页里打开的
		const now = shows();
		const leaf = now.find((l) => !before.has(l)) || now.sort((a, b) => (b.activeTime || 0) - (a.activeTime || 0))[0];
		if (!leaf) return;
		ws.setActiveLeaf(leaf, { focus: true });
		const place = () => {
			const ed = leaf.view && leaf.view.editor;
			if (!ed || h.line >= ed.lineCount()) return null;
			const low = ed.getLine(h.line).toLowerCase();
			const t = h.terms.find((x) => low.includes(x));
			const ch = t ? low.indexOf(t) : 0;
			const from = { line: h.line, ch }, to = { line: h.line, ch: ch + (t ? t.length : 0) };
			ed.setSelection(from, to);
			ed.scrollIntoView({ from, to }, true);
			return ed;
		};
		const ed = place();
		// 别的插件切模式时可能把光标恢复到上次的位置：过一会儿看一眼，被挪走了就再放回来
		if (ed) window.setTimeout(() => { const e = leaf.view && leaf.view.editor; if (e && e.getCursor("from").line !== h.line && !e.somethingSelected()) place(); }, 250);
	}

	async openInSplit(palette, item, evt) {
		const ws = this.app.workspace;
		const active = ws.getMostRecentLeaf();
		const cols = active ? columnsOf(ws, active) : { count: 0 };
		const own = Object.prototype.hasOwnProperty.call(ws, "openLinkText");
		const prev = ws.openLinkText;
		ws.openLinkText = async function (linktext, sourcePath, newLeaf, state) {
			if (cols.count < MAX_COLUMNS || !cols.rightmost) return prev.call(this, linktext, sourcePath, "split", state);
			// 已经 3 栏：在最右边一栏、它当前标签页的右边开新标签页
			const tabs = cols.rightmost;
			const leaf = ws.createLeafInParent(tabs, tabs.currentTab + 1);
			await leaf.openLinkText(linktext, sourcePath, state);
			ws.setActiveLeaf(leaf, { focus: true });
		};
		try {
			palette.close(evt);
			await palette.currentAdapter.onChooseSuggestion(item, evt);
		} finally {
			if (own) ws.openLinkText = prev; else delete ws.openLinkText;
		}
	}
};
