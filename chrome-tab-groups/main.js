// Chrome 式标签页管理
//   右键标签页：在右侧新建标签页 / 向新拆分视图添加标签页 / 将标签页添加到（新）组 / 从组中移除 / 复制标签页
//              （关闭、关闭其他、关闭右侧、锁定、移动到新窗口是 Obsidian 原生的，照旧）
//   分组：色块嵌在组内第一个标签页左侧；点色块折叠 / 展开，右键色块编辑（名称、颜色、在组中新建、取消组合、关闭组、移至新窗口），
//        拖色块把整组挪到别的位置（同一窗口里的任意标签栏）
//   规则（照 Chrome）：
//     · 一个组只在一个标签栏里，组内标签页始终挨在一起；拖出组外 / 拖到别的分屏或窗口就退组，拖进组的中间就进组
//     · 「在右侧新建」、复制标签页、⌘点击链接在新标签页打开，都进同一组；⌘T 和标签栏的「＋」新建的空白页不进组
//     · 折叠时如果正看着组里的标签页，先切到组外最近的标签页（没有就在组后面新建一个）；切回被折叠的标签页时自动展开
//   命令：添加到新组、移出组、折叠/展开、编辑组、关闭组、搜索标签页、在右侧新建、复制、移到新拆分视图（快捷键自己绑）
//   分栏上限 3 栏：已经 3 栏时，「向新拆分视图添加」改为挪到最右边一栏（和 palette-split-open 的 ⌘⌥↵ 一致）
//   分组按标签页 id 存在 data.json 里，重启后恢复
const { Plugin, Modal, SuggestModal, Notice, WorkspaceLeaf, prepareFuzzySearch, setIcon } = require("obsidian");

const COLORS = [
	{ key: "grey",   name: "灰色", bg: "#5f6368", fg: "#ffffff" },
	{ key: "blue",   name: "蓝色", bg: "#1a73e8", fg: "#ffffff" },
	{ key: "red",    name: "红色", bg: "#d93025", fg: "#ffffff" },
	{ key: "yellow", name: "黄色", bg: "#f9ab00", fg: "#202124" },
	{ key: "green",  name: "绿色", bg: "#1e8e3e", fg: "#ffffff" },
	{ key: "pink",   name: "粉色", bg: "#d01884", fg: "#ffffff" },
	{ key: "purple", name: "紫色", bg: "#a142f4", fg: "#ffffff" },
	{ key: "cyan",   name: "青色", bg: "#007b83", fg: "#ffffff" },
	{ key: "orange", name: "橙色", bg: "#fa903e", fg: "#202124" },
];
const colorOf = (key) => COLORS.find((c) => c.key === key) || COLORS[0];
const HEADER_CLASSES = ["ctg-member", "ctg-head", "ctg-tail", "ctg-hidden", "ctg-collapsed"];

const MAX_COLUMNS = 3;

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

function dot(parent, color) {
	const s = parent.ownerDocument.createElement("span");
	s.className = "ctg-dot" + (color ? "" : " is-none");
	if (color) s.style.background = color;
	parent.appendChild(s);
	return s;
}

class ConfirmModal extends Modal {
	constructor(app, title, message, okText, onOk) {
		super(app);
		this.titleText = title;
		this.message = message;
		this.okText = okText;
		this.onOk = onOk;
	}
	onOpen() {
		this.titleEl.setText(this.titleText);
		this.contentEl.createEl("p", { text: this.message });
		const btns = this.contentEl.createDiv({ cls: "modal-button-container" });
		const ok = btns.createEl("button", { text: this.okText, cls: "mod-warning" });
		ok.addEventListener("click", () => { this.close(); this.onOk(); });
		btns.createEl("button", { text: "取消" }).addEventListener("click", () => this.close());
		setTimeout(() => ok.focus(), 0);
	}
	onClose() { this.contentEl.empty(); }
}

class TabSearchModal extends SuggestModal {
	constructor(plugin) {
		super(plugin.app);
		this.plugin = plugin;
		this.setPlaceholder("搜索标签页：标题 / 路径 / 组名…");
		this.setInstructions([
			{ command: "↑↓", purpose: "选择" },
			{ command: "↵", purpose: "跳到这个标签页" },
			{ command: "esc", purpose: "关闭" },
		]);
	}
	getSuggestions(query) {
		const items = this.plugin.allTabs();
		if (!query.trim()) return items;
		const fuzzy = prepareFuzzySearch(query);
		return items
			.map((it) => ({ it, m: fuzzy(it.search) }))
			.filter((x) => x.m)
			.sort((a, b) => b.m.score - a.m.score)
			.map((x) => x.it);
	}
	renderSuggestion(it, el) {
		el.addClass("ctg-suggest");
		dot(el, it.color);
		const main = el.createDiv();
		main.createDiv({ text: it.title });
		const sub = [it.groupName, it.path, it.where].filter(Boolean).join(" · ");
		if (sub) main.createDiv({ cls: "ctg-suggest-sub", text: sub });
	}
	onChooseSuggestion(it) { this.plugin.focusLeaf(it.leaf); }
}

module.exports = class ChromeTabGroups extends Plugin {
	async onload() {
		this.data = Object.assign({ groups: {}, nextColor: 0 }, await this.loadData());
		this.ready = false;
		this.pendingJoin = new Map();   // 新标签页 id → 要进的组（从组里的标签页打开的）
		this.lastParent = new Map();    // 组 → 上次所在的标签栏，组被拆开时优先留在这里
		this.prevOrder = new Map();     // 标签栏 → 上次的标签页顺序（id），用来判断这次是谁被挪动了
		this.editor = null;

		this.patchTabMenu();
		this.patchGetLeaf();
		this.addCommands();

		this.registerEvent(this.app.workspace.on("layout-change", () => this.scheduleNormalize()));
		this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => this.onActiveLeaf(leaf)));
		this.app.workspace.onLayoutReady(() => { this.ready = true; this.normalize(); });
	}

	onunload() {
		clearTimeout(this.normalizeTimer);
		clearTimeout(this.saveTimer);
		this.closeEditor();
		this.app.workspace.iterateAllLeaves((leaf) => this.paintHeader(leaf, null));
	}

	// ============================ 基础 ============================
	get groups() { return this.data.groups; }

	isRoot(leaf) {
		const ws = this.app.workspace, r = leaf.getRoot();
		return r !== ws.leftSplit && r !== ws.rightSplit;
	}

	rootLeaves() {
		const out = [];
		this.app.workspace.iterateAllLeaves((leaf) => { if (leaf.parent && this.isRoot(leaf)) out.push(leaf); });
		return out;
	}

	tabParents() {
		const set = new Set();
		for (const leaf of this.rootLeaves()) set.add(leaf.parent);
		return [...set];
	}

	gidOf(id) {
		for (const gid in this.groups) if (this.groups[gid].members.includes(id)) return gid;
		return null;
	}

	// 组内标签页，按标签栏里的顺序
	membersInOrder(gid) {
		const g = this.groups[gid];
		if (!g) return [];
		return this.rootLeaves()
			.filter((l) => g.members.includes(l.id))
			.sort((a, b) => a.parent.children.indexOf(a) - b.parent.children.indexOf(b));
	}

	groupLabel(gid) {
		const g = this.groups[gid];
		if (g.name) return g.name;
		const ms = this.membersInOrder(gid);
		if (!ms.length) return "未命名组";
		const t = ms[0].getDisplayText();
		return ms.length === 1 ? `「${t}」` : `「${t}」等 ${ms.length} 个标签页`;
	}

	activeRootLeaf() {
		const leaf = this.app.workspace.getMostRecentLeaf();
		return leaf && this.isRoot(leaf) ? leaf : null;
	}

	save() {
		clearTimeout(this.saveTimer);
		this.saveTimer = setTimeout(() => this.saveData(this.data), 300);
	}

	commit() {
		this.normalize();
		this.save();
	}

	// 把 leaf 挪到 parent 的第 index 位（Obsidian 拖动标签页也是这么挪的）
	moveLeaf(leaf, parent, index) {
		const old = leaf.parent;
		if (!old || !parent) return;
		let i = Math.max(0, Math.min(index, parent.children.length));
		if (old === parent) {
			const cur = parent.children.indexOf(leaf);
			if (cur < i) i--;
			if (cur === i) return;
		}
		old.removeChild(leaf);
		leaf.setDimension?.(null);
		parent.insertChild(i, leaf);
	}

	// Chrome 式「固定标签页」：置为固定 + 排到本标签栏最左（已固定的标签页之后）
	pinToLeft(leaf) {
		const parent = leaf.parent;
		if (!parent || !Array.isArray(parent.children)) return;
		if (typeof leaf.setPinned !== "function") return;
		if (leaf.pinned) { leaf.setPinned(false); return; }   // 已固定 → 取消固定，位置不动
		let at = 0;
		parent.children.forEach((l, i) => { if (l !== leaf && l.pinned) at = i + 1; });
		leaf.setPinned(true);
		this.moveLeaf(leaf, parent, at);
		this.activate(leaf);
	}

	activate(leaf, focus = true) {
		this.app.workspace.setActiveLeaf(leaf, { focus });
	}

	// ============================ 维护规则 ============================
	scheduleNormalize() {
		clearTimeout(this.normalizeTimer);
		this.normalizeTimer = setTimeout(() => this.normalize(), 30);
	}

	// 和上次的顺序比，找出这次被挪动 / 新出现的标签页（不在最长公共子序列里的那些）
	movedLeaves(parents) {
		const moved = new Set();
		const prevParentOf = new Map();
		for (const [p, ids] of this.prevOrder) for (const id of ids) prevParentOf.set(id, p);
		for (const p of parents) {
			const cur = p.children.map((l) => l.id);
			const prev = (this.prevOrder.get(p) || []).filter((id) => cur.includes(id));
			const n = cur.length, m = prev.length;
			const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
			for (let i = n - 1; i >= 0; i--)
				for (let j = m - 1; j >= 0; j--)
					dp[i][j] = cur[i] === prev[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
			const keep = new Set();
			for (let i = 0, j = 0; i < n && j < m;) {
				if (cur[i] === prev[j]) { keep.add(cur[i]); i++; j++; }
				else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
				else j++;
			}
			for (const id of cur) if (!keep.has(id)) moved.add(id);
		}
		return moved;
	}

	normalize() {
		if (!this.ready) return;
		const live = new Map(this.rootLeaves().map((l) => [l.id, l]));
		if (live.size === 0) return;   // 窗口正在关闭 / 布局还没好，别把分组清掉
		const G = this.groups;
		const parents = this.tabParents();
		const moved = this.movedLeaves(parents);
		let changed = false;

		// 1. 从组里打开的新标签页进组；已关闭的标签页移出
		for (const [id, gid] of this.pendingJoin) {
			if (live.has(id) && G[gid] && !this.gidOf(id)) { G[gid].members.push(id); changed = true; }
		}
		this.pendingJoin.clear();
		for (const gid in G) {
			const kept = G[gid].members.filter((id) => live.has(id));
			if (kept.length !== G[gid].members.length) { G[gid].members = kept; changed = true; }
		}

		// 2. 被挪进 / 新出现在同一组两个标签页之间的，进组（只看动了的，没动的标签页不会因为邻居变了而被卷进去）
		for (const p of parents) {
			const ch = p.children;
			for (let i = 1; i < ch.length - 1; i++) {
				if (!moved.has(ch[i].id) || this.gidOf(ch[i].id)) continue;
				const a = this.gidOf(ch[i - 1].id);
				if (a && a === this.gidOf(ch[i + 1].id)) { G[a].members.push(ch[i].id); changed = true; }
			}
		}

		// 3. 每组只保留一段连续的标签页（同一个标签栏），其余的退组；优先保留没被挪动的那一段
		for (const gid in G) {
			const g = G[gid];
			const runs = [];
			const byParent = new Map();
			for (const id of g.members) {
				const l = live.get(id);
				if (!byParent.has(l.parent)) byParent.set(l.parent, []);
				byParent.get(l.parent).push(l);
			}
			for (const [p, ls] of byParent) {
				ls.sort((a, b) => p.children.indexOf(a) - p.children.indexOf(b));
				let run = null, prev = -2;
				for (const l of ls) {
					const i = p.children.indexOf(l);
					if (i !== prev + 1) { run = { parent: p, ids: [], still: 0 }; runs.push(run); }
					run.ids.push(l.id);
					if (!moved.has(l.id)) run.still++;
					prev = i;
				}
			}
			if (runs.length > 1) {
				const home = this.lastParent.get(gid);
				runs.sort((a, b) => b.still - a.still || b.ids.length - a.ids.length || (b.parent === home) - (a.parent === home));
				g.members = runs[0].ids;
				changed = true;
			}
			if (runs.length) this.lastParent.set(gid, runs[0].parent);
		}

		// 4. 空组删掉
		for (const gid in G) if (!G[gid].members.length) { delete G[gid]; changed = true; }

		this.prevOrder = new Map(parents.map((p) => [p, p.children.map((l) => l.id)]));

		if (changed) this.save();
		this.render();
	}

	onActiveLeaf(leaf) {
		if (!leaf || !this.ready) return;
		const gid = this.gidOf(leaf.id);
		if (gid && this.groups[gid].collapsed) {
			this.groups[gid].collapsed = false;   // 切到被折叠的标签页（搜索、⌘数字、链接…）：自动展开
			this.commit();
		}
	}

	// ============================ 绘制 ============================
	render() {
		const done = new Set();
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (!leaf.parent || !this.isRoot(leaf)) { this.paintHeader(leaf, null); return; }
			const p = leaf.parent;
			if (done.has(p)) return;
			done.add(p);
			const ch = p.children;
			let prev = null;
			ch.forEach((l, i) => {
				const gid = this.gidOf(l.id);
				const next = i + 1 < ch.length ? this.gidOf(ch[i + 1].id) : null;
				this.paintHeader(l, gid, !!gid && gid !== prev, !!gid && gid !== next);
				prev = gid;
			});
		});
		if (this.editor && !this.groups[this.editor.gid]) this.closeEditor();
	}

	paintHeader(leaf, gid, isHead, isTail) {
		const h = leaf.tabHeaderEl;
		if (!h) return;
		let chip = h.querySelector(":scope > .ctg-chip");
		if (!gid) {
			h.classList.remove(...HEADER_CLASSES);
			h.style.removeProperty("--ctg-color");
			h.style.removeProperty("--ctg-fg");
			chip?.remove();
			return;
		}
		const g = this.groups[gid], c = colorOf(g.color);
		h.classList.add("ctg-member");
		h.classList.toggle("ctg-head", isHead);
		h.classList.toggle("ctg-tail", isTail);
		h.classList.toggle("ctg-hidden", g.collapsed && !isHead);
		h.classList.toggle("ctg-collapsed", g.collapsed && isHead);
		h.style.setProperty("--ctg-color", c.bg);
		h.style.setProperty("--ctg-fg", c.fg);
		if (!isHead) { chip?.remove(); return; }
		if (!chip) {
			chip = h.ownerDocument.createElement("div");
			chip.className = "ctg-chip";
			h.prepend(chip);
			this.wireChip(chip);
		}
		chip.dataset.gid = gid;
		chip.textContent = g.name;
		chip.classList.toggle("is-empty", !g.name);
		chip.setAttribute("aria-label", `${this.groupLabel(gid)}\n点击${g.collapsed ? "展开" : "折叠"} · 右键编辑 · 拖动移动整组`);
	}

	// ============================ 色块：点击折叠、右键编辑、拖动整组 ============================
	wireChip(chip) {
		const doc = chip.ownerDocument;
		chip.addEventListener("mousedown", (e) => {
			if (e.button !== 0) return;
			e.preventDefault();
			e.stopPropagation();
			const gid = chip.dataset.gid;
			const x0 = e.clientX, y0 = e.clientY;
			let dragging = false, target = null, ind = null;
			const onMove = (ev) => {
				if (!dragging && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return;
				if (!dragging) {
					dragging = true;
					doc.body.classList.add("ctg-dragging");
					ind = doc.createElement("div");
					ind.className = "ctg-drop-indicator";
					doc.body.appendChild(ind);
				}
				target = this.dropTarget(gid, ev, doc);
				ind.style.display = target ? "" : "none";
				if (target) Object.assign(ind.style, { left: `${target.x}px`, top: `${target.top}px`, height: `${target.height}px` });
			};
			const onUp = () => {
				doc.removeEventListener("mousemove", onMove, true);
				doc.removeEventListener("mouseup", onUp, true);
				ind?.remove();
				doc.body.classList.remove("ctg-dragging");
				if (!dragging) this.toggleCollapse(gid);
				else if (target) this.moveGroup(gid, target.parent, target.index);
			};
			doc.addEventListener("mousemove", onMove, true);
			doc.addEventListener("mouseup", onUp, true);
		});
		for (const type of ["click", "dblclick", "auxclick", "pointerdown"]) {
			chip.addEventListener(type, (e) => { e.stopPropagation(); if (type !== "pointerdown") e.preventDefault(); });
		}
		chip.addEventListener("contextmenu", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.openEditor(chip.dataset.gid, chip);
		});
	}

	// 拖动时算落点：只落在「整组 / 单个组外标签页」之间，不会插进别的组中间
	dropTarget(gid, ev, doc) {
		const hc = doc.elementFromPoint(ev.clientX, ev.clientY)?.closest(".workspace-tab-header-container");
		if (!hc) return null;
		const parent = this.tabParents().find((p) => p.tabHeaderContainerEl === hc);
		if (!parent) return null;
		const mine = new Set(this.groups[gid]?.members || []);
		const units = [];
		parent.children.forEach((l, i) => {
			if (mine.has(l.id)) return;
			const g = this.gidOf(l.id);
			const last = units[units.length - 1];
			if (g && last && last.gid === g) last.leaves.push(l);
			else units.push({ gid: g, index: i, leaves: [l] });
		});
		if (!units.length) return null;
		const rectOf = (u) => {
			const rs = u.leaves.map((l) => l.tabHeaderEl.getBoundingClientRect()).filter((r) => r.width > 0);
			return rs.length ? { left: rs[0].left, right: rs[rs.length - 1].right, top: rs[0].top, height: rs[0].height } : null;
		};
		for (const u of units) {
			const r = rectOf(u);
			if (r && ev.clientX < (r.left + r.right) / 2) return { parent, index: u.index, x: r.left, top: r.top, height: r.height };
		}
		const r = rectOf(units[units.length - 1]);
		return r ? { parent, index: parent.children.length, x: r.right, top: r.top, height: r.height } : null;
	}

	moveGroup(gid, parent, index) {
		const ms = this.membersInOrder(gid);
		if (!ms.length) return;
		const mine = new Set(ms);
		const anchor = parent.children.slice(index).find((l) => !mine.has(l)) || null;
		if (!anchor && parent.children.every((l) => mine.has(l))) return;
		const active = this.app.workspace.getMostRecentLeaf();
		const shown = new Map([parent, ms[0].parent].map((p) => [p, p.children[p.currentTab]]));
		for (const m of ms) { m.parent.removeChild(m); m.setDimension?.(null); }
		let at = anchor ? parent.children.indexOf(anchor) : parent.children.length;
		for (const m of ms) parent.insertChild(at++, m);
		for (const [p, l] of shown) if (l && l.parent === p) p.selectTabIndex(p.children.indexOf(l));
		if (active && mine.has(active)) this.activate(active);
		this.lastParent.set(gid, parent);
		this.commit();
	}

	// ============================ 组操作 ============================
	createGroup(leaf, edit = true) {
		const old = this.gidOf(leaf.id);
		if (old) this.removeFromGroup(leaf, false);
		const gid = "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
		const used = new Set(Object.values(this.groups).map((g) => g.color));
		let k = this.data.nextColor % COLORS.length;
		for (let n = 0; n < COLORS.length && used.has(COLORS[k].key); n++) k = (k + 1) % COLORS.length;
		this.data.nextColor = k + 1;
		this.groups[gid] = { name: "", color: COLORS[k].key, collapsed: false, members: [leaf.id] };
		this.lastParent.set(gid, leaf.parent);
		this.commit();
		if (edit) setTimeout(() => this.openEditorFor(gid), 50);
		return gid;
	}

	addToGroup(leaf, gid) {
		const g = this.groups[gid];
		if (!g || g.members.includes(leaf.id)) return;
		const wasActive = this.app.workspace.getMostRecentLeaf() === leaf;
		const old = this.gidOf(leaf.id);
		if (old) this.groups[old].members = this.groups[old].members.filter((id) => id !== leaf.id);
		const ms = this.membersInOrder(gid);
		const last = ms[ms.length - 1];
		this.moveLeaf(leaf, last.parent, last.parent.children.indexOf(last) + 1);
		g.members.push(leaf.id);
		if (wasActive) { g.collapsed = false; this.activate(leaf); }
		this.commit();
	}

	removeFromGroup(leaf, doCommit = true) {
		const gid = this.gidOf(leaf.id);
		if (!gid) return;
		const ms = this.membersInOrder(gid);
		const i = ms.indexOf(leaf);
		if (i > 0 && i < ms.length - 1) {   // 在组中间：挪到组的右边（Chrome 也是这样）
			const last = ms[ms.length - 1];
			const wasActive = this.app.workspace.getMostRecentLeaf() === leaf;
			this.moveLeaf(leaf, last.parent, last.parent.children.indexOf(last) + 1);
			if (wasActive) this.activate(leaf);
		}
		this.groups[gid].members = this.groups[gid].members.filter((id) => id !== leaf.id);
		if (doCommit) this.commit();
	}

	toggleCollapse(gid) {
		const g = this.groups[gid];
		if (g) this.setCollapsed(gid, !g.collapsed);
	}

	setCollapsed(gid, collapsed) {
		const g = this.groups[gid];
		if (!g || g.collapsed === collapsed) return;
		if (collapsed) {
			const ms = this.membersInOrder(gid);
			if (!ms.length) return;
			const p = ms[0].parent;
			const shown = p.children[p.currentTab];
			const ws = this.app.workspace;
			if (shown && ms.includes(shown)) {
				// 正看着组里的标签页：切到组外最近的一个；没有就在组后面新建一个（Chrome 也是这样）
				const first = p.children.indexOf(ms[0]), last = p.children.indexOf(ms[ms.length - 1]);
				const cand = p.children[last + 1] || p.children[first - 1];
				const wasActive = ms.includes(ws.getMostRecentLeaf());
				if (cand) {
					p.selectTabIndex(p.children.indexOf(cand));
					if (wasActive) this.activate(cand);
				} else {
					const nl = ws.createLeafInParent(p, last + 1);
					this.activate(nl);
				}
			}
		}
		g.collapsed = collapsed;
		this.commit();
	}

	newTabInGroup(gid) {
		const ms = this.membersInOrder(gid);
		if (!ms.length) return;
		const last = ms[ms.length - 1];
		const nl = this.app.workspace.createLeafInParent(last.parent, last.parent.children.indexOf(last) + 1);
		this.groups[gid].members.push(nl.id);
		this.groups[gid].collapsed = false;
		this.activate(nl);
		this.commit();
	}

	ungroup(gid) {
		delete this.groups[gid];
		this.commit();
	}

	closeGroup(gid) {
		const ms = this.membersInOrder(gid);
		if (!ms.length) return;
		new ConfirmModal(this.app, "关闭组", `关闭「${this.groupLabel(gid)}」里的 ${ms.length} 个标签页？`, "关闭组", () => {
			for (const l of this.membersInOrder(gid)) l.detach();
			delete this.groups[gid];
			this.commit();
		}).open();
	}

	async moveGroupToWindow(gid) {
		const ms = this.membersInOrder(gid);
		if (!ms.length) return;
		this.groups[gid].collapsed = false;
		await ms[0].loadIfDeferred?.();
		const win = this.app.workspace.moveLeafToPopout(ms[0]);
		if (!win) return new Notice("这个标签页不能移到新窗口");
		const tabs = ms[0].parent;
		for (let i = 1; i < ms.length; i++) this.moveLeaf(ms[i], tabs, i);
		this.lastParent.set(gid, tabs);
		this.activate(ms[0]);
		this.commit();
	}

	// ============================ 单个标签页操作 ============================
	newTabRight(leaf) {
		const p = leaf.parent;
		const nl = this.app.workspace.createLeafInParent(p, p.children.indexOf(leaf) + 1);
		const gid = this.gidOf(leaf.id);
		if (gid) this.groups[gid].members.push(nl.id);
		this.activate(nl);
		this.commit();
	}

	async duplicate(leaf) {
		const p = leaf.parent;
		const nl = this.app.workspace.createLeafInParent(p, p.children.indexOf(leaf) + 1);
		const gid = this.gidOf(leaf.id);
		if (gid) this.groups[gid].members.push(nl.id);
		this.commit();
		await nl.setViewState(leaf.getViewState(), leaf.getEphemeralState());
		try { nl.history?.deserialize(leaf.history.serialize()); } catch (e) { /* 前进后退历史复制不了也不影响 */ }
		this.activate(nl);
	}

	// 不能拆分的原因；能拆 / 能挪就返回 null
	splitBlocked(leaf) {
		const cols = columnsOf(this.app.workspace, leaf);
		if (cols.count >= MAX_COLUMNS) return cols.rightmost === leaf.parent ? "已经在最右边一栏了（最多 3 栏）" : null;
		return leaf.parent.children.length < 2 ? "这个标签栏只有一个标签页" : null;
	}

	toNewSplit(leaf) {
		const why = this.splitBlocked(leaf);
		if (why) return new Notice(why);
		this.removeFromGroup(leaf, false);
		const cols = columnsOf(this.app.workspace, leaf);
		if (cols.count >= MAX_COLUMNS) {
			// 已经 3 栏：挪到最右边一栏、它当前标签页的右边
			const tabs = cols.rightmost;
			this.moveLeaf(leaf, tabs, tabs.currentTab + 1);
			this.activate(leaf);
			this.commit();
			return;
		}
		const nl = this.app.workspace.createLeafBySplit(leaf, "vertical");
		this.moveLeaf(leaf, nl.parent, 0);
		nl.detach();
		this.activate(leaf);
		this.commit();
	}

	// ============================ 右键菜单 ============================
	patchTabMenu() {
		const plugin = this;
		const proto = WorkspaceLeaf.prototype;
		const orig = proto.onOpenTabHeaderMenu;
		if (typeof orig !== "function") return console.warn("[chrome-tab-groups] 找不到 onOpenTabHeaderMenu，右键菜单不加项");
		// Obsidian 只在右键「当前显示的」标签页时才发 leaf-menu 事件，所以改在 view.onTabMenu 这一步加
		const patched = function (...args) {
			const leaf = this, view = leaf.view;
			if (!view || !plugin.isRoot(leaf)) return orig.apply(this, args);
			const own = Object.prototype.hasOwnProperty.call(view, "onTabMenu");
			const prev = view.onTabMenu;
			view.onTabMenu = function (menu) {
				prev.call(this, menu);
				try { plugin.addTabMenu(menu, leaf); } catch (e) { console.error(e); }
			};
			try { return orig.apply(this, args); }
			finally { if (own) view.onTabMenu = prev; else delete view.onTabMenu; }
		};
		proto.onOpenTabHeaderMenu = patched;
		this.register(() => { if (proto.onOpenTabHeaderMenu === patched) proto.onOpenTabHeaderMenu = orig; });
	}

	addTabMenu(menu, leaf) {
		const gid = this.gidOf(leaf.id);
		const sec = "title";   // 放在菜单最上面，和 Chrome 的顺序一样
		menu.addItem((i) => i.setSection(sec).setTitle("在右侧新建标签页").setIcon("lucide-plus").onClick(() => this.newTabRight(leaf)));
		menu.addItem((i) => {
			i.setSection(sec).setTitle("向新拆分视图添加标签页").setIcon("lucide-columns-2").onClick(() => this.toNewSplit(leaf));
			if (this.splitBlocked(leaf)) i.setDisabled(true);
		});
		const others = Object.keys(this.groups).filter((g) => g !== gid);
		if (!others.length) {
			menu.addItem((i) => i.setSection(sec).setTitle("将标签页添加到新组").setIcon("lucide-group").onClick(() => this.createGroup(leaf)));
		} else {
			menu.addItem((i) => {
				i.setSection(sec).setTitle("将标签页添加到组").setIcon("lucide-group");
				const sub = typeof i.setSubmenu === "function" ? i.setSubmenu() : menu;
				sub.addItem((s) => s.setTitle("新建组").setIcon("lucide-plus").onClick(() => this.createGroup(leaf)));
				sub.addSeparator();
				for (const og of others) {
					const c = colorOf(this.groups[og].color);
					const title = createFragment((f) => { dot(f, c.bg); f.appendText(" " + this.groupLabel(og)); });
					sub.addItem((s) => s.setTitle(title).onClick(() => this.addToGroup(leaf, og)));
				}
			});
		}
		if (gid) menu.addItem((i) => i.setSection(sec).setTitle("从组中移除").setIcon("lucide-ungroup").onClick(() => this.removeFromGroup(leaf)));
		menu.addItem((i) => i.setSection("pane").setTitle("复制标签页").setIcon("lucide-copy").onClick(() => this.duplicate(leaf)));
	}

	// ⌘点击链接等「从当前标签页打开新标签页」都走 workspace.getLeaf('tab')；焦点在组内标签页里时打开的就进同一组
	// （从文件列表等侧栏打开的不进组；⌘T 和「＋」直接往标签栏末尾插空白页，不走这里，也不进组）
	patchGetLeaf() {
		const plugin = this, ws = this.app.workspace;
		const own = Object.prototype.hasOwnProperty.call(ws, "getLeaf");
		const prev = ws.getLeaf;
		const patched = function (newLeaf, ...rest) {
			const act = ws.activeLeaf;
			const before = (newLeaf === "tab" || newLeaf === true) && act && plugin.isRoot(act) ? act : null;
			const leaf = prev.call(this, newLeaf, ...rest);
			try {
				if (before && leaf && leaf !== before && leaf.parent === before.parent) {
					const gid = plugin.gidOf(before.id);
					if (gid && !plugin.gidOf(leaf.id)) { plugin.pendingJoin.set(leaf.id, gid); plugin.scheduleNormalize(); }
				}
			} catch (e) { console.error(e); }
			return leaf;
		};
		ws.getLeaf = patched;
		this.register(() => { if (ws.getLeaf === patched) { if (own) ws.getLeaf = prev; else delete ws.getLeaf; } });
	}

	// ============================ 组编辑面板 ============================
	openEditorFor(gid) {
		const head = this.membersInOrder(gid)[0];
		const chip = head?.tabHeaderEl?.querySelector(":scope > .ctg-chip");
		if (chip) this.openEditor(gid, chip);
	}

	openEditor(gid, anchor) {
		this.closeEditor();
		const g = this.groups[gid];
		if (!g) return;
		const doc = anchor.ownerDocument, win = doc.defaultView;
		const box = doc.createElement("div");
		box.className = "ctg-editor";
		doc.body.appendChild(box);

		const input = box.createEl("input", { type: "text", placeholder: "为此组命名", value: g.name });
		input.addEventListener("input", () => { g.name = input.value.trim(); this.render(); this.save(); });
		input.addEventListener("keydown", (e) => {
			if (e.isComposing) return;
			if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); e.stopPropagation(); this.closeEditor(); }
		});

		const sw = box.createDiv({ cls: "ctg-swatches" });
		for (const c of COLORS) {
			const s = sw.createDiv({ cls: "ctg-swatch" + (c.key === g.color ? " is-selected" : ""), attr: { "aria-label": c.name } });
			s.style.background = c.bg;
			s.style.setProperty("--ctg-swatch", c.bg);
			s.addEventListener("click", () => {
				g.color = c.key;
				sw.querySelectorAll(".ctg-swatch").forEach((x) => x.classList.remove("is-selected"));
				s.classList.add("is-selected");
				this.render();
				this.save();
			});
		}

		const acts = box.createDiv({ cls: "ctg-actions" });
		const act = (text, icon, fn) => {
			const a = acts.createDiv({ cls: "ctg-action" });
			setIcon(a.createSpan(), icon);
			a.createSpan({ text });
			a.addEventListener("click", () => { this.closeEditor(); fn(); });
		};
		act("在组中新建标签页", "lucide-plus", () => this.newTabInGroup(gid));
		act("取消组合", "lucide-ungroup", () => this.ungroup(gid));
		act("关闭组", "lucide-x", () => this.closeGroup(gid));
		act("将组移至新窗口", "lucide-picture-in-picture-2", () => this.moveGroupToWindow(gid));

		const r = anchor.getBoundingClientRect();
		box.style.left = `${Math.max(8, Math.min(r.left, win.innerWidth - box.offsetWidth - 8))}px`;
		box.style.top = `${r.bottom + 6}px`;

		const onDown = (e) => { if (!box.contains(e.target)) this.closeEditor(); };
		const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); this.closeEditor(); } };
		setTimeout(() => doc.addEventListener("mousedown", onDown, true), 0);
		doc.addEventListener("keydown", onKey, true);
		this.editor = { gid, box, cleanup: () => { doc.removeEventListener("mousedown", onDown, true); doc.removeEventListener("keydown", onKey, true); } };
		input.focus();
		input.select();
	}

	closeEditor() {
		if (!this.editor) return;
		this.editor.cleanup();
		this.editor.box.remove();
		this.editor = null;
	}

	// ============================ 搜索标签页 ============================
	allTabs() {
		const ws = this.app.workspace;
		const out = [];
		for (const p of this.tabParents()) {
			const where = p.getRoot() === ws.rootSplit ? "" : "新窗口";
			for (const leaf of p.children) {
				const gid = this.gidOf(leaf.id);
				const path = leaf.view?.file?.path || leaf.getViewState()?.state?.file || "";
				const title = leaf.getDisplayText();
				const groupName = gid ? this.groupLabel(gid) : "";
				out.push({
					leaf, title, path, where, groupName,
					color: gid ? colorOf(this.groups[gid].color).bg : null,
					search: [title, path, groupName].join(" "),
				});
			}
		}
		return out;
	}

	async focusLeaf(leaf) {
		const gid = this.gidOf(leaf.id);
		if (gid) this.setCollapsed(gid, false);
		await this.app.workspace.revealLeaf(leaf);
		this.activate(leaf);
	}

	// ============================ 命令 ============================
	addCommands() {
		const withLeaf = (fn, needGroup = false) => (checking) => {
			const leaf = this.activeRootLeaf();
			if (!leaf || (needGroup && !this.gidOf(leaf.id))) return false;
			if (!checking) fn(leaf, this.gidOf(leaf.id));
			return true;
		};
		this.addCommand({ id: "add-to-new-group", name: "将当前标签页添加到新组", checkCallback: withLeaf((l) => this.createGroup(l)) });
		this.addCommand({ id: "remove-from-group", name: "将当前标签页移出组", checkCallback: withLeaf((l) => this.removeFromGroup(l), true) });
		this.addCommand({ id: "toggle-group", name: "折叠 / 展开当前标签页所在的组", checkCallback: withLeaf((l, g) => this.toggleCollapse(g), true) });
		this.addCommand({ id: "edit-group", name: "编辑当前标签页所在的组（名称、颜色）", checkCallback: withLeaf((l, g) => this.openEditorFor(g), true) });
		this.addCommand({ id: "close-group", name: "关闭当前标签页所在的组", checkCallback: withLeaf((l, g) => this.closeGroup(g), true) });
		this.addCommand({ id: "search-tabs", name: "搜索标签页", callback: () => new TabSearchModal(this).open() });
		this.addCommand({ id: "new-tab-right", name: "在右侧新建标签页", checkCallback: withLeaf((l) => this.newTabRight(l)) });
		this.addCommand({ id: "duplicate-tab", name: "复制当前标签页", checkCallback: withLeaf((l) => this.duplicate(l)) });
		this.addCommand({ id: "move-to-new-split", name: "将当前标签页移到新拆分视图", checkCallback: withLeaf((l) => this.toNewSplit(l)) });
		this.addCommand({ id: "pin-to-left", name: "锁定当前标签页并移到最左", checkCallback: withLeaf((l) => this.pinToLeft(l)) });
	}
};
