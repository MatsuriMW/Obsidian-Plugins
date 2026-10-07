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
// Tab 递进加一层全文搜索（文件名有匹配时也能搜正文）：
//   · 第一次按 Tab：文件名结果不动，正文命中接在下面（已经在文件名结果里的笔记不重复列）；之后继续改输入，这一层一直开着，直到面板关掉
//   · 正文结果已经在面板里时再按 Tab：打开 Obsidian 自带的全局搜索（⌘⇧F）接着搜，面板关掉
// 限定范围的搜索（三条命令，快捷键默认 ⌘⇧O / ⌘⇧M / ⌘⇧K，可在设置里改；面板开着时按同样的键切换范围，再按一次取消）：
//   · Wiki 条目：只在 Wiki/ 下「（wiki）」页里搜，文件名 + 正文
//   · 书签：只在书签里的笔记（含书签分组、书签文件夹里的笔记）里搜，文件名 + 正文
//   · 卡片：搜 Flashcards 插件认作卡片的块：带 #card（含 -reverse、/reverse、-reminder）的，或有挖空（==高亮== / {{c1::…}}）的；
//     规则照 Flashcards：列表项、段落、标题都算一块，引用块和代码块里的不算。没输入时按日期从新到旧列出；↵ 跳到那一块
//   · 输入框前面有范围标签，点 × 或在空输入框里按 ⌫ 回到普通文件搜索
const { Plugin, Modal, MarkdownView, Notice } = require("obsidian");

const PALETTE_CLS = "better-command-palette";
const HINT = "Open in split view";
const CS_HINT = "全文搜索，再按打开搜索面板";
const MAX_COLUMNS = 3;
const CONTENT_LIMIT = 50;
const JOURNAL_RE = /^日记\/(\d{4})_(\d{2})_(\d{2})\.md$/;
const SNIPPET_LEN = 90;
// 和 journal-edit-mode 同一套日记命名：这些笔记直接以编辑模式打开，免得它再切模式、把光标恢复到上次的位置
const JOURNAL_NAME_RE = /^\d{4}[_-]\d{1,2}[_-]\d{1,2}$/;
const BCP_FILE_SEARCH = "obsidian-better-command-palette:open-better-commmand-palette-file-search";
const WIKI_DIR = "Wiki/";
const SCOPES = {
	wiki: { label: "Wiki 条目", name: "文件搜索：Wiki 条目", hotkey: { modifiers: ["Mod", "Shift"], key: "O" }, empty: "Wiki 里没有匹配的条目", placeholder: "在 Wiki 条目里搜索（文件名和正文）" },
	bookmarks: { label: "书签", name: "文件搜索：书签里的笔记", hotkey: { modifiers: ["Mod", "Shift"], key: "M" }, empty: "书签里没有匹配的笔记", placeholder: "在书签里的笔记里搜索（文件名和正文）" },
	cards: { label: "卡片", name: "文件搜索：#card 和挖空卡片", hotkey: { modifiers: ["Mod", "Shift"], key: "K" }, empty: "没有匹配的卡片", placeholder: "搜索 #card 和挖空卡片（正面、答案、文件名）" },
};
const CARD_LIMIT = 50;
const CARD_TAG_RE = /(?:^|\s)#card(-reminder|-reverse|\/reverse)?(?![\w\-\/])/;
const CARD_TAG_ALL_RE = /(?:^|\s)#card(?:-reminder|-reverse|\/reverse)?(?![\w\-\/])/g;
const CLOZE_RE = /==[^=\n]+==|\{\{c\d+::/;
const CLOZE_SPLIT_RE = /(==[^=\n]+==|\{\{c\d+::[\s\S]*?\}\})/;
const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(\[.\]\s+)?/;
const ANCHOR_END_RE = /\s*\^[A-Za-z0-9-]+\s*$/;
const SYNCED_RE = /\^(q-[a-z0-9]{4}|\d{13})\s*$/;
const MOD_SYM = { Mod: "⌘", Ctrl: "⌃", Meta: "⌘", Alt: "⌥", Shift: "⇧" };
const fmtHotkey = (h) => [...h.modifiers.map((m) => MOD_SYM[m] || m), h.key.length === 1 ? h.key.toUpperCase() : h.key].join("");
// BCP 的文件条目：id 是路径，别名条目是「别名:路径」
const itemPath = (it) => (it.id.includes(":") ? it.id.slice(it.id.lastIndexOf(":") + 1) : it.id);
// 卡片预览去掉 Markdown 记号：[[页|别名]] → 别名，[字](网址) → 字，加粗 / 斜体记号去掉；==挖空== 留着
const plainMd = (s) => s
	.replace(/^#{1,6}\s+/, "")
	.replace(/!?\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
	.replace(/!?\[\[([^\]]+)\]\]/g, (m, t) => t.replace(/#\^?/, " > "))
	.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
	.replace(/(\*\*|__)(.+?)\1/g, "$2")
	.replace(/\s+/g, " ")
	.trim();

// 按 Flashcards 插件的规则找卡片：列表项（连同它的续行）、段落、标题各算一块；引用块、代码块跳过
function parseCards(text) {
	const lines = text.split("\n");
	let i = 0;
	if (lines[0] === "---") { i = 1; while (i < lines.length && lines[i] !== "---") i++; i++; }
	const units = [];
	let cur = null, fence = false;
	const indentOf = (s) => s.match(/^\s*/)[0].replace(/\t/g, "    ").length;
	for (; i < lines.length; i++) {
		const l = lines[i], t = l.trim();
		if (/^(```|~~~)/.test(t)) { fence = !fence; cur = null; continue; }
		if (fence) continue;
		if (!t) { cur = null; continue; }
		// 单独一行的块 id：挂在上一块上（Obsidian 也是这么算的），^q-xxxx 说明已同步到 Anki
		if (/^\^[A-Za-z0-9-]+$/.test(t)) { if (SYNCED_RE.test(t) && units.length) units[units.length - 1].synced = true; cur = null; continue; }
		const m = l.match(LIST_RE);
		if (m) { cur = { line: i, indent: indentOf(l), list: true, lines: [l.slice(m[0].length)] }; units.push(cur); continue; }
		if (/^#{1,6}\s/.test(t)) { cur = null; units.push({ line: i, indent: 0, lines: [t.replace(/^#+\s+/, "")] }); continue; }
		if (cur) { cur.lines.push(t); continue; }
		cur = { line: i, indent: indentOf(l), lines: [t], quote: t.startsWith(">") };
		units.push(cur);
	}
	const cards = [];
	units.forEach((u, k) => {
		if (u.quote) return;
		const raw = u.lines.join("\n");
		const bare = raw.replace(/`[^`\n]*`/g, "");
		const tag = bare.match(CARD_TAG_RE);
		if (!tag && !CLOZE_RE.test(bare)) return;
		const kind = tag ? ({ "-reverse": "反转", "/reverse": "反转", "-reminder": "提醒" }[tag[1]] || "#card") : "挖空";
		const synced = !!u.synced || u.lines.some((x) => SYNCED_RE.test(x));
		const clean = (ls) => plainMd(ls.map((x) => x.replace(ANCHOR_END_RE, "").replace(CARD_TAG_ALL_RE, "")).join(" "));
		const front = clean(u.lines);
		// 答案预览：#card 列表项的前两个子项
		const kids = [];
		if (u.list) for (let j = k + 1; j < units.length && units[j].indent > u.indent && kids.length < 2; j++) {
			if (units[j].list) kids.push(clean(units[j].lines));
		}
		cards.push({ line: u.line, kind, synced, front, answer: kids.join("；") });
	});
	return cards;
}

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
		this.textCache = new Map();   // path → { mtime, size, low, cards }
		this.pendingScope = null;
		this.app.workspace.onLayoutReady(() => { this.warmTimer = window.setTimeout(() => this.fillCache(), 8000); });
		this.register(() => window.clearTimeout(this.warmTimer));
		for (const [key, s] of Object.entries(SCOPES)) {
			this.addCommand({ id: `search-${key}`, name: s.name, hotkeys: [s.hotkey], callback: () => this.openScoped(key) });
		}
		const orig = Modal.prototype.open;
		const patched = function (...args) {
			if (this.modalEl?.hasClass(PALETTE_CLS)) {
				if (!this.__splitOpen) plugin.enhance(this);
				plugin.setScope(this, plugin.pendingScope, false);   // 每次打开面板都从只搜文件名开始（除非是范围搜索命令打开的）
				plugin.pendingScope = null;
			}
			return orig.apply(this, args);
		};
		Modal.prototype.open = patched;
		this.register(() => { if (Modal.prototype.open === patched) Modal.prototype.open = orig; });
	}

	enhance(palette) {
		const plugin = this;
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

		// Tab：没开全文层就开；正文结果已经在面板里了就交给 Obsidian 自带的全局搜索
		palette.scope.register([], "Tab", (evt) => {
			if (!isFiles()) return;
			evt.preventDefault();
			const q = this.queryOf(palette);
			if (!q) return false;
			if (palette.__csShown || palette.__scope === "cards") {
				palette.close();
				this.openGlobalSearch(this.globalQuery(palette, q));
			} else {
				palette.__csLayer = true;
				this.scheduleContentSearch(palette, 0);
			}
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
					const tab = box.createDiv({ cls: "prompt-instruction pso-hint" });
					tab.createSpan({ cls: "prompt-instruction-command", text: "⇥" });
					tab.createSpan({ text: CS_HINT });
					box.insertBefore(tab, item.nextSibling);
					const keys = Object.keys(SCOPES).map((k) => plugin.scopeHotkeys(k)[0]).filter(Boolean);
					if (keys.length) {
						const sc = box.createDiv({ cls: "prompt-instruction pso-hint" });
						sc.createSpan({ cls: "prompt-instruction-command", text: keys.map(fmtHotkey).join(" ") });
						sc.createSpan({ text: Object.values(SCOPES).map((s) => s.label).join(" / ") });
						box.insertBefore(sc, tab.nextSibling);
					}
				}
			}
			plugin.renderScope(this);
			return r;
		};

		// 范围标签：放在输入框前面
		const chip = createDiv({ cls: "pso-scope" });
		chip.createSpan({ cls: "pso-scope-label" });
		const x = chip.createSpan({ cls: "pso-scope-x", text: "×" });
		x.addEventListener("mousedown", (e) => { e.preventDefault(); this.setScope(palette, null); });
		palette.inputEl.parentElement.insertBefore(chip, palette.inputEl);
		palette.__scopeEl = chip;

		// 面板里按范围命令的快捷键：切到这个范围，已经是这个范围就取消
		for (const key of Object.keys(SCOPES)) {
			for (const h of this.scopeHotkeys(key)) {
				palette.scope.register(h.modifiers, h.key, (evt) => {
					evt.preventDefault();
					this.setScope(palette, palette.__scope === key ? null : key);
					return false;
				});
			}
		}
		// 空输入框里按 ⌫：先退出范围，不删前缀、不关面板
		palette.inputEl.addEventListener("keydown", (evt) => {
			if (evt.key !== "Backspace" || !palette.__scope || evt.metaKey || evt.altKey) return;
			if (!isFiles() || this.queryOf(palette) !== "" || palette.inputEl.selectionStart !== palette.inputEl.value.length) return;
			evt.preventDefault();
			evt.stopPropagation();
			this.setScope(palette, null);
		});

		// 文件名候选只留范围里的笔记；卡片范围不要文件名候选（结果全是卡片）
		const adapter = palette.fileAdapter;
		const origSorted = adapter.getSortedItems;
		adapter.getSortedItems = function (...args) {
			const items = origSorted.apply(this, args);
			if (!palette.__scope) return items;
			if (palette.__scope === "cards") return [];
			return items.filter((it) => palette.__scopePaths.has(itemPath(it)));
		};

		palette.updateInstructions();
		this.hookContentSearch(palette, isFiles);
	}

	// ---------- 限定范围 ----------
	scopeHotkeys(key) {
		const id = `${this.manifest.id}:search-${key}`;
		const hm = this.app.hotkeyManager;
		return (hm.getHotkeys(id) || hm.getDefaultHotkeys(id) || []).filter((h) => h && h.key);
	}

	openScoped(key) {
		if (!this.app.commands.findCommand(BCP_FILE_SEARCH)) { new Notice("需要先启用 Better Command Palette"); return; }
		this.pendingScope = key;
		try { this.app.commands.executeCommandById(BCP_FILE_SEARCH); } finally { this.pendingScope = null; }
	}

	scopePaths(key) {
		const files = this.app.vault.getMarkdownFiles();
		if (key === "wiki") return new Set(files.filter((f) => f.path.startsWith(WIKI_DIR) && f.basename.endsWith("（wiki）")).map((f) => f.path));
		if (key === "bookmarks") {
			const out = new Set();
			const bm = this.app.internalPlugins.getPluginById("bookmarks");
			const walk = (items) => {
				for (const it of items || []) {
					if (it.type === "file" && it.path) out.add(it.path);
					else if (it.type === "folder" && it.path) files.forEach((f) => { if (f.path.startsWith(it.path + "/")) out.add(f.path); });
					else if (it.type === "group") walk(it.items);
				}
			};
			walk(bm && bm.enabled && bm.instance ? bm.instance.items : []);
			return out;
		}
		return null;
	}

	// refresh = false：面板还没打开（open 之前调用），交给面板自己的 onOpen 去搜
	setScope(palette, key, refresh = true) {
		key = key && SCOPES[key] ? key : null;
		palette.__scope = key;
		palette.__scopePaths = key ? this.scopePaths(key) : null;
		palette.__csLayer = !!key && key !== "cards";   // Wiki 和书签：文件名和正文一起搜
		palette.__csShown = false;
		palette.__csEmpty = key ? SCOPES[key].empty : (palette.fileAdapter.emptyStateText || "No matching files.");
		if (refresh) palette.emptyStateText = key === "cards" ? "正在读取卡片…" : palette.__csEmpty;
		palette.setPlaceholder(key ? SCOPES[key].placeholder : "Select a command");
		this.renderScope(palette);
		if (!refresh) return;
		const prefix = palette.plugin.settings.fileSearchPrefix;
		const q = palette.inputEl.value;
		if (!q.startsWith(prefix)) palette.inputEl.value = prefix + palette.currentAdapter.cleanQuery(q);
		palette.lastQuery = null;   // 输入没变也让面板重新搜一遍
		palette.currentSuggestions = [];
		palette.updateSuggestions();
		palette.inputEl.focus();
	}

	renderScope(palette) {
		const chip = palette.__scopeEl;
		if (!chip) return;
		const on = !!palette.__scope && palette.currentAdapter === palette.fileAdapter;
		chip.toggleClass("is-shown", on);
		if (on) chip.querySelector(".pso-scope-label").setText(SCOPES[palette.__scope].label);
	}

	// ---------- 文件名没匹配 → 全库内容搜索 ----------
	hookContentSearch(palette, isFiles) {
		const plugin = this;
		const adapter = palette.fileAdapter;
		palette.__csToken = 0;

		const origReceived = palette.receivedSuggestions;
		palette.receivedSuggestions = function (...args) {
			origReceived.apply(this, args);
			if (!isFiles()) return;
			if (palette.__scope === "cards") plugin.scheduleCardSearch(palette);
			else plugin.scheduleContentSearch(palette);
		};

		const origRender = adapter.renderSuggestion;
		adapter.renderSuggestion = function (item, content, aux) {
			if (!item || !item.__cs) return origRender.call(this, item, content, aux);
			if (item.__cs.card) plugin.renderCard(item, content, aux);
			else plugin.renderHit(item, content, aux);
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

	// 文件名没匹配时自动搜正文；按过 Tab（__csLayer）时文件名有匹配也搜，正文结果接在文件名结果下面
	scheduleContentSearch(palette, delay = 200) {
		window.clearTimeout(palette.__csTimer);
		const token = ++palette.__csToken;
		const q = this.queryOf(palette);
		const files = (palette.currentSuggestions || []).filter((x) => !x.__cs);
		palette.__csShown = false;
		if (palette.__csEmpty === undefined) palette.__csEmpty = palette.emptyStateText;
		if (!q || (files.length && !palette.__csLayer)) { palette.emptyStateText = palette.__csEmpty; return; }
		if (!files.length) {
			palette.emptyStateText = `文件名里没有「${q}」，正在全文搜索…`;
			palette.updateSuggestions();
		}
		palette.__csTimer = window.setTimeout(async () => {
			const hits = await this.contentSearch(q, new Set(files.map((x) => x.id)), palette.__scopePaths);
			if (token !== palette.__csToken || !palette.modalEl.isConnected) return;   // 期间又改了输入，或面板关了
			const Item = palette.fileAdapter.allItems[0] && palette.fileAdapter.allItems[0].constructor;
			if (!Item) return;
			const found = hits.map((h) => Object.assign(new Item(h.path, h.path, []), { __cs: h }));
			if (found.length && files.length) found[0].__cs.section = q;   // 文件名结果下面的第一条正文结果带一个小标题
			const items = [...files, ...found];
			if (items.length) items.push(Object.assign(new Item("__pso_global_search__", "", []), { __cs: { panel: true, q, gq: this.globalQuery(palette, q), none: !found.length } }));
			const sel = palette.chooser?.selectedItem ?? 0;
			palette.currentSuggestions = items;
			palette.limit = items.length;
			palette.emptyStateText = items.length ? palette.__csEmpty : `文件名和正文里都没有「${q}」`;
			palette.__csShown = true;
			palette.updateSuggestions();
			// 正文结果是追加的，别把正在看的文件名结果的选中项挪回第一条
			if (files.length && sel > 0 && sel < files.length) palette.chooser.setSelectedItem(sel, false);
		}, delay);
	}

	async fillCache(files) {
		files = files || this.app.vault.getMarkdownFiles();
		const todo = files.filter((f) => { const c = this.textCache.get(f.path); return !c || c.mtime !== f.stat.mtime || c.size !== f.stat.size; });
		for (let i = 0; i < todo.length; i += 100) {
			await Promise.all(todo.slice(i, i + 100).map(async (f) => {
				try {
					const text = await this.app.vault.cachedRead(f);
					let cards = [];
					try { cards = parseCards(text); } catch (e) { /* 解析不了的当作没有卡片 */ }
					this.textCache.set(f.path, { mtime: f.stat.mtime, size: f.stat.size, low: text.toLowerCase(), cards });
				} catch (e) { /* 读不了的跳过 */ }
			}));
		}
	}

	async contentSearch(q, exclude, only) {
		const terms = [...new Set(q.toLowerCase().split(/\s+/).filter(Boolean))];
		if (!terms.length) return [];
		let files = this.app.vault.getMarkdownFiles();
		if (only) files = files.filter((f) => only.has(f.path));
		await this.fillCache(files);
		const hits = [];
		for (const f of files) {
			if (exclude && exclude.has(f.path)) continue;   // 文件名结果里已经有了
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

	// ---------- 卡片 ----------
	scheduleCardSearch(palette, delay = 120) {
		window.clearTimeout(palette.__csTimer);
		const token = ++palette.__csToken;
		const q = this.queryOf(palette);
		palette.__csShown = false;
		palette.__csTimer = window.setTimeout(async () => {
			const res = await this.cardSearch(q);
			if (token !== palette.__csToken || !palette.modalEl.isConnected || palette.__scope !== "cards") return;
			const Item = palette.fileAdapter.allItems[0] && palette.fileAdapter.allItems[0].constructor;
			if (!Item) return;
			const items = res.list.map((h) => Object.assign(new Item(`${h.path}#L${h.line}`, h.path, []), { __cs: h }));
			if (items.length) {
				const more = res.total > items.length ? `，先列 ${items.length} 张` : "";
				items[0].__cs.section = q ? `${res.total} 张卡片含「${q}」${more}` : `共 ${res.total} 张卡片，新的在前${more}`;
			}
			palette.currentSuggestions = items;
			palette.limit = items.length;
			palette.emptyStateText = q ? `没有含「${q}」的卡片` : "库里还没有卡片";
			palette.__csShown = !!q;
			palette.updateSuggestions();
		}, delay);
	}

	async cardSearch(q) {
		const terms = [...new Set(q.toLowerCase().split(/\s+/).filter(Boolean))];
		const files = this.app.vault.getMarkdownFiles();
		await this.fillCache(files);
		const hits = [];
		for (const f of files) {
			const c = this.textCache.get(f.path);
			if (!c || !c.cards || !c.cards.length) continue;
			const m = f.path.match(JOURNAL_RE);
			const time = m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : f.stat.ctime;
			for (const card of c.cards) {
				let inFront = true;
				if (terms.length) {
					const front = card.front.toLowerCase();
					const hay = `${front}\n${card.answer.toLowerCase()}\n${f.path.toLowerCase()}`;
					if (!terms.every((t) => hay.includes(t))) continue;
					inFront = terms.every((t) => front.includes(t));
				}
				hits.push(Object.assign({ card: true, path: f.path, file: f, terms, inFront, time }, card));
			}
		}
		hits.sort((a, b) => (b.inFront - a.inFront) || (b.time - a.time) || a.path.localeCompare(b.path, "zh") || (a.line - b.line));
		return { total: hits.length, list: hits.slice(0, CARD_LIMIT) };
	}

	renderCard(item, content, aux) {
		const h = item.__cs;
		aux.empty();
		if (h.section) content.createDiv({ cls: "suggestion-note pso-section", text: `── ${h.section} ──` });
		const title = content.createDiv({ cls: "suggestion-title pso-card-front" });
		// 挖空的部分单独标出来；被截断成半个的挖空就照原样显示
		for (const part of this.snippet(h.front, h.terms).split(CLOZE_SPLIT_RE)) {
			if (!part) continue;
			if (CLOZE_SPLIT_RE.test(part) && (part.startsWith("==") ? part.endsWith("==") : part.endsWith("}}"))) {
				const inner = part.startsWith("==") ? part.slice(2, -2) : part.replace(/^\{\{c\d+::/, "").replace(/(::[\s\S]*)?\}\}$/, "");
				this.appendMarked(title.createSpan({ cls: "pso-cloze" }), inner, h.terms);
			} else this.appendMarked(title, part.replace(/==/g, ""), h.terms);
		}
		const note = content.createDiv({ cls: "suggestion-note pso-snippet" });
		if (h.answer) { this.appendMarked(note, this.snippet(h.answer, h.terms), h.terms); note.createSpan({ cls: "pso-card-sep", text: " · " }); }
		note.createSpan({ cls: "pso-card-file", text: h.file.basename });
		aux.createSpan({
			cls: "suggestion-flair pso-card-kind" + (h.synced ? "" : " is-unsynced"),
			text: h.kind,
			attr: { "aria-label": h.synced ? "已同步到 Anki" : "还没同步到 Anki" },
		});
	}

	// 把 s 写进 el，terms 里的词加高亮
	appendMarked(el, s, terms) {
		const low = s.toLowerCase();
		const marks = [];
		for (const t of terms) for (let i = low.indexOf(t); i >= 0; i = low.indexOf(t, i + t.length)) marks.push([i, i + t.length]);
		marks.sort((a, b) => a[0] - b[0]);
		let pos = 0;
		for (const [a, b] of marks) {
			if (a < pos) continue;
			if (a > pos) el.appendText(s.slice(pos, a));
			el.createSpan({ cls: "suggestion-highlight", text: s.slice(a, b) });
			pos = b;
		}
		el.appendText(s.slice(pos));
	}

	// 一行摘要：去掉列表记号，太长就以第一个命中词为中心截一段
	snippet(line, terms) {
		line = line.replace(/^([-*+]|\d+[.)])\s+(\[.\]\s+)?/, "");
		if (line.length <= SNIPPET_LEN) return line;
		const low = line.toLowerCase();
		const first = Math.min(...terms.map((t) => { const i = low.indexOf(t); return i < 0 ? Infinity : i; }));
		const at = Number.isFinite(first) ? first : 0;   // 没有命中词（或没输入）就从头显示
		const start = Math.max(0, Math.min(at - 20, line.length - SNIPPET_LEN));
		return (start > 0 ? "…" : "") + line.slice(start, start + SNIPPET_LEN) + (start + SNIPPET_LEN < line.length ? "…" : "");
	}

	renderHit(item, content, aux) {
		const h = item.__cs;
		aux.empty();   // 去掉「隐藏这一项」的叉
		if (h.panel) {
			if (h.none) content.createDiv({ cls: "suggestion-note pso-section", text: `正文里没有更多含「${h.q}」的笔记` });
			content.createDiv({ cls: "suggestion-title", text: `🔍 在搜索面板中查看「${h.q}」的全部结果` });
			content.createDiv({ cls: "suggestion-note", text: "Obsidian 全局搜索（⌘⇧F，面板里再按 Tab 也行），支持 path: tag: 等搜索语法" });
			return;
		}
		if (h.section) content.createDiv({ cls: "suggestion-note pso-section", text: `── 正文里含「${h.section}」的笔记 ──` });
		content.createDiv({ cls: "suggestion-title", text: h.path.replace(/\.md$/, "") });
		this.appendMarked(content.createDiv({ cls: "suggestion-note pso-snippet" }), h.snippet || "", h.terms);
		aux.createSpan({ cls: "suggestion-flair", text: `L${h.line + 1}` });
	}

	async openHit(palette, item, evt) {
		const h = item.__cs;
		if (h.panel) return this.openGlobalSearch(h.gq || h.q);
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

	// 交给全局搜索时带上范围：Wiki 能用 path: 表达；书签和卡片没法用搜索语法表达，只带关键词
	globalQuery(palette, q) {
		return palette.__scope === "wiki" ? `path:"${WIKI_DIR}" ${q}` : q;
	}

	openGlobalSearch(q) {
		const gs = this.app.internalPlugins.getPluginById("global-search");
		if (gs && gs.instance) gs.instance.openGlobalSearch(q);
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
