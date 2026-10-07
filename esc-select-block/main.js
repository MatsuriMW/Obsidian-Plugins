// 编辑体验 Logseq 化
//
// 一、Esc 选中整块
//   · 光标在列表里按 Esc：选中光标所在的列表项连同它所有子项 / 续行，从行首选到下一行开头
//     （带上换行，⌘C 复制保留层级，⌘X / 删除能把整块干净拿掉）
//   · 选中状态下按 ↑ / ↓：选中上一块 / 下一块，保持选中状态，不回到编辑（顺序和 Logseq 一样：
//     ↓ 先进第一个子项，↑ 先到上面最近的那一块，可能是上一个兄弟的最后一个子项）
//   · 选中状态下按 ⇧↑ / ⇧↓：把上一块 / 下一块加进选区
//   · 选中状态下按 Enter：回到编辑，光标放在当前块首行末尾
//   · 再按一次 Esc：取消选中；没移动过就回到原来的光标位置，移动过就放在当前块首行末尾
//   · 已有选区时按 Esc：选中选区跨过的所有块
//   · 光标在续行 / 子段落上时，归到它所属的列表项；在空行上不接管
//   · 不接管：光标不在列表里、有弹出菜单或建议框（todoseq 等）、多光标、Vim 模式
//   扩大 / 缩小选区交给 Expandomatic
//
// 二、选中文字后输入成对符号：包起来，不替换
//   · 选中「文字」后输入 [ → 「[文字]」，选区仍在「文字」上，再按一次 [ → 「[[文字]]」，就是双链
//   · 适用于 () [] {} <> "" '' `` 和中文的 （） 【】 「」 『』 《》 〈〉 “” ‘’
//   · 输入的是右半边也一样（中文输入法打引号时会在 “ 和 ” 之间轮换）
//   · 没有选中文字时不接管，照常输入
const { Plugin } = require("obsidian");
const { keymap, EditorView } = require("@codemirror/view");
const { Prec, EditorSelection } = require("@codemirror/state");

const ITEM_RE = /^[ \t]*(?:[-*+]|\d+[.)])(?:[ \t]|$)/;
const TAB_WIDTH = 4;

// 左半边 → 右半边
const PAIRS = {
	"(": ")", "[": "]", "{": "}", "<": ">", '"': '"', "'": "'", "`": "`",
	"（": "）", "【": "】", "「": "」", "『": "』", "《": "》", "〈": "〉", "“": "”", "‘": "’",
};
// 右半边 → 左半边（不对称的才需要）
const CLOSE_TO_OPEN = {};
for (const [o, c] of Object.entries(PAIRS)) if (o !== c) CLOSE_TO_OPEN[c] = o;

function indentWidth(line) {
	let w = 0;
	for (const c of line) {
		if (c === "\t") w += TAB_WIDTH;
		else if (c === " ") w += 1;
		else break;
	}
	return w;
}
const isBlank = (l) => l.trim() === "";
const isItem = (l) => ITEM_RE.test(l);

// 第 line 行所属的列表项行号；不在列表里返回 -1（行号从 0 开始）
function itemLineFor(getLine, line) {
	let i = line;
	const first = getLine(i);
	if (isBlank(first)) return -1;               // 空行不属于任何块
	if (isItem(first)) return i;
	const w = indentWidth(first);
	if (w === 0) return -1;                      // 顶格的普通段落，不在列表里
	for (i--; i >= 0; i--) {
		const l = getLine(i);
		if (isBlank(l)) continue;
		if (isItem(l) && indentWidth(l) < w) return i;
		if (indentWidth(l) === 0 && !isItem(l)) return -1;
	}
	return -1;
}

// 列表项 start 的整棵子树最后一行
function subtreeEnd(getLine, lineCount, start) {
	const w0 = indentWidth(getLine(start));
	let end = start;
	for (let i = start + 1; i < lineCount; i++) {
		const l = getLine(i);
		if (isBlank(l)) continue;
		if (indentWidth(l) > w0) end = i;
		else break;
	}
	return end;
}

// fromLine..toLine 覆盖到的所有块 → { start, end }；不在列表里返回 null
function blockLines(getLine, lineCount, fromLine, toLine) {
	const start = itemLineFor(getLine, fromLine);
	if (start < 0) return null;
	let end = subtreeEnd(getLine, lineCount, start);
	if (toLine > end) {
		const last = itemLineFor(getLine, toLine);
		end = Math.max(end, toLine, last >= 0 ? subtreeEnd(getLine, lineCount, last) : toLine);
	}
	return { start, end };
}

// 列表项 item 上面最近的一块（往上找第一个非空行所属的列表项）；没有返回 -1
function prevItem(getLine, item) {
	for (let i = item - 1; i >= 0; i--) {
		if (isBlank(getLine(i))) continue;
		return itemLineFor(getLine, i);
	}
	return -1;
}

// 行 after 之后的第一个列表项（中间只隔着空行和续行）；遇到列表外的内容或到底返回 -1
function nextItemAfter(getLine, lineCount, after) {
	for (let i = after + 1; i < lineCount; i++) {
		const l = getLine(i);
		if (isBlank(l)) continue;
		if (isItem(l)) return i;
		if (itemLineFor(getLine, i) < 0) return -1;
	}
	return -1;
}

module.exports = class LogseqEditing extends Plugin {
	onload() {
		this.blockLines = blockLines;     // 方便在控制台里测试
		// view → { from, to, start, end, anchor, head, moved }
		//   from / to：当前选中的字符范围；start / end：选中的块的首行和末行（行号从 0 开始）
		//   anchor / head：按 Esc 之前原来的光标；moved：选中后有没有用方向键移动过
		this.saved = new WeakMap();
		this.registerEditorExtension([
			Prec.high(keymap.of([
				{ key: "Escape", run: (view) => this.onEsc(view) },
				{ key: "ArrowUp", run: (view) => this.move(view, -1, false) },
				{ key: "ArrowDown", run: (view) => this.move(view, 1, false) },
				{ key: "Shift-ArrowUp", run: (view) => this.move(view, -1, true) },
				{ key: "Shift-ArrowDown", run: (view) => this.move(view, 1, true) },
				{ key: "Enter", run: (view) => this.edit(view) },
			])),
			EditorView.inputHandler.of((view, from, to, text) => this.wrap(view, text)),
		]);
	}

	// ---------- 块选中 ----------

	// 当前处在「Esc 选中整块」状态时返回保存的信息，否则 null
	active(view) {
		const s = this.saved.get(view);
		if (!s) return null;
		const sel = view.state.selection;
		if (sel.ranges.length === 1 && sel.main.from === s.from && sel.main.to === s.to) return s;
		this.saved.delete(view);       // 选区已经被别的操作改了，退出选中状态
		return null;
	}

	// 选中第 start..end 行（行号从 0 开始），记下状态
	selectLines(view, start, end, extra) {
		const doc = view.state.doc;
		const from = doc.line(start + 1).from;
		const to = end + 1 < doc.lines ? doc.line(end + 2).from : doc.length;
		this.saved.set(view, { ...extra, from, to, start, end });
		view.dispatch({ selection: EditorSelection.single(from, to), scrollIntoView: true });
	}

	onEsc(view) {
		if (this.app.vault.getConfig("vimMode")) return false;
		if (document.querySelector(".suggestion-container, .menu")) return false;
		const { state } = view;
		if (state.selection.ranges.length > 1) return false;   // 多光标：交给 CodeMirror 默认的 Esc 收成一个
		const sel = state.selection.main, doc = state.doc;

		// 第二次 Esc：取消选中
		const prev = this.active(view);
		if (prev) {
			this.saved.delete(view);
			const selection = prev.moved
				? EditorSelection.cursor(doc.line(prev.start + 1).to)
				: EditorSelection.single(prev.anchor, prev.head);
			view.dispatch({ selection });
			return true;
		}

		const getLine = (i) => doc.line(i + 1).text;
		const fromLine = doc.lineAt(sel.from).number - 1;
		let toLine = doc.lineAt(sel.to).number - 1;
		if (toLine > fromLine && sel.to === doc.line(toLine + 1).from) toLine--;   // 整行选区的末尾落在下一行开头
		const b = blockLines(getLine, doc.lines, fromLine, toLine);
		if (!b) return false;

		const from = doc.line(b.start + 1).from;
		const to = b.end + 1 < doc.lines ? doc.line(b.end + 2).from : doc.length;
		if (sel.from === from && sel.to === to) {
			// 已经正好选中这一块（比如别的方式选的）：取消选中，光标放到块首行末尾
			view.dispatch({ selection: EditorSelection.cursor(doc.line(b.start + 1).to) });
			return true;
		}
		this.selectLines(view, b.start, b.end, { anchor: sel.anchor, head: sel.head, moved: false });
		return true;
	}

	// ↑ / ↓ 换到上一块 / 下一块；extend 为真时（⇧）把那一块加进选区
	move(view, dir, extend) {
		const s = this.active(view);
		if (!s) return false;
		const doc = view.state.doc;
		const getLine = (i) => doc.line(i + 1).text;
		let start = s.start, end = s.end;

		if (dir < 0) {
			const p = prevItem(getLine, s.start);
			if (p < 0) return true;                        // 已经是第一块：保持选中，不回到编辑
			start = p;
			if (!extend) end = subtreeEnd(getLine, doc.lines, p);
		} else {
			// 不扩选时，↓ 从当前块的首行往下找（先进它的第一个子项）；扩选时从选区末尾往下找
			const n = nextItemAfter(getLine, doc.lines, extend ? s.end : s.start);
			if (n < 0) return true;                        // 已经是最后一块
			end = subtreeEnd(getLine, doc.lines, n);
			if (!extend) start = n;
		}
		this.selectLines(view, start, Math.max(end, start), { anchor: s.anchor, head: s.head, moved: true });
		return true;
	}

	// Enter：回到编辑，光标放在当前块首行末尾
	edit(view) {
		const s = this.active(view);
		if (!s) return false;
		this.saved.delete(view);
		view.dispatch({ selection: EditorSelection.cursor(view.state.doc.line(s.start + 1).to) });
		return true;
	}

	// ---------- 成对符号包裹 ----------

	wrap(view, text) {
		const open = PAIRS[text] ? text : CLOSE_TO_OPEN[text];
		if (!open) return false;
		const { state } = view;
		if (state.selection.ranges.some((r) => r.empty)) return false;   // 有没选中文字的光标：照常输入
		if (this.active(view)) return false;                             // 选中的是整块，不是一段文字
		const close = PAIRS[open];
		const tr = state.changeByRange((r) => ({
			changes: [{ from: r.from, insert: open }, { from: r.to, insert: close }],
			range: EditorSelection.range(r.anchor + open.length, r.head + open.length),
		}));
		this.saved.delete(view);
		view.dispatch(tr, { scrollIntoView: true, userEvent: "input.type" });
		return true;
	}
};
