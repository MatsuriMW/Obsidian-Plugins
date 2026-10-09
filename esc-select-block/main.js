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
//     挪完仍然是整块选中（按块首行的内容重新找到它）
//   · 删除（⌫ / ⌦ / ⌘X）也不退出：删掉这一块后，选中补上来的下一块；它是这一串里最后一块时，选中上一块
//   · 只有打字、粘贴会替换掉这一块并退出
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
//   · 包好之后按 Enter = 确认：光标跳到右半边符号后面接着写，不换行
//     （在列表项里也一样：Enter 在 keydown 里抢在 Bullet 等插件的 Enter 前面处理）
//
// 三、⌘K 插分割线（命令，可在设置里改键）
//   · 光标在哪一层的子块、块里哪个位置都行：在当前这一块（连同它的子项）下面，顶格插一行「- ---」
//   · 块后面紧跟着单独一行的块 id（^q-xxxx，Flashcards 写的）算这一块的，插在它后面
//   · 不在列表里：插在当前段落下面；下面紧挨着已经是分割线就不重复插
//     （只要选中的文字正好被一对符号包着就算，也包括 Obsidian 自己包的 ** == ~~ 等）
//
// 四、仿 Bike：go to ancestor / Group rows（命令，可在设置里改键；键位沿用 Keyboard Maestro 里给 Bike 配的）
//   · ⌘⌥↑ 跳到母块：光标所在列表项的上一级（往上找第一个缩进更浅的列表项）。连按一层层往上，到顶格提示「已经是顶层」
//   · ⌘⌥⇧↑ 直接跳到最上一级的顶格母块
//     编辑状态下：选中母块那一行的文字（不含缩进、列表符号、复选框、行尾 ^块ID）
//     Esc 整块选中状态下：改成整块选中母块，还在选中状态里，接着 ↑↓ / ⌘⌥↑ 都行
//   · ⌘⌥↓ Group rows：选中的几行 / 几块（Esc 选中的整块也算；没选就是当前这一块）连同各自的子项一起降一级，
//     上面插一个空的母块（和原来最浅的那一层同级），光标停在母块里等输入
//
// 五、块类型转换（命令面板里搜「块转换」，可在设置里改键）
//   · ⌘\ 循环切换：无序列表 → 有序列表（1. 2. 3.）→ 普通段落 → 无序列表。看第一块现在是什么：
//     无序 → 改有序；有序（含论文式 4.1、a. b. c.）→ 改段落；段落 → 改无序。每一步的规则和下面对应的单独命令一样，
//     只多一条：光标在一块有序列表项上改段落时，下面紧挨着的有序同级块一起改（和改有序时对称，超过 5 块先问）；
//     段落改无序只改光标所在这一段（要改几段就先选中）
//   · 下面五个单独的命令默认不占快捷键
//   · 对象：Esc 选中的整块 / 选区碰到的块 / 光标所在的块。列表项只改它自己那一行的符号，子项不动；
//     选区跨了几层时，按最浅的那一层算（深层的归到它在这一层的母块）
//   · 改为无序列表「- 」
//   · 改为有序列表，三种编号：
//       1. 2. 3.：真正的 Markdown 有序列表。编号和 Bullet 的自动重排规则一致（数同一个母块下排在前面的有序项），
//         后面已经是有序的同级块跟着重排，Bullet 下次重排不会跳号
//       论文式 4.1 4.2：Markdown 没有这种列表，写成「- 4.1 文字」（还是列表块，Esc / Bullet 照常用）。
//         前缀依次看：上一个同级块的编号（接着编）→ 这一块自己原来的编号 → 母块的编号（母块是 4. 或 4.1 → 4.1 / 4.1.1）
//         → 都没有就弹框问，默认填上面最近的带编号标题（## 4 方法 → 4）
//       a. b. c.：同样写成「- a. 文字」，上一个同级块是字母编号就接着编
//     只改了一块时，它下面的同级块一起改（同一个母块下、紧挨着的；普通段落就是下面接着的段落，碰到标题、代码块、分割线停）：
//     不超过 5 块直接改，超过 5 块弹框问：全部 / 只带 5 块 / 只改这一块
//     后面紧跟着的、已经是同一种编号的同级块也跟着重排（所以对编号乱了的列表再执行一次就是重新编号）
//     原来的 4.1 / a. 编号会换掉（一组里每块都有同一种编号，或者单独一块但相邻同级块也是这种编号，才认为是编号，避免误删「3.5 小时」这种正文）
//   · 改为普通段落：顶格的块变成顶格段落（和上一行之间空一行，免得并进上面的列表），子块升一级，变成段落下面的列表；
//     子块变成母块里的一段文字（去掉列表符号、保留缩进），它自己的子块升一级。1. 编号去掉，4.1 / a. 留在文字里
//   · 普通段落改成列表：一段（连续的几行）= 一块，第二行起缩进成续行；连着改几段时，段落之间的空行去掉，成为同一个列表
//   · 转换完 Esc 选中状态还在（改成段落的除外），一次撤销全部撤回
const { Plugin, Notice, Modal } = require("obsidian");
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

// 包裹后按 Enter 要认的成对符号：长的排前面（[[ 先于 [，** 先于 *）
const WRAPS = [["[[", "]]"], ["**", "**"], ["==", "=="], ["~~", "~~"], ["__", "__"], ["$$", "$$"], ["%%", "%%"],
	["*", "*"], ["_", "_"], ["$", "$"], ...Object.entries(PAIRS)];
// 选区 from..to 正好被一对符号包着：返回右半边符号结束的位置，否则 -1
function wrappedEnd(doc, from, to) {
	for (const [o, c] of WRAPS)
		if (from >= o.length && doc.sliceString(from - o.length, from) === o && doc.sliceString(to, to + c.length) === c) return to + c.length;
	return -1;
}

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

// 列表项 item 的母块：往上找第一个缩进更浅的非空行，是列表项就是它；碰到缩进更浅的普通段落 / 标题 = 没有母块，返回 -1
function parentItem(getLine, item) {
	const w = indentWidth(getLine(item));
	if (w === 0) return -1;
	for (let i = item - 1; i >= 0; i--) {
		const l = getLine(i);
		if (isBlank(l) || indentWidth(l) >= w) continue;
		return isItem(l) ? i : -1;
	}
	return -1;
}

// 列表项那一行去掉缩进、列表符号、复选框之后，文字从第几列开始、到第几列结束（不含行尾 ^块ID）
function contentSpan(line) {
	const m = line.match(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]*(?:\[.\][ \t]+)?/);
	const from = m ? m[0].length : 0;
	return { from, to: Math.max(from, line.replace(/\s+\^[\w-]+\s*$/, "").replace(/\s+$/, "").length) };
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

// ---------- 块类型转换用到的 ----------

// 列表项那一行拆开：缩进、符号、复选框（带后面的空格）、正文；prefixLen = 正文之前的长度
function parseItem(line) {
	const m = line.match(/^([ \t]*)([-*+]|\d+[.)])(?:[ \t]+(\[.\][ \t]+)?|$)/);
	return { indent: m[1], marker: m[2], box: m[3] ? m[3].trimEnd() + " " : "", text: line.slice(m[0].length), prefixLen: m[0].length };
}
const isOrderedMarker = (mk) => /^\d+[.)]$/.test(mk);
const isDivider = (line) => /^(?:-{3,}|\*{3,}|_{3,})$/.test(keyOf(line));
const isBlockId = (line) => /^\s*\^[\w-]+\s*$/.test(line);

// 正文开头的论文式 / 字母编号：{ kind: "paper", parts: [4, 1], len } / { kind: "letter", index: 1, len }，没有返回 null
function labelOf(text) {
	let m = text.match(/^(\d+(?:\.\d+)+)\.?[ \t]+/);
	if (m) return { kind: "paper", parts: m[1].split(".").map(Number), len: m[0].length };
	m = text.match(/^([a-z]{1,2})[.)][ \t]+/);
	if (m) return { kind: "letter", index: letterIndex(m[1]), len: m[0].length };
	return null;
}
// 1 → a，26 → z，27 → aa
function letterOf(k) {
	let s = "";
	for (; k > 0; k = Math.floor((k - 1) / 26)) s = String.fromCharCode(97 + ((k - 1) % 26)) + s;
	return s;
}
function letterIndex(s) {
	let k = 0;
	for (const c of s) k = k * 26 + (c.charCodeAt(0) - 96);
	return k;
}

// 每行是不是在 front matter / 代码块里（这些行不算段落）
function fencedLines(getLine, n) {
	const mask = new Array(n).fill(false);
	let i = 0;
	if (n && getLine(0) === "---") {
		mask[0] = true;
		for (i = 1; i < n && !/^(---|\.\.\.)\s*$/.test(getLine(i)); i++) mask[i] = true;
		if (i < n) mask[i++] = true;
	}
	let fence = null;
	for (; i < n; i++) {
		const m = getLine(i).match(/^[ \t]*(`{3,}|~{3,})/);
		if (fence) {
			mask[i] = true;
			if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
		} else if (m) { fence = m[1]; mask[i] = true; }
	}
	return mask;
}

// 顶格的普通段落行（不是列表、标题、引用、表格、分割线、块 id、代码块）
function isParaLine(ctx, i) {
	const l = ctx.getLine(i);
	return !isBlank(l) && indentWidth(l) === 0 && !isItem(l) && !ctx.fenced[i] && !isBlockId(l)
		&& !/^(#{1,6}([ \t]|$)|>|\||\$\$|%%|<)/.test(l) && !/^([-*_])([ \t]*\1){2,}[ \t]*$/.test(l);
}
function paraAt(ctx, i) {
	let start = i, end = i;
	while (start > 0 && isParaLine(ctx, start - 1)) start--;
	while (end + 1 < ctx.n && isParaLine(ctx, end + 1)) end++;
	return { kind: "para", start, end };
}
const itemUnit = (line) => ({ kind: "item", line });
const unitLine = (u) => (u.kind === "item" ? u.line : u.start);

// fromLine..toLine 碰到的块：列表项按最浅的一层算（深层的归到它在这一层的母块），段落一段一块
function collectUnits(ctx, fromLine, toLine) {
	const { getLine } = ctx, items = [], units = [];
	for (let i = fromLine; i <= toLine; i++) {
		if (isBlank(getLine(i))) continue;
		const it = itemLineFor(getLine, i);
		if (it >= 0) { if (it === i || i === fromLine) items.push(it); continue; }
		if (isParaLine(ctx, i)) { const p = paraAt(ctx, i); units.push(p); i = p.end; }
	}
	if (items.length) {
		const minW = Math.min(...items.map((l) => indentWidth(getLine(l))));
		const seen = new Set();
		for (let l of items) {
			for (let p; indentWidth(getLine(l)) > minW && (p = parentItem(getLine, l)) >= 0; ) l = p;
			if (!seen.has(l) && indentWidth(getLine(l)) === minW) { seen.add(l); units.push(itemUnit(l)); }
		}
	}
	return units.sort((a, b) => unitLine(a) - unitLine(b));
}

// 下面紧挨着的同级块（同一个母块下的列表项 / 接着的段落）；没有返回 null
function nextSibling(ctx, u) {
	const { getLine, n } = ctx;
	let i = (u.kind === "item" ? subtreeEnd(getLine, n, u.line) : u.end) + 1;
	while (i < n && (isBlank(getLine(i)) || (u.kind === "item" && isBlockId(getLine(i))))) i++;
	if (i >= n) return null;
	if (u.kind === "para") return isParaLine(ctx, i) ? paraAt(ctx, i) : null;
	const l = getLine(i);
	return isItem(l) && indentWidth(l) === indentWidth(getLine(u.line)) && !isDivider(l) ? itemUnit(i) : null;
}
// 上面紧挨着的同级块
function prevSibling(ctx, u) {
	const { getLine } = ctx;
	if (u.kind === "para") {
		let i = u.start - 1;
		while (i >= 0 && isBlank(getLine(i))) i--;
		return i >= 0 && isParaLine(ctx, i) ? paraAt(ctx, i) : null;
	}
	const W = indentWidth(getLine(u.line));
	for (let i = u.line - 1; i >= 0; i--) {
		const l = getLine(i);
		if (isBlank(l) || isBlockId(l)) continue;
		const w = indentWidth(l);
		if (w < W || (w === 0 && !isItem(l))) return null;
		if (w === W && isItem(l)) return isDivider(l) ? null : itemUnit(i);
	}
	return null;
}
// 块的正文（列表项去掉符号和复选框，段落取第一行）
const unitText = (ctx, u) => (u.kind === "item" ? parseItem(ctx.getLine(u.line)).text : ctx.getLine(u.start));

// 弹框选一项，取消返回 null
function ask(app, title, desc, options) {
	return new Promise((resolve) => {
		const m = new Modal(app);
		let done = false;
		m.titleEl.setText(title);
		if (desc) m.contentEl.createEl("p", { text: desc });
		const row = m.contentEl.createDiv({ cls: "modal-button-container" });
		options.forEach((o, i) => {
			const b = row.createEl("button", { text: o.label, cls: i === 0 ? "mod-cta" : "" });
			b.onclick = () => { done = true; m.close(); resolve(o.value); };
		});
		m.onClose = () => { if (!done) resolve(null); };
		m.open();
		setTimeout(() => row.querySelector("button")?.focus(), 0);
	});
}
// 弹框输入一行字，取消返回 null
function promptText(app, title, desc, value) {
	return new Promise((resolve) => {
		const m = new Modal(app);
		let done = false;
		m.titleEl.setText(title);
		if (desc) m.contentEl.createEl("p", { text: desc });
		const input = m.contentEl.createEl("input", { type: "text", value });
		input.style.width = "100%";
		const submit = () => { done = true; m.close(); resolve(input.value.trim()); };
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); submit(); }
		});
		const row = m.contentEl.createDiv({ cls: "modal-button-container" });
		row.createEl("button", { text: "确定", cls: "mod-cta" }).onclick = submit;
		row.createEl("button", { text: "取消" }).onclick = () => m.close();
		m.onClose = () => { if (!done) resolve(null); };
		m.open();
		setTimeout(() => { input.focus(); input.select(); }, 0);
	});
}

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
		this.addCommand({
			id: "insert-divider-below",
			name: "在当前块下面顶格插入分割线",
			hotkeys: [{ modifiers: ["Mod"], key: "k" }],
			editorCallback: (editor) => this.insertDivider(editor),
		});
		this.addCommand({
			id: "go-to-ancestor",
			name: "跳到母块（go to ancestor，连按一层层往上）",
			hotkeys: [{ modifiers: ["Mod", "Alt"], key: "ArrowUp" }],
			editorCallback: (editor) => editor.cm && this.goToAncestor(editor.cm, false),
		});
		this.addCommand({
			id: "go-to-top-ancestor",
			name: "跳到最上一级的顶格母块",
			hotkeys: [{ modifiers: ["Mod", "Alt", "Shift"], key: "ArrowUp" }],
			editorCallback: (editor) => editor.cm && this.goToAncestor(editor.cm, true),
		});
		this.addCommand({
			id: "group-rows",
			name: "Group rows：选中的几块一起降一级，上面插一个空母块",
			hotkeys: [{ modifiers: ["Mod", "Alt"], key: "ArrowDown" }],
			editorCallback: (editor) => editor.cm && this.groupRows(editor.cm),
		});
		this.addCommand({
			id: "convert-cycle",
			name: "块转换：循环切换（无序列表 → 有序列表 → 普通段落）",
			hotkeys: [{ modifiers: ["Mod"], key: "\\" }],
			editorCallback: (editor) => editor.cm && this.convertBlocks(editor.cm, "cycle"),
		});
		for (const [style, name] of [
			["bullet", "改为无序列表"],
			["num", "改为有序列表（1. 2. 3.）"],
			["paper", "改为有序列表（论文式 4.1 4.2 4.3）"],
			["letter", "改为有序列表（a. b. c.）"],
			["para", "改为普通段落"],
		]) {
			this.addCommand({
				id: `convert-${style}`,
				name: `块转换：${name}`,
				editorCallback: (editor) => editor.cm && this.convertBlocks(editor.cm, style),
			});
		}
		this.registerEditorExtension([
			blockField,
			Prec.highest(keymap.of([
				{ key: "Escape", run: (view) => this.onEsc(view) },
				{ key: "ArrowUp", run: (view) => this.move(view, -1, false) },
				{ key: "ArrowDown", run: (view) => this.move(view, 1, false) },
				{ key: "Shift-ArrowUp", run: (view) => this.move(view, -1, true) },
				{ key: "Shift-ArrowDown", run: (view) => this.move(view, 1, true) },
			])),
			// Enter 不走 keymap：Bullet 也在最高优先级挂了 Enter，又比本插件先加载，
			// 光标在列表项里时它先把选中的文字换成新的一条，轮不到这里确认包裹。
			// keymap 整体是在默认优先级的 keydown 里跑的，最高优先级的 keydown 能排在所有 keymap 前面
			Prec.highest(EditorView.domEventHandlers({
				keydown: (e, view) => {
					if (e.key !== "Enter" || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return false;
					if (e.isComposing || e.keyCode === 229 || view.composing) return false;
					if (!this.edit(view)) return false;
					e.preventDefault();
					return true;
				},
			})),
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
	// 删除：选中补上来的那一块。打字、粘贴、拖放、补全 = 这一块被替换掉了，退出
	keepBlock(tr) {
		if (!tr.docChanged || tr.effects.some((e) => e.is(setBlock))) return tr;
		const val = this.activeIn(tr.startState);
		if (!val) return tr;
		if (["input.type", "input.paste", "input.drop", "input.complete"].some((u) => tr.isUserEvent(u))) return tr;
		const doc = tr.newDoc, getLine = (i) => doc.line(i + 1).text;
		const old = rangeOf(tr.startState.doc, val.start, val.end);
		if (tr.isUserEvent("delete")) return this.afterDelete(tr, val, old);
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

	// 整块删掉之后：原来位置上现在是列表项（下一块补上来了）就选它，否则选上面最近的一块，再没有就往下找；都没有才退出
	afterDelete(tr, val, old) {
		const doc = tr.newDoc, getLine = (i) => doc.line(i + 1).text;
		const line = doc.lineAt(Math.min(tr.changes.mapPos(old.from, 1), doc.length)).number - 1;
		let it = isItem(getLine(line)) ? line : prevItem(getLine, line + 1);
		if (it < 0) it = nextItemAfter(getLine, doc.lines, line);
		if (it < 0) return tr;
		const end = subtreeEnd(getLine, doc.lines, it);
		return [tr, {
			selection: blockSelection(doc, it, end),
			effects: setBlock.of({ ...val, start: it, end, multi: false, key: keyOf(getLine(it)), moved: true }),
			sequential: true, scrollIntoView: true,
		}];
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

	// Enter：回到编辑，光标放在当前块首行末尾；或者，选中的文字刚被成对符号包好时，光标跳到右半边后面（确认包裹，不换行）
	edit(view) {
		const s = this.active(view);
		if (!s) return this.confirmWrap(view);
		view.dispatch({ selection: EditorSelection.cursor(view.state.doc.line(s.start + 1).to), effects: setBlock.of(null) });
		return true;
	}

	// ---------- 仿 Bike：go to ancestor / Group rows ----------

	goToAncestor(view, top) {
		const doc = view.state.doc, getLine = (i) => doc.line(i + 1).text;
		const s = this.active(view);
		const from = s ? s.start : itemLineFor(getLine, doc.lineAt(view.state.selection.main.head).number - 1);
		if (from < 0) { new Notice("不在列表里"); return; }
		let target = parentItem(getLine, from);
		if (target < 0) { new Notice("已经是顶层"); return; }
		if (top) for (let p = parentItem(getLine, target); p >= 0; p = parentItem(getLine, p)) target = p;
		if (s) {
			this.selectLines(view, target, subtreeEnd(getLine, doc.lines, target), { anchor: s.anchor, head: s.head, moved: true });
			return;
		}
		const line = doc.line(target + 1), span = contentSpan(line.text);
		view.dispatch({
			selection: EditorSelection.single(line.from + span.from, line.from + span.to),
			effects: EditorView.scrollIntoView(line.from, { y: "nearest", yMargin: 60 }),
		});
		view.focus();
	}

	groupRows(view) {
		const { state } = view, doc = state.doc, getLine = (i) => doc.line(i + 1).text;
		let b = this.active(view);
		if (!b) {
			const sel = state.selection.main;
			const fromLine = doc.lineAt(sel.from).number - 1;
			let toLine = doc.lineAt(sel.to).number - 1;
			if (toLine > fromLine && sel.to === doc.line(toLine + 1).from) toLine--;   // 整行选区的末尾落在下一行开头
			b = blockLines(getLine, doc.lines, fromLine, toLine);
		}
		if (!b) { new Notice("不在列表里"); return; }
		const lines = [];
		for (let i = b.start; i <= b.end; i++) lines.push(getLine(i));
		// 新母块和选中范围里最浅的那一层同级
		let base = null;
		for (const l of lines) if (!isBlank(l) && (base === null || indentWidth(l) < indentWidth(base))) base = l;
		const baseIndent = base.match(/^[ \t]*/)[0];
		const unit = this.app.vault.getConfig("useTab") === false ? " ".repeat(this.app.vault.getConfig("tabSize") || 4) : "\t";
		const head = `${baseIndent}- `;
		const body = lines.map((l) => (isBlank(l) ? l : unit + l)).join("\n");
		const from = doc.line(b.start + 1).from, to = doc.line(b.end + 1).to;
		view.dispatch({
			changes: { from, to, insert: `${head}\n${body}` },
			selection: EditorSelection.cursor(from + head.length),
			effects: [setBlock.of(null), EditorView.scrollIntoView(from, { y: "nearest", yMargin: 60 })],
		});
		view.focus();
	}

	// ---------- 块类型转换 ----------

	// style：bullet 无序 / num 1. 2. 3. / paper 论文式 4.1 / letter a. b. c. / para 普通段落 / cycle 按第一块现在的类型换到下一种
	async convertBlocks(view, style) {
		const { state } = view, doc = state.doc;
		const getLine = (i) => doc.line(i + 1).text, n = doc.lines;
		const ctx = { getLine, n, fenced: fencedLines(getLine, n) };
		const s = this.active(view);
		let fromLine, toLine;
		if (s) ({ start: fromLine, end: toLine } = s);
		else {
			const sel = state.selection.main;
			fromLine = doc.lineAt(sel.from).number - 1;
			toLine = doc.lineAt(sel.to).number - 1;
			if (toLine > fromLine && sel.to === doc.line(toLine + 1).from) toLine--;   // 整行选区的末尾落在下一行开头
		}
		let units = collectUnits(ctx, fromLine, toLine);
		if (!units.length) { new Notice("这里没有能转换的块（标题、代码块、表格不改）"); return; }
		// 有序列表项：1. 编号，或者正文开头是 4.1 / a. 编号
		const isOrderedUnit = (u) => u.kind === "item" && (isOrderedMarker(parseItem(getLine(u.line)).marker) || !!labelOf(unitText(ctx, u)));
		const cycling = style === "cycle";
		if (cycling) style = units[0].kind === "para" ? "bullet" : isOrderedUnit(units[0]) ? "para" : "num";

		const toList = style !== "para", ordered = toList && style !== "bullet";
		// 只改一块、改成有序列表：下面的同级块一起改，超过 5 块先问
		// ⌘\ 循环里有序列表项改段落也一样，带上下面紧挨着的有序同级块（和改有序时对称，不然一组编号只拆掉第一块）
		const backToPara = cycling && style === "para";
		if ((ordered || backToPara) && units.length === 1) {
			const sibs = [];
			for (let u = nextSibling(ctx, units[0]); u && (!backToPara || isOrderedUnit(u)); u = nextSibling(ctx, u)) sibs.push(u);
			let take = sibs.length;
			if (take > 5) {
				take = await ask(this.app, `下面的同级块也一起改成${ordered ? "有序列表" : "普通段落"}？`, `这一块下面还有 ${sibs.length} 个同级块。`, [
					{ label: `全部一起改（共 ${sibs.length + 1} 块）`, value: sibs.length },
					{ label: "只带下面 5 块", value: 5 },
					{ label: "只改这一块", value: 0 },
				]);
				if (take === null) return;
			}
			units = units.concat(sibs.slice(0, take));
		}

		// 按母块分组（段落改成列表后是顶格的，和顶格列表项同组），每组各自编号
		const groups = new Map();
		for (const u of units) {
			const key = u.kind === "item" ? parentItem(getLine, u.line) : -1;
			if (!groups.has(key)) groups.set(key, []);
			groups.get(key).push(u);
		}
		const tabSize = this.app.vault.getConfig("tabSize") || 4;
		const unitIndent = this.app.vault.getConfig("useTab") === false ? " ".repeat(tabSize) : "\t";
		// 列表符号 + 编号里插上复选框：「- 4.1 」+「[ ] 」→「- [ ] 4.1 」，「3. 」→「3. [ ] 」
		const withBox = (mk, box) => (mk.startsWith("- ") ? "- " + box + mk.slice(2) : mk + box);
		const lineFrom = (i) => doc.line(i + 1).from;
		const changes = [];

		for (const [parent, group] of groups) {
			// 编号：markerAt(k) 是第 k 块（从 0 起）的列表符号 + 编号，含后面的空格
			let markerAt = () => "- ";
			let restyle = null;   // 后面紧跟着的同一种编号的同级块：返回它的新符号，不是这种编号返回 null
			if (style === "num") {
				let start = 1;
				for (let p = prevSibling(ctx, group[0]); p; p = prevSibling(ctx, p))
					if (p.kind === "item" && isOrderedMarker(parseItem(getLine(p.line)).marker)) start++;
				markerAt = (k) => `${start + k}. `;
				restyle = (u, k) => (isOrderedMarker(parseItem(getLine(u.line)).marker) ? markerAt(k) : undefined);
			} else if (style === "paper" || style === "letter") {
				const plan = style === "paper" ? await this.paperPlan(ctx, group, parent) : this.letterPlan(ctx, group);
				if (!plan) return;
				markerAt = plan.markerAt;
				restyle = (u, k) => {
					const lb = labelOf(unitText(ctx, u));
					return lb && lb.kind === plan.kind && (style !== "paper" || lb.parts.slice(0, -1).join(".") === plan.prefix) ? markerAt(k) : null;
				};
			}

			// 原来的 4.1 / a. 编号算不算编号（改成列表时换掉）：组里还有别的块、或者相邻的同级块也是这种编号才算
			const kindOf = (u) => labelOf(unitText(ctx, u))?.kind;
			const kindCount = {};
			for (const u of group) { const kd = kindOf(u); if (kd) kindCount[kd] = (kindCount[kd] || 0) + 1; }
			const isLabel = (u) => {
				const kd = toList && kindOf(u);
				return !!kd && (kindCount[kd] > 1 || [prevSibling(ctx, u), nextSibling(ctx, u)].some((v) => v && kindOf(v) === kd));
			};

			group.forEach((u, k) => {
				const cut = isLabel(u) ? labelOf(unitText(ctx, u)).len : 0;
				if (u.kind === "item") {
					const line = u.line, p = parseItem(getLine(line)), from = lineFrom(line) + p.indent.length;
					if (toList) {
						changes.push({ from, to: lineFrom(line) + p.prefixLen + cut, insert: withBox(markerAt(k), p.box) });
						return;
					}
					// 改成段落：去掉符号和复选框；顶格的和上一行之间空一行；子块升一级
					const top = p.indent === "" && line > 0 && !isBlank(getLine(line - 1)) && !/^#{1,6}[ \t]/.test(getLine(line - 1));
					changes.push({ from, to: lineFrom(line) + p.prefixLen, insert: top ? "\n" : "" });
					const W = indentWidth(getLine(line)), end = subtreeEnd(getLine, n, line);
					for (let i = line + 1; i <= end; i++) {
						const l = getLine(i);
						if (isBlank(l) || indentWidth(l) <= W) continue;
						const d = l[p.indent.length] === "\t" ? 1 : Math.min(tabSize, l.slice(p.indent.length).match(/^ */)[0].length);
						if (d) changes.push({ from: lineFrom(i) + p.indent.length, to: lineFrom(i) + p.indent.length + d });
					}
					return;
				}
				// 段落改成列表：一段一块，第二行起缩进成续行；和上一个改成列表的段落之间的空行去掉
				if (!toList) return;
				changes.push({ from: lineFrom(u.start), to: lineFrom(u.start) + cut, insert: markerAt(k) });
				for (let i = u.start + 1; i <= u.end; i++) changes.push({ from: lineFrom(i), insert: unitIndent });
				const prev = units[units.indexOf(u) - 1];
				if (prev && prev.kind === "para" && u.start > prev.end + 1)
					changes.push({ from: doc.line(prev.end + 1).to, to: doc.line(u.start).to });
			});

			// 后面紧跟着的、已经是这种编号的同级块跟着重排（1. 2. 3. 跳过中间的无序项接着数，和 Bullet 一样）
			if (restyle) {
				let k = group.length;
				for (let u = nextSibling(ctx, group[group.length - 1]); u && u.kind === "item"; u = nextSibling(ctx, u)) {
					const mk = restyle(u, k);
					if (mk === null) break;
					if (mk === undefined) continue;
					const p = parseItem(getLine(u.line)), lb = style === "num" ? null : labelOf(p.text);
					const from = lineFrom(u.line) + p.indent.length;
					changes.push({ from, to: lineFrom(u.line) + p.prefixLen + (lb ? lb.len : 0), insert: withBox(mk, p.box) });
					k++;
				}
			}
		}

		if (view.state.doc !== doc) return;   // 弹框期间文档变了
		const cs = state.changes(changes.filter((c) => c.insert || (c.to ?? c.from) > c.from));
		const newDoc = cs.apply(doc);
		if (cs.empty || newDoc.eq(doc)) { new Notice("已经是这种格式了"); return; }
		const spec = { changes: cs, scrollIntoView: true, userEvent: "input.convert" };
		if (s && toList) {
			// 还是整块选中：按原来选中的范围在新文档里重新选
			const nl = (i) => newDoc.line(i + 1).text;
			const old = rangeOf(doc, s.start, s.end);
			const start = itemLineFor(nl, newDoc.lineAt(cs.mapPos(old.from, 1)).number - 1);
			const endLine = newDoc.lineAt(Math.max(0, cs.mapPos(old.to, -1) - 1)).number - 1;
			if (start >= 0) {
				const end = Math.max(subtreeEnd(nl, newDoc.lines, start), endLine);
				spec.selection = blockSelection(newDoc, start, end);
				spec.effects = setBlock.of({ ...s, start, end, multi: end > subtreeEnd(nl, newDoc.lines, start), key: keyOf(nl(start)), moved: true });
			}
		} else if (s) {
			spec.selection = EditorSelection.cursor(newDoc.line(newDoc.lineAt(cs.mapPos(rangeOf(doc, s.start, s.end).from, 1)).number).to);
			spec.effects = setBlock.of(null);
		} else {
			spec.selection = EditorSelection.create(state.selection.ranges.map((r) => EditorSelection.range(cs.mapPos(r.anchor, 1), cs.mapPos(r.head, 1))), state.selection.mainIndex);
		}
		view.dispatch(spec);
		view.focus();
	}

	// 论文式编号的前缀和起始号：上一个同级块的编号（接着编）→ 第一块自己原来的编号 → 母块的编号 → 问（默认取上面最近的带编号标题）
	async paperPlan(ctx, group, parent) {
		const { getLine } = ctx, plan = (prefix, start) => ({ kind: "paper", prefix, markerAt: (k) => `- ${prefix}.${start + k} ` });
		const prev = prevSibling(ctx, group[0]), plb = prev && labelOf(unitText(ctx, prev));
		if (plb?.kind === "paper") return plan(plb.parts.slice(0, -1).join("."), plb.parts[plb.parts.length - 1] + 1);
		const own = labelOf(unitText(ctx, group[0]));
		if (own?.kind === "paper") return plan(own.parts.slice(0, -1).join("."), 1);
		if (parent >= 0) {
			const p = parseItem(getLine(parent)), lb = labelOf(p.text);
			if (lb?.kind === "paper") return plan(lb.parts.join("."), 1);
			if (isOrderedMarker(p.marker)) return plan(p.marker.slice(0, -1), 1);
		}
		let def = "1";
		for (let i = unitLine(group[0]) - 1; i >= 0; i--) {
			const m = getLine(i).match(/^#{1,6}[ \t]+(\d+(?:\.\d+)*)(?:[.、\s]|$)/);
			if (m) { def = m[1]; break; }
		}
		const v = await promptText(this.app, "论文式编号的前缀", `比如填 ${def} → ${def}.1、${def}.2、${def}.3`, def);
		if (v === null) return null;
		if (!/^\d+(\.\d+)*$/.test(v)) { new Notice("前缀要是数字，比如 4 或 4.2"); return null; }
		return plan(v, 1);
	}

	// 字母编号：上一个同级块是字母编号就接着编，否则从 a 开始
	letterPlan(ctx, group) {
		const prev = prevSibling(ctx, group[0]), plb = prev && labelOf(unitText(ctx, prev));
		const start = plb?.kind === "letter" ? plb.index + 1 : 1;
		return { kind: "letter", markerAt: (k) => `- ${letterOf(start + k)}. ` };
	}

	// ---------- ⌘K 分割线 ----------

	insertDivider(editor) {
		const n = editor.lineCount(), getLine = (i) => editor.getLine(i);
		const cur = editor.getCursor("head").line;
		const start = itemLineFor(getLine, cur);
		let end;
		if (start >= 0) end = subtreeEnd(getLine, n, start);
		else { end = cur; while (end + 1 < n && !isBlank(getLine(end + 1))) end++; }
		while (end + 1 < n && /^\s*\^[\w-]+\s*$/.test(getLine(end + 1))) end++;
		const next = end + 1 < n ? getLine(end + 1).trim() : "";
		if (/^([-*+]\s+)?-{3,}$/.test(next)) return;   // 下面已经是分割线
		editor.replaceRange("\n- ---", { line: end, ch: getLine(end).length });
	}

	// ---------- 成对符号包裹 ----------

	confirmWrap(view) {
		const sel = view.state.selection;
		if (sel.ranges.some((r) => r.empty)) return false;
		const ends = sel.ranges.map((r) => wrappedEnd(view.state.doc, r.from, r.to));
		if (ends.some((e) => e < 0)) return false;
		view.dispatch({ selection: EditorSelection.create(ends.map((e) => EditorSelection.cursor(e))), scrollIntoView: true, userEvent: "select" });
		return true;
	}

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
