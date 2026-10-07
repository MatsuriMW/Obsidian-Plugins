// 编辑体验 Logseq 化
//
// 一、Esc 选中整块
//   · 光标在列表里按 Esc：选中光标所在的列表项连同它所有子项 / 续行，从行首选到下一行开头
//     （带上换行，⌘C 复制保留层级，⌘X / 删除能把整块干净拿掉）
//   · 「块」只指无序 / 有序列表项（连同子项）。普通段落、标题不算块，按 Esc 不接管
//   · 选中状态下按 ↑ / ↓：选中上一块 / 下一块，保持选中状态，不回到编辑（顺序和 Logseq 一样：
//     ↓ 先进第一个子项，↑ 先到上面最近的那一块，可能是上一个兄弟的最后一个子项）；
//     中间隔着普通段落、标题时跳过去，接着找下一个列表项
//   · 选中状态很「粘」：选中后按 Tab / ⇧Tab 改层级、⌘⇧↑↓（Bullet）或 ⌥↑↓ 上下挪动，
//     挪完仍然是整块选中（按块首行的内容重新找到它）；只有打字、删除、粘贴会替换掉这一块并退出
//   · 选区是反向的（光标在块首行开头）：Bullet 等插件按光标所在的列表项操作，这样操作的就是选中的这一块
//   · 方向键要用最高优先级：Obsidian 自己在实时预览里给 ↑↓ 挂了同级（high）的处理，
//     有选区时会把选区收成光标并吞掉按键，插件的同级处理排在它后面，根本轮不到
//   · 选中状态下按 ⇧↑ / ⇧↓：把上一块 / 下一块加进选区
//   · 选中状态下按 Enter：回到编辑，光标放在当前块首行末尾
//   · 再按一次 Esc：取消选中；没移动过就回到原来的光标位置，移动过就放在当前块首行末尾
//   · 已有选区时按 Esc：选中选区跨过的所有块
//   · 光标在续行 / 子段落上时，归到它所属的列表项；在空行上不接管
//   · 不接管：光标不在列表里、有弹出菜单或建议框（todoseq 等）、多光标、Vim 模式
//   扩大 / 缩小选区交给 Expandomatic
//
// 二、选中文字后输入成对符号：包起来，不替换（不管中文还是英文输入法）
//   · 选中「文字」后输入 [ → 「[文字]」，选区仍在「文字」上，再按一次 [ → 「[[文字]]」，就是双链
//   · 中文输入法下 [ 键打出来的是 【：第一次包成【文字】，再按一次同样变成 [[文字]]
//     （外面已经是 [] 或 【】 时，再输入 [ 或 【 一律变成双链）
//   · 适用于 () [] {} <> "" '' `` 和中文的 （） 【】 「」 『』 《》 〈〉 “” ‘’
//   · 输入的是右半边也一样（中文输入法打引号时会在 “ 和 ” 之间轮换）
//   · 不管字符是怎么进来的（直接输入、输入法直接上屏、输入法选字上屏），都是事后看：
//     「选中的文字被换成了一个成对符号」就改成包裹
//   · 没有选中文字、或者选中的是 Esc 选出来的整块时，不接管
const { Plugin } = require("obsidian");
const { keymap, EditorView } = require("@codemirror/view");
const { Prec, EditorSelection, EditorState, StateField, StateEffect } = require("@codemirror/state");

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

// 文档 doc（CodeMirror Text）里 from..to 是选中的文字，输入了字符 ch：
// 返回要做的替换 { from, to, insert } 和替换后文字的位置 { selFrom, selTo }；ch 不是成对符号返回 null
function wrapSpec(doc, from, to, ch) {
	const open = PAIRS[ch] ? ch : CLOSE_TO_OPEN[ch];
	if (!open) return null;
	const text = doc.sliceString(from, to);
	if (open === "[" || open === "【") {
		const before = from > 0 ? doc.sliceString(from - 1, from) : "";
		const after = doc.sliceString(to, to + 1);
		if ((before === "[" && after === "]") || (before === "【" && after === "】")) {
			// 第二次按：[文字] / 【文字】 → [[文字]]
			return { from: from - 1, to: to + 1, insert: "[[" + text + "]]", selFrom: from + 1, selTo: to + 1 };
		}
	}
	const close = PAIRS[open];
	return { from, to, insert: open + text + close, selFrom: from + open.length, selTo: to + open.length };
}

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

// 列表项 item 上面最近的一块（往上找第一个属于列表项的非空行，普通段落、标题跳过）；没有返回 -1
function prevItem(getLine, item) {
	for (let i = item - 1; i >= 0; i--) {
		if (isBlank(getLine(i))) continue;
		const it = itemLineFor(getLine, i);
		if (it >= 0) return it;
	}
	return -1;
}

// 行 after 之后的第一个列表项（空行、续行、普通段落、标题都跳过）；到底返回 -1
function nextItemAfter(getLine, lineCount, after) {
	for (let i = after + 1; i < lineCount; i++) {
		if (isItem(getLine(i))) return i;
	}
	return -1;
}

// 列表项那一行的内容（去掉缩进、列表符号、编号、复选框），用来在改层级 / 挪动之后重新认出这一块
const keyOf = (line) => line.replace(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]*(?:\[.\][ \t]+)?/, "").trim();

// 第 start..end 行（从 0 开始）对应的字符范围：从首行开头到末行之后那一行的开头（带上换行）
function rangeOf(doc, start, end) {
	return { from: doc.line(start + 1).from, to: end + 1 < doc.lines ? doc.line(end + 2).from : doc.length };
}
// 选中整块用反向选区：光标（head）在块首行开头
const blockSelection = (doc, start, end) => { const r = rangeOf(doc, start, end); return EditorSelection.single(r.to, r.from); };

// 「Esc 选中整块」的状态放在编辑器状态里：{ start, end, key, multi, anchor, head, moved }
//   start / end：块的首行和末行；key：首行内容；multi：⇧↑↓ 扩选过（不止一棵子树）
//   anchor / head：按 Esc 之前原来的光标；moved：选中后有没有用方向键移动过
const setBlock = StateEffect.define();
const blockField = StateField.define({
	create: () => null,
	update(val, tr) {
		for (const e of tr.effects) if (e.is(setBlock)) return e.value;
		if (!val) return null;
		if (!tr.docChanged && tr.selection === undefined) return val;   // 文档和选区都没动
		return null;   // 别的操作改了选区或文档：先退出，能认回来的话 keepBlock 会重新设上
	},
});

module.exports = class LogseqEditing extends Plugin {
	onload() {
		this.blockLines = blockLines;     // 方便在控制台里测试
		this.beforeCompose = new WeakMap();   // view → 输入法开始组字前的 state
		this.registerEditorExtension([
			blockField,
			Prec.highest(keymap.of([
				{ key: "Escape", run: (view) => this.onEsc(view) },
				{ key: "ArrowUp", run: (view) => this.move(view, -1, false) },
				{ key: "ArrowDown", run: (view) => this.move(view, 1, false) },
				{ key: "Shift-ArrowUp", run: (view) => this.move(view, -1, true) },
				{ key: "Shift-ArrowDown", run: (view) => this.move(view, 1, true) },
				{ key: "Enter", run: (view) => this.edit(view) },
			])),
			EditorState.transactionFilter.of((tr) => this.keepBlock(tr)),
			EditorState.transactionFilter.of((tr) => this.wrapFilter(tr)),
			EditorView.domEventHandlers({
				compositionstart: (e, view) => { this.beforeCompose.set(view, view.state); },
				compositionend: (e, view) => { setTimeout(() => this.wrapAfterCompose(view), 0); },
			}),
		]);
	}

	// ---------- 块选中 ----------

	// state 处在「Esc 选中整块」状态时返回保存的信息，否则 null
	activeIn(state) {
		const val = state.field(blockField, false);
		if (!val) return null;
		const sel = state.selection, r = rangeOf(state.doc, val.start, val.end);
		return sel.ranges.length === 1 && sel.main.from === r.from && sel.main.to === r.to ? val : null;
	}
	active(view) { return this.activeIn(view.state); }

	// 选中第 start..end 行（行号从 0 开始），记下状态
	selectLines(view, start, end, extra) {
		const doc = view.state.doc, getLine = (i) => doc.line(i + 1).text;
		const multi = end > subtreeEnd(getLine, doc.lines, start);
		view.dispatch({
			selection: blockSelection(doc, start, end),
			effects: setBlock.of({ ...extra, start, end, multi, key: keyOf(getLine(start)) }),
			scrollIntoView: true,
		});
	}

	// 选中状态下别的操作改了文档（改层级、上下挪动……）：按首行内容重新认出这一块，接着整块选中。
	// 打字、删除、粘贴、拖放、补全 = 这一块被替换掉了，退出
	keepBlock(tr) {
		if (!tr.docChanged || tr.effects.some((e) => e.is(setBlock))) return tr;
		const val = this.activeIn(tr.startState);
		if (!val) return tr;
		if (["input.type", "input.paste", "input.drop", "input.complete", "delete"].some((u) => tr.isUserEvent(u))) return tr;
		const doc = tr.newDoc, getLine = (i) => doc.line(i + 1).text;
		const old = rangeOf(tr.startState.doc, val.start, val.end);
		// 先看操作自己设的光标（Bullet 挪动后光标跟着那一块走），再看原来块首在新文档里的位置
		const cands = [];
		if (tr.selection) { const m = tr.selection.main; cands.push(m.head, m.anchor); }
		cands.push(tr.changes.mapPos(old.from, 1), tr.changes.mapPos(old.from, -1));
		let start = -1;
		for (const pos of cands) {
			const it = itemLineFor(getLine, doc.lineAt(Math.max(0, Math.min(pos, doc.length))).number - 1);
			if (it >= 0 && keyOf(getLine(it)) === val.key) { start = it; break; }
		}
		if (start < 0) return tr;
		let end = subtreeEnd(getLine, doc.lines, start);
		if (val.multi) {
			const lastPos = Math.max(0, Math.min(doc.length, tr.changes.mapPos(old.to, -1) - 1));
			end = Math.max(end, doc.lineAt(lastPos).number - 1);
		}
		return [tr, { selection: blockSelection(doc, start, end), effects: setBlock.of({ ...val, start, end }), sequential: true }];
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
			const selection = prev.moved
				? EditorSelection.cursor(doc.line(prev.start + 1).to)
				: EditorSelection.single(Math.min(prev.anchor, doc.length), Math.min(prev.head, doc.length));
			view.dispatch({ selection, effects: setBlock.of(null) });
			return true;
		}

		const getLine = (i) => doc.line(i + 1).text;
		const fromLine = doc.lineAt(sel.from).number - 1;
		let toLine = doc.lineAt(sel.to).number - 1;
		if (toLine > fromLine && sel.to === doc.line(toLine + 1).from) toLine--;   // 整行选区的末尾落在下一行开头
		const b = blockLines(getLine, doc.lines, fromLine, toLine);
		if (!b) return false;

		const r = rangeOf(doc, b.start, b.end);
		if (sel.from === r.from && sel.to === r.to) {
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
		view.dispatch({ selection: EditorSelection.cursor(view.state.doc.line(s.start + 1).to), effects: setBlock.of(null) });
		return true;
	}

	// ---------- 成对符号包裹 ----------

	isBlockSelection(state) { return !!this.activeIn(state); }

	// 直接输入的字符（英文输入法、中文输入法直接上屏的标点）：在事务生效前改成包裹
	wrapFilter(tr) {
		if (!tr.docChanged || !tr.isUserEvent("input.type") || tr.isUserEvent("input.type.compose")) return tr;
		const start = tr.startState, ranges = start.selection.ranges;
		if (ranges.some((r) => r.empty) || this.isBlockSelection(start)) return tr;
		// 每个选区都正好被换成了同一个字符
		const changes = [];
		tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => changes.push({ fromA, toA, text: inserted.toString() }));
		if (changes.length !== ranges.length) return tr;
		const specs = [];
		for (let k = 0; k < ranges.length; k++) {
			const r = ranges[k], c = changes[k];
			if (c.fromA !== r.from || c.toA !== r.to || [...c.text].length !== 1) return tr;
			const w = wrapSpec(start.doc, r.from, r.to, c.text);
			if (!w) return tr;
			specs.push({ w, backward: r.anchor > r.head });
		}
		// 算出包裹后每个选区的新位置（前面的包裹会让后面的位置往后挪）
		let shift = 0;
		const sel = specs.map(({ w, backward }) => {
			const a = w.selFrom + shift, b = w.selTo + shift;
			shift += w.insert.length - (w.to - w.from);
			return backward ? EditorSelection.range(b, a) : EditorSelection.range(a, b);
		});
		return {
			changes: specs.map(({ w }) => ({ from: w.from, to: w.to, insert: w.insert })),
			selection: EditorSelection.create(sel),
			userEvent: "input.type",
			scrollIntoView: true,
		};
	}

	// 输入法组字上屏的字符：组字结束后再看一次，选中的文字被换成了一个成对符号就改回包裹
	wrapAfterCompose(view) {
		const before = this.beforeCompose.get(view);
		this.beforeCompose.delete(view);
		if (!before) return;
		const r = before.selection.main;
		if (before.selection.ranges.length !== 1 || r.empty || this.isBlockSelection(before)) return;
		const oldDoc = before.doc, doc = view.state.doc;
		if (doc.length !== oldDoc.length - (r.to - r.from) + 1) return;
		if (doc.sliceString(0, r.from) !== oldDoc.sliceString(0, r.from)) return;
		if (doc.sliceString(r.from + 1) !== oldDoc.sliceString(r.to)) return;
		const w = wrapSpec(oldDoc, r.from, r.to, doc.sliceString(r.from, r.from + 1));
		if (!w) return;
		const removed = r.to - r.from - 1;    // 现在文档比原文档少的长度
		view.dispatch({
			changes: { from: w.from, to: w.to - removed, insert: w.insert },
			selection: r.anchor > r.head ? EditorSelection.single(w.selTo, w.selFrom) : EditorSelection.single(w.selFrom, w.selTo),
			userEvent: "input.type",
			scrollIntoView: true,
		});
	}
};
