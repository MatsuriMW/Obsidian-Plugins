// 列表提到底（⌘[）：顶格的列表项再往前提，就取消列表格式，变成普通段落
//   · 光标 / 选区碰到的行全是顶格列表项时才接管：去掉「- 」「1. 」和复选框，文字留在原处
//   · 这一项下面的子项（缩进比它深的连续行）整体往前提一级，不会变成悬空的缩进
//   · 只要有一行不是顶格列表项（有缩进、普通文字），就照常减少缩进
// 注册成 Obsidian 命令（默认 ⌘[），可以在「设置 → 快捷键」里搜到、改键
const { Plugin } = require("obsidian");

// 缩进 / 列表符号 / 空白 / 复选框
const ITEM_RE = /^([ \t]*)([-*+]|\d+[.)])([ \t]+|$)(\[[^\]]\][ \t]+)?/;

function topLevelItemLen(text) {
	const m = text.match(ITEM_RE);
	return m && m[1] === "" ? m[0].length : -1;
}

function outdentToPlain(view) {
	const doc = view.state.doc;
	const targets = new Set();
	for (const r of view.state.selection.ranges) {
		const a = doc.lineAt(r.from).number, b = doc.lineAt(r.to).number;
		for (let n = a; n <= b; n++) targets.add(n);
	}
	for (const n of targets) {
		const t = doc.line(n).text;
		if (t.trim() !== "" && topLevelItemLen(t) < 0) return false;
	}

	const changes = [];
	for (const n of [...targets].sort((x, y) => x - y)) {
		const line = doc.line(n);
		const len = topLevelItemLen(line.text);
		if (len < 0) continue;
		changes.push({ from: line.from, to: line.from + len });
		// 子项：紧跟着、缩进比它深的行（中间的空行算进去），按第一条子项的缩进往前提一级
		let unit = null;
		for (let k = n + 1; k <= doc.lines; k++) {
			const c = doc.line(k);
			if (c.text.trim() === "") continue;
			const ind = c.text.match(/^[ \t]*/)[0];
			if (ind === "") break;
			if (unit === null) unit = ind;
			const cut = c.text.startsWith(unit) ? unit.length : ind.length;
			changes.push({ from: c.from, to: c.from + cut });
		}
	}
	if (!changes.length) return false;
	view.dispatch({ changes, userEvent: "delete.dedent" });
	return true;
}

module.exports = class ListOutdentPlain extends Plugin {
	onload() {
		this.addCommand({
			id: "outdent",
			name: "减少缩进（顶格列表项再按 = 变成普通文字）",
			hotkeys: [{ modifiers: ["Mod"], key: "[" }],
			editorCallback: (editor) => {
				if (!(editor.cm && outdentToPlain(editor.cm))) editor.exec("indentLess");
			},
		});
	}
};
