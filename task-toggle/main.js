// 任务状态快切：⌘/ 直接在编辑器里改这一行（一次编辑事务，⌘Z 一步撤销），不经过「写文件 → 等编辑器重载」，所以能连按
// 循环和 Bike 的 ⌘/ 宏一致：无 → TODO → DOING HH:MM → DONE HH:MM-HH:MM → 无
//   · DOING 记下开始时间，DONE 自动写成「开始-现在」的时间段 —— 长期项目看板、螺旋日程都能按这个算真实用时
//   · 复选框条目：[ ] ↔ [x]
//   · 标题、表格、代码块、分隔线、frontmatter 里不动；选中多行 = 每行各切一次
const { Plugin } = require("obsidian");

const KW = /^(TODO|DOING|DONE|LATER|NOW|WAITING|WAIT|IN-PROGRESS|CANCELED|CANCELLED|FAILED|SUSPENDED)(?=\s|$)\s*/;
const HM = "(\\d{1,2}[:：]\\d{2})";
const pad = (n) => String(n).padStart(2, "0");
const now = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

function nextLine(line) {
  const m = line.match(/^(\s*(?:[-*+]|\d+[.)])\s+|\s*)(.*)$/);
  let [, prefix, rest] = m;
  // 复选框
  const cb = rest.match(/^\[(.)\]\s*/);
  if (cb) return prefix + (cb[1] === " " ? "[x] " : "[ ] ") + rest.slice(cb[0].length);
  // 前面的 **07:37** 记录点留在原位
  const st = rest.match(/^\*\*\d{1,2}[:：]\d{2}\*\*\s*/);
  if (st) { prefix += st[0]; rest = rest.slice(st[0].length); }
  const k = rest.match(KW);
  if (!k) return prefix + "TODO " + rest;
  const kw = k[1], body = rest.slice(k[0].length);
  if (kw === "TODO" || kw === "LATER") return prefix + `DOING ${now()} ` + body;
  if (kw === "DOING" || kw === "NOW" || kw === "IN-PROGRESS") {
    const t = body.match(new RegExp("^" + HM + "\\s*"));
    return prefix + (t ? `DONE ${t[1].replace("：", ":")}-${now()} ` + body.slice(t[0].length) : `DONE ${now()} ` + body);
  }
  if (kw === "DONE") {
    // 去掉关键字和紧跟的时间 / 时间段
    return prefix + body.replace(new RegExp("^" + HM + "(?:\\s*[-–~～]\\s*" + HM + ")?\\s*"), "");
  }
  return prefix + "TODO " + body;   // WAITING / CANCELED 等 → 重新开始
}

function skippable(editor, n) {
  const line = editor.getLine(n);
  if (/^\s*(#{1,6}\s|\||```|~~~|\$\$|<)/.test(line)) return true;
  if (/^\s*([-*+]\s+)?(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) return true;
  if (editor.getLine(0) === "---") {
    for (let k = 1; k < editor.lineCount(); k++) if (editor.getLine(k) === "---") return n <= k;
  }
  // 在代码块里
  let inCode = false;
  for (let k = 0; k < n; k++) if (/^\s*(```|~~~)/.test(editor.getLine(k))) inCode = !inCode;
  return inCode;
}

module.exports = class TaskToggle extends Plugin {
  onload() {
    this.addCommand({
      id: "toggle",
      name: "切换任务状态（无 → TODO → DOING → DONE → 无）",
      hotkeys: [{ modifiers: ["Mod"], key: "/" }],
      editorCallback: (editor) => this.toggle(editor),
    });
  }
  toggle(editor) {
    const lines = new Set();
    for (const s of editor.listSelections()) {
      const a = Math.min(s.anchor.line, s.head.line), b = Math.max(s.anchor.line, s.head.line);
      for (let n = a; n <= b; n++) lines.add(n);
    }
    const changes = [], delta = new Map();
    for (const n of lines) {
      if (skippable(editor, n)) continue;
      const old = editor.getLine(n);
      if (!old.trim()) { changes.push({ from: { line: n, ch: 0 }, to: { line: n, ch: old.length }, text: old + "TODO " }); delta.set(n, 5); continue; }
      const nw = nextLine(old);
      if (nw === old) continue;
      changes.push({ from: { line: n, ch: 0 }, to: { line: n, ch: old.length }, text: nw });
      delta.set(n, nw.length - old.length);
    }
    if (!changes.length) return;
    // 光标跟着这一行的长度变化挪，停在原来那个字后面
    const sels = editor.listSelections().map((s) => {
      const fix = (p) => ({ line: p.line, ch: Math.max(0, p.ch + (delta.get(p.line) || 0)) });
      return { anchor: fix(s.anchor), head: fix(s.head) };
    });
    editor.transaction({ changes, selections: sels.map((s) => ({ from: s.anchor, to: s.head })) });
  }
};
