// Esc 选中整块（仿 Logseq）
//   · 光标在列表里按 Esc：选中光标所在的列表项连同它所有子项 / 续行，从行首选到下一行开头
//     （带上换行，⌘C 复制保留层级，⌘X / 删除能把整块干净拿掉）
//   · 再按一次 Esc：取消选中，光标回到原来的位置
//   · 已有选区时按 Esc：选中选区跨过的所有块
//   · 光标在续行 / 子段落上时，归到它所属的列表项；在空行上不接管
//   · 不接管：光标不在列表里、有弹出菜单或建议框（todoseq 等）、多光标、Vim 模式
//   扩大 / 缩小选区交给 Expandomatic
const { Plugin } = require("obsidian");
const { keymap } = require("@codemirror/view");
const { Prec, EditorSelection } = require("@codemirror/state");

const ITEM_RE = /^[ \t]*(?:[-*+]|\d+[.)])(?:[ \t]|$)/;
const TAB_WIDTH = 4;

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

module.exports = class EscSelectBlock extends Plugin {
	onload() {
		this.blockLines = blockLines;     // 方便在控制台里测试
		this.saved = new WeakMap();       // view → { from, to, anchor, head }：上一次 Esc 选中的范围和原来的光标
		this.registerEditorExtension(Prec.high(keymap.of([{ key: "Escape", run: (view) => this.onEsc(view) }])));
	}

	onEsc(view) {
		if (this.app.vault.getConfig("vimMode")) return false;
		if (document.querySelector(".suggestion-container, .menu")) return false;
		const { state } = view;
		if (state.selection.ranges.length > 1) return false;   // 多光标：交给 CodeMirror 默认的 Esc 收成一个
		const sel = state.selection.main, doc = state.doc;

		// 第二次 Esc：取消选中，回到原来的光标
		const prev = this.saved.get(view);
		this.saved.delete(view);
		if (prev && sel.from === prev.from && sel.to === prev.to) {
			view.dispatch({ selection: EditorSelection.single(prev.anchor, prev.head) });
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
		this.saved.set(view, { from, to, anchor: sel.anchor, head: sel.head });
		view.dispatch({ selection: EditorSelection.single(from, to) });
		return true;
	}
};
