// 列表粘贴合并（仿 Logseq）：光标在列表项里粘贴列表时，两边的列表符号合成一个，不会出现「- - 」
//   · 当前条目是空的（「- |」）：剪贴板第一条直接占用这一行，后面的行按当前缩进平移，层级不变
//   · 当前条目已经有字、剪贴板有多条：当前条目不动，粘贴内容作为同级新条目插在它（连同子项）的下面
//   · 剪贴板只有一条：去掉它的符号，内容接在光标处
//   · 剪贴板里和第一条同级的条目，改成当前列表的符号：无序用当前的 - / * / +，有序接着当前编号往下数
//   · 剪贴板是用空行隔开的几段普通文字：每段变成一个条目；只有一段、或含代码块时照常粘贴
//   · 有序列表：插入后，下面同级的有序条目接着重新编号
//   · 当前行是空条目且没有复选框时，剪贴板第一条的复选框保留；否则去掉
//   · 只认剪贴板的纯文本；光标在缩进或符号里、选区跨行时都走 Obsidian 默认粘贴
const { Plugin } = require("obsidian");

// 缩进 / 列表符号 / 空白 / 复选框
const ITEM_RE = /^([ \t]*)([-*+]|\d+[.)])([ \t]+|$)(\[[^\]]\][ \t]+)?/;
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

function parseItem(line) {
	const m = line.match(ITEM_RE);
	if (!m) return null;
	const ord = m[2].match(/^(\d+)([.)])$/);
	return {
		indent: m[1],
		marker: m[2],
		ordered: !!ord,
		num: ord ? parseInt(ord[1], 10) : 0,
		delim: ord ? ord[2] : "",
		spaced: m[3] !== "",
		checkbox: m[4] || "",
		headLen: m[1].length + m[2].length + m[3].length,   // 到符号后的空白为止
		fullLen: m[0].length,                               // 含复选框
	};
}

// 剪贴板 → 列表行。本身是列表就原样返回；几段普通文字就每段变成一条；都不是返回 null
function clipToList(clip) {
	const text = clip.replace(/\r\n?/g, "\n").replace(/^\s*\n/, "").replace(/\s+$/, "");
	if (!text) return null;
	const lines = text.split("\n");
	if (parseItem(lines[0])) return lines;
	if (/^[ \t]*(```|~~~)/m.test(text)) return null;

	const paras = text.split(/\n[ \t]*\n/).filter((p) => p.trim());
	if (paras.length < 2) return null;
	const out = [];
	for (const p of paras) {
		const pl = p.replace(/^\n+/, "").split("\n");
		const it = parseItem(pl[0]);
		if (it) out.push(...pl.map((l) => (l.startsWith(it.indent) ? l.slice(it.indent.length) : l.trimStart())));
		else out.push("- " + pl[0].trim(), ...pl.slice(1).map((l) => "  " + l.trim()));
	}
	return out;
}

// 算出这次粘贴怎么做；不需要接管时返回 null
//   { mode: "inline", text, renumber }       → 用 text 替换选区 / 插在光标处
//   { mode: "below", line, text, renumber }  → 在第 line 行末尾另起一行插入 text
//   renumber: [{ line, text }] 下面要改号的同级有序条目（行号按粘贴前的文档）
function planPaste(getLine, lineCount, lineNo, ch, hasSelection, clip) {
	const lineText = getLine(lineNo);
	const cur = parseItem(lineText);
	if (!cur || !cur.spaced || ch < cur.headLen) return null;
	const lines = clipToList(clip);
	if (!lines) return null;

	const first = parseItem(lines[0]);
	const base = first.indent;
	let n = cur.num;
	// 把剪贴板的行挪到当前缩进下；与第一条同级的条目换成当前列表的符号
	const relist = (ls) => ls.map((line) => {
		if (line.trim() === "") return "";
		const it = parseItem(line);
		if (it && it.indent === base) {
			n++;
			const body = line.slice(it.indent.length + it.marker.length);   // 保留空白和复选框
			return cur.indent + (cur.ordered ? `${n}${cur.delim}` : cur.marker) + body;
		}
		const rest = line.startsWith(base) ? line.slice(base.length) : line.replace(/^[ \t]+/, "");
		return cur.indent + rest;
	});

	const w0 = indentWidth(lineText);
	// 粘贴后，把下面同级的有序条目接着 n 往下编号（遇到更浅的行或非有序条目就停）
	const renumberBelow = () => {
		const edits = [];
		if (!cur.ordered) return edits;
		for (let i = lineNo + 1; i < lineCount; i++) {
			const l = getLine(i);
			if (l.trim() === "") continue;
			const w = indentWidth(l);
			if (w > w0) continue;
			const it = w === w0 ? parseItem(l) : null;
			if (!it || !it.ordered) break;
			n++;
			if (it.num !== n) edits.push({ line: i, text: it.indent + n + it.delim + l.slice(it.indent.length + it.marker.length) });
		}
		return edits;
	};

	const curHasText = lineText.slice(cur.fullLen).trim() !== "";
	if (curHasText && !hasSelection && lines.length > 1) {
		// 插到当前条目的整棵子树后面
		let end = lineNo;
		for (let i = lineNo + 1; i < lineCount; i++) {
			const l = getLine(i);
			if (l.trim() === "") continue;
			if (indentWidth(l) > w0) end = i;
			else break;
		}
		const text = relist(lines).join("\n");
		return { mode: "below", line: end, text, renumber: renumberBelow() };
	}

	// 第一条并进当前行：去掉符号；当前行是空条目且没有复选框时，保留剪贴板的复选框
	const curIsEmpty = ch === cur.headLen && !curHasText;
	const keepBox = curIsEmpty && !cur.checkbox && first.checkbox;
	const head = (keepBox ? first.checkbox : "") + lines[0].slice(first.fullLen);
	const text = [head, ...relist(lines.slice(1))].join("\n");
	return { mode: "inline", text, renumber: renumberBelow() };
}

module.exports = class ListPasteMerge extends Plugin {
	onload() {
		this.planPaste = planPaste;   // 方便在控制台里测试
		this.registerEvent(this.app.workspace.on("editor-paste", (evt, editor) => {
			if (evt.defaultPrevented || !evt.clipboardData) return;
			if (evt.clipboardData.files && evt.clipboardData.files.length) return;
			const clip = evt.clipboardData.getData("text/plain");
			if (!clip) return;

			const from = editor.getCursor("from"), to = editor.getCursor("to");
			if (from.line !== to.line) return;
			const hasSelection = from.ch !== to.ch;
			const plan = planPaste((i) => editor.getLine(i), editor.lineCount(), from.line, from.ch, hasSelection, clip);
			if (!plan) return;

			evt.preventDefault();
			// 改号和插入放进同一个 transaction：位置都按粘贴前的文档算，⌘Z 一次撤销
			const changes = plan.renumber.map((r) => ({
				from: { line: r.line, ch: 0 }, to: { line: r.line, ch: editor.getLine(r.line).length }, text: r.text,
			}));
			const segs = plan.text.split("\n");
			const tail = segs[segs.length - 1].length;
			let caret;
			if (plan.mode === "inline") {
				changes.push({ from, to, text: plan.text });
				caret = { line: from.line + segs.length - 1, ch: (segs.length === 1 ? from.ch : 0) + tail };
			} else {
				changes.push({ from: { line: plan.line, ch: editor.getLine(plan.line).length }, text: "\n" + plan.text });
				caret = { line: plan.line + segs.length, ch: tail };
			}
			editor.transaction({ changes, selection: { from: caret } });
		}));
	}
};
