// ⌘T 新标签页：原生的标题和选项由 styles.css 隐藏，换成 库名 + 搜索条 + 一列按钮，都在这个标签页里打开
// 从这个页面打开的任何东西，都会先往该标签页的历史里压一条「新标签页」，所以后退（← 按钮 / ⌘⌥← / 手势）能回到这个页面
// 新标签页是当前标签、焦点不在输入框里时按 / 跳到搜索条
//
// 设置页（新标签页右上角的两个小按钮也能直达）：
//   · 背景图：自己上传一张图，存成插件目录里的 bg.<扩展名>（不进仓库）；可以换、可以去掉
//   · 搜索条下面的按钮：增删、排序，每个按钮的文字 / 图标（Lucide 图标名）/ 颜色 / 去处都能改。去处三选一：
//       笔记：在这个标签页里打开某一篇笔记
//       插件页面：在这个标签页里打开某个插件的视图（LLM Wiki、每日回顾之类）
//       命令：执行一条命令（打开到哪里由命令自己决定，后退不一定回得来）
const { Plugin, PluginSettingTab, Setting, AbstractInputSuggest, Notice, debounce, TFile, setIcon, prepareFuzzySearch, renderMatches } = require("obsidian");

const COLORS = { blue: "蓝", purple: "紫", orange: "橙", green: "绿", red: "红", yellow: "黄" };
const KINDS = { note: "笔记", view: "插件页面", command: "命令" };
const DEFAULT_SETTINGS = {
	bgFile: "bg.jpg",   // 插件目录里的背景图文件名；空 = 不用背景图
	actions: [
		{ title: "打开任务看板", icon: "list-checks", color: "blue", kind: "note", target: "Concepts/知识管理/任务管理" },
		{ title: "打开 LLM Wiki", icon: "library", color: "purple", kind: "view", target: "llm-wiki-view" },
		{ title: "打开每日回顾", icon: "history", color: "orange", kind: "view", target: "sb-daily-review" },
		{ title: "打开书架", icon: "book-open", color: "green", kind: "view", target: "weave-epub-bookshelf-sidebar-standalone" },
	],
};
const LOGO = "Klauschen";
const MAX_RESULTS = 8;
const MAX_RECENT = 6;
const HOME_TITLE = "新标签页";
const HOME_ICON = "lucide-file-plus";

// 原生新标签页（empty view）的状态；Obsidian 自己不会把它记进历史，所以要手动压一条
const homeState = () => ({ type: "empty", state: {} });

class SearchBox {
	constructor(plugin, leaf, parent) {
		this.plugin = plugin;
		this.app = plugin.app;
		this.leaf = leaf;
		this.items = [];
		this.sel = 0;
		const wrap = parent.createDiv({ cls: "nth-search-wrap" });
		this.card = wrap.createDiv({ cls: "nth-search" });
		const bar = this.card.createDiv({ cls: "nth-search-bar" });
		setIcon(bar.createSpan({ cls: "nth-search-icon" }), "search");
		this.input = bar.createEl("input", { type: "text", attr: { placeholder: "search my brain", spellcheck: "false" } });
		this.list = this.card.createDiv({ cls: "nth-results" });
		bar.addEventListener("mousedown", (e) => { if (e.target !== this.input) { e.preventDefault(); this.input.focus(); } });
		this.input.addEventListener("input", () => this.update());
		this.input.addEventListener("focus", () => this.update());
		this.input.addEventListener("blur", () => this.card.removeClass("is-open"));
		this.input.addEventListener("keydown", (e) => this.onKey(e));
	}

	update() {
		const q = this.input.value.trim();
		this.items = q ? this.search(q) : this.recent();
		if (q) this.items.push({ kind: "fulltext", q });
		this.sel = 0;
		this.render(q);
	}

	search(q) {
		const fuzzy = prepareFuzzySearch(q);
		const out = [];
		for (const file of this.app.vault.getFiles()) {
			const m = fuzzy(file.basename);
			if (m) { out.push({ kind: "file", file, score: m.score, matches: m.matches }); continue; }
			const mp = fuzzy(file.path);
			if (mp) out.push({ kind: "file", file, score: mp.score - 1 });
		}
		return out.sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS);
	}

	recent() {
		const items = this.app.workspace.getLastOpenFiles()
			.map((p) => this.app.vault.getAbstractFileByPath(p))
			.filter((f) => f instanceof TFile)
			.slice(0, MAX_RECENT)
			.map((file) => ({ kind: "file", file, recent: true }));
		if (items.length) items.push({ kind: "clear" });
		return items;
	}

	render(q) {
		this.list.empty();
		this.card.toggleClass("is-open", this.items.length > 0);
		if (!q && this.items.length) this.list.createDiv({ cls: "nth-results-label", text: "最近打开" });
		this.rows = this.items.map((it, i) => {
			const row = this.list.createDiv({ cls: "nth-result" });
			const icon = row.createSpan({ cls: "nth-result-icon" });
			const name = row.createSpan({ cls: "nth-result-name" });
			if (it.kind === "fulltext") {
				row.addClass("is-fulltext");
				setIcon(icon, "search");
				name.setText(`全文搜索「${it.q}」`);
			} else if (it.kind === "clear") {
				row.addClass("is-clear");
				setIcon(icon, "eraser");
				name.setText("清除最近打开");
			} else {
				const f = it.file;
				setIcon(icon, it.recent ? "clock" : f.extension === "md" ? "file-text" : "file");
				if (it.matches) renderMatches(name, f.basename, it.matches);
				else name.setText(f.basename);
				if (f.extension !== "md") row.createSpan({ cls: "nth-result-ext", text: f.extension });
				const dir = f.parent && f.parent.path !== "/" ? f.parent.path : "";
				if (dir) row.createSpan({ cls: "nth-result-path", text: dir });
				if (it.recent) {
					const x = row.createSpan({ cls: "nth-result-x", attr: { "aria-label": "从最近打开里移除" } });
					setIcon(x, "x");
					x.addEventListener("mousedown", (e) => { e.preventDefault(); e.stopPropagation(); });
					x.addEventListener("click", (e) => {
						e.preventDefault();
						e.stopPropagation();
						this.plugin.clearRecent(f.path);
						this.update();
						this.input.focus();
					});
				}
			}
			row.addEventListener("mousedown", (e) => e.preventDefault());
			row.addEventListener("mouseenter", () => this.select(i));
			row.addEventListener("click", (e) => this.choose(it, e.metaKey || e.ctrlKey));
			return row;
		});
		this.select(0);
	}

	select(i) {
		this.sel = i;
		(this.rows || []).forEach((r, k) => r.toggleClass("is-selected", k === i));
	}

	onKey(e) {
		if (e.isComposing || e.keyCode === 229) return;
		const n = this.items.length;
		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault();
			if (n) this.select((this.sel + (e.key === "ArrowDown" ? 1 : -1) + n) % n);
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (this.items[this.sel]) this.choose(this.items[this.sel], e.metaKey || e.ctrlKey);
		} else if (e.key === "Escape") {
			e.preventDefault();
			e.stopPropagation();
			if (this.input.value) { this.input.value = ""; this.update(); } else this.input.blur();
		}
	}

	choose(it, newTab) {
		if (it.kind === "clear") {
			if (this.plugin.clearRecent()) new Notice("已清除最近打开");
			this.update();
			this.input.focus();
			return;
		}
		this.input.blur();
		if (it.kind === "fulltext") return this.plugin.globalSearch(it.q);
		const leaf = newTab ? this.app.workspace.getLeaf("tab") : this.leaf;
		this.plugin.pushHomeHistory(leaf);
		leaf.openFile(it.file, { active: true });
	}
}

module.exports = class NewTabHome extends Plugin {
	contextHotkeys = [
		{ keys: ["/"], name: "光标跳到文件搜索条", when: "新标签页是当前标签、没在输入时" },
		{ keys: ["ArrowUp", "ArrowDown"], name: "在搜索结果 / 最近打开里上下选", when: "新标签页搜索条里" },
		{ keys: ["Enter", "Mod+Enter"], name: "打开（⌘ 在新标签页打开）", when: "新标签页搜索条里" },
		{ keys: ["Escape"], name: "清空输入；再按一次离开搜索条", when: "新标签页搜索条里" },
	];

	async onload() {
		const ws = this.app.workspace;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.settings.actions = (this.settings.actions || []).map((a) => ({ ...a }));
		await this.loadBg();
		this.addSettingTab(new NewTabSettings(this));
		ws.onLayoutReady(() => this.decorateAll());
		this.registerEvent(ws.on("layout-change", () => this.decorateAll()));
		this.registerEvent(ws.on("active-leaf-change", () => this.decorateAll()));
		this.registerDomEvent(window, "keydown", (e) => this.onSlash(e), true);
	}

	onunload() { this.undecorate(); }

	undecorate() {
		document.querySelectorAll(".nth-home, .nth-corner").forEach((el) => el.remove());
		document.querySelectorAll(".nth-bg").forEach((el) => { el.removeClass("nth-bg"); el.style.removeProperty("--nth-bg"); });
	}

	// 设置改了：已经打开的新标签页重画一遍
	refresh() {
		this.undecorate();
		this.decorateAll();
	}

	async save() {
		await this.saveData(this.settings);
		this.refresh();
	}

	// ---------- 背景图 ----------

	bgPath(name = this.settings.bgFile) { return name ? `${this.manifest.dir}/${name}` : null; }

	async loadBg() {
		const path = this.bgPath();
		// 文件名不变、内容换了时浏览器会用缓存，带上时间戳
		this.bgUrl = path && (await this.app.vault.adapter.exists(path))
			? `${this.app.vault.adapter.getResourcePath(path).split("?")[0]}?t=${Date.now()}` : null;
	}

	// 选一张图存进插件目录，替换原来的背景图
	pickBg() {
		const input = document.body.createEl("input", { type: "file", attr: { accept: "image/*" } });
		input.style.display = "none";
		input.addEventListener("change", async () => {
			const file = input.files && input.files[0];
			input.remove();
			if (!file) return;
			const ext = (file.name.match(/\.(jpe?g|png|webp|gif|avif|bmp|svg)$/i) || [])[1];
			if (!ext) return new Notice("只支持 jpg / png / webp / gif / avif / bmp / svg 图片");
			const name = `bg.${ext.toLowerCase()}`;
			const adapter = this.app.vault.adapter, old = this.bgPath();
			await adapter.writeBinary(this.bgPath(name), await file.arrayBuffer());
			if (old && old !== this.bgPath(name) && (await adapter.exists(old))) await adapter.remove(old);
			this.settings.bgFile = name;
			await this.loadBg();
			await this.save();
			this.settingTab?.display();
			new Notice("背景图换好了");
		});
		input.addEventListener("cancel", () => input.remove());
		input.click();
	}

	async removeBg() {
		const path = this.bgPath();
		if (path && (await this.app.vault.adapter.exists(path))) await this.app.vault.adapter.remove(path);
		this.settings.bgFile = "";
		this.bgUrl = null;
		await this.save();
	}

	openSettings() {
		this.app.setting.open();
		this.app.setting.openTabById(this.manifest.id);
	}

	// 按 / ：当前标签是新标签页、焦点不在任何输入框 / 编辑器 / 弹窗里时，光标跳到搜索条
	onSlash(e) {
		if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
		const el = document.activeElement;
		if (el && (el.isContentEditable || el.closest("input, textarea, select, [contenteditable]"))) return;
		if (document.querySelector(".modal-container")) return;
		const leaf = this.app.workspace.activeLeaf;
		if (!leaf || leaf.view.getViewType() !== "empty") return;
		const input = leaf.view.containerEl.querySelector(".nth-search-bar input");
		if (!input) return;
		e.preventDefault();
		e.stopPropagation();
		input.focus();
	}

	decorateAll() {
		const ws = this.app.workspace;
		for (const leaf of ws.getLeavesOfType("empty")) {
			const root = leaf.getRoot();
			if (root !== ws.leftSplit && root !== ws.rightSplit) this.decorate(leaf);
		}
	}

	decorate(leaf) {
		const list = leaf.view.containerEl.querySelector(".empty-state-action-list");
		if (!list || list.parentElement.querySelector(":scope > .nth-home")) return;
		const home = list.parentElement.createDiv({ cls: "nth-home" });
		if (this.bgUrl) {
			leaf.view.contentEl.addClass("nth-bg");
			leaf.view.contentEl.style.setProperty("--nth-bg", `url("${this.bgUrl}")`);
		}
		home.createDiv({ cls: "nth-logo", text: LOGO });
		new SearchBox(this, leaf, home);

		const acts = home.createDiv({ cls: "nth-actions" });
		for (const a of this.settings.actions) {
			const el = acts.createDiv({ cls: `nth-action nth-c-${COLORS[a.color] ? a.color : "blue"}`, attr: { tabindex: "0" } });
			setIcon(el.createSpan({ cls: "nth-action-icon" }), a.icon || "circle");
			el.createSpan({ cls: "nth-action-label", text: a.title || "（没起名字）" });
			el.addEventListener("click", () => this.runAction(a, leaf));
			el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.runAction(a, leaf); } });
		}

		// 右上角：换背景图、改按钮（鼠标移过去才显眼）
		const corner = leaf.view.contentEl.createDiv({ cls: "nth-corner" });
		const btn = (icon, label, fn) => {
			const b = corner.createDiv({ cls: "nth-corner-btn clickable-icon", attr: { "aria-label": label } });
			setIcon(b, icon);
			b.addEventListener("click", fn);
		};
		btn("image", "换背景图", () => this.pickBg());
		btn("settings-2", "改按钮和背景（设置）", () => this.openSettings());
	}

	runAction(a, leaf) {
		if (!a.target) return new Notice(`「${a.title}」还没设置去处，到设置里填一下`);
		if (a.kind === "note") return this.openNote(leaf, a.target);
		if (a.kind === "view") return this.openView(leaf, a.target);
		if (a.kind === "command") {
			if (!this.app.commands.findCommand(a.target)) return new Notice(`没找到命令「${a.target}」（插件没启用？）`);
			return this.app.commands.executeCommandById(a.target);
		}
	}

	// 打开之前先压一条「新标签页」进历史，这样后退能回到这个页面
	pushHomeHistory(leaf) {
		const h = leaf && leaf.history;
		if (!h || typeof h.pushState !== "function") return;
		const back = h.backHistory || (h.backHistory = []);
		const last = back[back.length - 1];
		if (last && last.nthHome) return;
		h.pushState({ title: HOME_TITLE, icon: HOME_ICON, state: homeState(), eState: {}, nthHome: true });
	}

	// 清掉 Obsidian 的「最近打开」记录：给 path 只删一条，不给就全清
	clearRecent(path) {
		const ws = this.app.workspace;
		const tracker = ws.recentFileTracker;
		if (!tracker || !Array.isArray(tracker.lastOpenFiles)) return false;
		tracker.lastOpenFiles = path ? tracker.lastOpenFiles.filter((p) => p !== path) : [];
		if (typeof ws.requestSaveLayout === "function") ws.requestSaveLayout();
		return true;
	}

	async openNote(leaf, path) {
		const f = this.app.metadataCache.getFirstLinkpathDest(path, "");
		if (!(f instanceof TFile)) return new Notice(`没找到「${path}」`);
		this.pushHomeHistory(leaf);
		await leaf.openFile(f, { active: true });
	}

	async openView(leaf, type) {
		if (!this.app.viewRegistry.getViewCreatorByType(type)) return new Notice(`插件页面「${type}」不存在，提供它的插件可能没启用`);
		this.pushHomeHistory(leaf);
		await leaf.setViewState({ type, active: true });
		this.app.workspace.setActiveLeaf(leaf, { focus: true });
	}

	globalSearch(q) {
		const gs = this.app.internalPlugins.getPluginById("global-search");
		if (!gs || !gs.enabled) return new Notice("核心插件「搜索」没有启用");
		gs.instance.openGlobalSearch(q);
	}
};

// ---------- 设置页 ----------

// 输入框下面弹出候选：items() 返回 [{ value, label, note }]
class ListSuggest extends AbstractInputSuggest {
	constructor(app, inputEl, items, onPick) {
		super(app, inputEl);
		this.inputEl = inputEl;
		this.items = items;
		this.onPick = onPick;
	}
	getSuggestions(q) {
		const fuzzy = prepareFuzzySearch(q.trim());
		const out = [];
		for (const it of this.items()) {
			const m = q.trim() ? fuzzy(`${it.label} ${it.value}`) : { score: 0 };
			if (m) out.push({ it, score: m.score });
		}
		return out.sort((a, b) => b.score - a.score).slice(0, 50).map((x) => x.it);
	}
	renderSuggestion(it, el) {
		el.createDiv({ text: it.label });
		if (it.note) el.createDiv({ cls: "nth-suggest-note", text: it.note });
	}
	selectSuggestion(it) {
		this.inputEl.value = it.value;
		this.onPick(it.value);
		this.close();
	}
}

class NewTabSettings extends PluginSettingTab {
	constructor(plugin) {
		super(plugin.app, plugin);
		this.plugin = plugin;
		plugin.settingTab = this;
	}

	// 候选：笔记 / 插件页面 / 命令
	targets(kind) {
		const app = this.app;
		if (kind === "note")
			return app.vault.getMarkdownFiles().map((f) => ({ value: f.path.replace(/\.md$/, ""), label: f.basename, note: f.parent && f.parent.path !== "/" ? f.parent.path : "" }));
		if (kind === "view") {
			const core = new Set(["markdown", "image", "audio", "video", "pdf", "release-notes", "file-explorer", "search", "graph", "localgraph", "backlink",
				"canvas", "outgoing-link", "tag", "footnotes", "all-properties", "file-properties", "bookmarks", "outline", "bases", "webviewer", "webviewer-history"]);
			return Object.keys(app.viewRegistry.viewByType).filter((t) => !core.has(t)).map((t) => {
				const open = app.workspace.getLeavesOfType(t)[0];
				return { value: t, label: open ? open.view.getDisplayText() : t, note: open ? t : "" };
			});
		}
		return app.commands.listCommands().map((c) => ({ value: c.id, label: c.name, note: c.id }));
	}

	targetHint(a) {
		if (!a.target) return "还没填";
		if (a.kind === "note") return this.app.metadataCache.getFirstLinkpathDest(a.target, "") ? "" : "⚠ 没找到这篇笔记";
		if (a.kind === "view") return this.app.viewRegistry.getViewCreatorByType(a.target) ? "" : "⚠ 现在没有这个插件页面（插件没启用？）";
		const c = this.app.commands.findCommand(a.target);
		return c ? c.name : "⚠ 现在没有这条命令（插件没启用？）";
	}

	display() {
		const { containerEl } = this, plugin = this.plugin, st = plugin.settings;
		containerEl.empty();

		new Setting(containerEl).setName("背景图").setHeading();
		const bg = new Setting(containerEl)
			.setName("新标签页背景")
			.setDesc(plugin.bgUrl ? `现在用的是插件目录里的 ${st.bgFile}` : "现在没有背景图")
			.addButton((b) => b.setButtonText(plugin.bgUrl ? "换一张…" : "上传图片…").setCta().onClick(() => plugin.pickBg()));
		if (plugin.bgUrl) bg.addButton((b) => b.setButtonText("去掉背景图").setWarning().onClick(async () => { await plugin.removeBg(); this.display(); }));
		if (plugin.bgUrl) {
			const img = containerEl.createDiv({ cls: "nth-bg-preview" });
			img.style.backgroundImage = `url("${plugin.bgUrl}")`;
		}

		new Setting(containerEl).setName("搜索条下面的按钮").setHeading()
			.setDesc("去处：笔记 = 在新标签页里打开那篇笔记；插件页面 = 在新标签页里打开插件的视图；命令 = 执行一条命令（打开到哪里由命令决定）。图标填 Lucide 图标名，见 lucide.dev/icons");
		st.actions.forEach((a, i) => this.renderAction(containerEl, a, i));
		new Setting(containerEl).addButton((b) => b.setButtonText("＋ 加一个按钮").onClick(async () => {
			st.actions.push({ title: "新按钮", icon: "star", color: "blue", kind: "note", target: "" });
			await plugin.save();
			this.display();
		})).addButton((b) => b.setButtonText("恢复默认的四个按钮").onClick(async () => {
			st.actions = DEFAULT_SETTINGS.actions.map((x) => ({ ...x }));
			await plugin.save();
			this.display();
		}));
	}

	renderAction(containerEl, a, i) {
		const plugin = this.plugin, st = plugin.settings;
		const box = containerEl.createDiv({ cls: "nth-setting-action" });
		const save = () => plugin.save();
		const saveSoon = this.saveSoon || (this.saveSoon = debounce(() => plugin.save(), 500, true));   // 打字时不用每个字都重画
		const move = async (d) => {
			const j = i + d;
			if (j < 0 || j >= st.actions.length) return;
			[st.actions[i], st.actions[j]] = [st.actions[j], st.actions[i]];
			await save();
			this.display();
		};

		const head = new Setting(box).setName(`按钮 ${i + 1}`);
		const preview = head.nameEl.createSpan({ cls: `nth-setting-icon nth-c-${a.color}` });
		setIcon(preview, a.icon || "circle");
		head.addText((t) => t.setPlaceholder("按钮文字").setValue(a.title).onChange((v) => { a.title = v; saveSoon(); }))
			.addText((t) => {
				t.setPlaceholder("图标名").setValue(a.icon).onChange((v) => { a.icon = v.trim(); preview.empty(); setIcon(preview, a.icon || "circle"); saveSoon(); });
				t.inputEl.addClass("nth-setting-iconname");
			})
			.addDropdown((d) => d.addOptions(COLORS).setValue(a.color).onChange((v) => {
				preview.removeClass(`nth-c-${a.color}`);
				a.color = v;
				preview.addClass(`nth-c-${v}`);
				save();
			}))
			.addExtraButton((b) => b.setIcon("arrow-up").setTooltip("上移").setDisabled(i === 0).onClick(() => move(-1)))
			.addExtraButton((b) => b.setIcon("arrow-down").setTooltip("下移").setDisabled(i === st.actions.length - 1).onClick(() => move(1)))
			.addExtraButton((b) => b.setIcon("trash-2").setTooltip("删掉这个按钮").onClick(async () => {
				st.actions.splice(i, 1);
				await save();
				this.display();
			}));

		const where = new Setting(box).setName("去处").setDesc(this.targetHint(a));
		where.addDropdown((d) => d.addOptions(KINDS).setValue(a.kind).onChange(async (v) => {
			a.kind = v;
			a.target = "";
			await save();
			this.display();
		}));
		where.addText((t) => {
			const ph = { note: "笔记路径，输入搜索", view: "插件页面，输入搜索", command: "命令，输入搜索" };
			t.setPlaceholder(ph[a.kind]).setValue(a.target);
			t.inputEl.addClass("nth-setting-target");
			const set = (v) => { a.target = v.trim(); where.setDesc(this.targetHint(a)); saveSoon(); };
			t.onChange(set);
			new ListSuggest(this.app, t.inputEl, () => this.targets(a.kind), set);
		});
	}
}
