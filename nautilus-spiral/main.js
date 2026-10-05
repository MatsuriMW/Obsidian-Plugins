const OB = require("obsidian");
const { Plugin, ItemView, PluginSettingTab, Setting, TFile, moment, debounce } = OB;
const LP_SCRIPT = "scripts/long-projects.js";   // 长期项目的数据层，和「长期项目」看板共用

const VIEW_TYPE = "nautilus-spiral";
const DEFAULTS = {
  dayStart: 7,          // 螺旋从几点开始
  dayEnd: 31,           // 螺旋和排程到几点结束，超过 24 表示次日凌晨（31 = 次日早上 7 点；个人作息夜里会一直干活）
  dayCutoff: 7,         // 日记的日期分界：凌晨几点前还算前一天
  defaultDur: 15,       // 没写时长的任务按多少分钟算
  folder: "日记",
  format: "YYYY_MM_DD",
  priorityMarkers: "[[important]], [[重要]], ⭐, ‼️",
  doneTimes: {},        // { "2026_09_29": { "任务文字": 872 } }，在 Bike 里改成 DONE 时记下的完成时间（分钟）
  autoOpened: false,
  showProjects: true,   // 底部显示「🧭 长期项目 · 该推一把」
  showAi: true,         // 显示人机协作（Claude Code 的协作时长和 token）
  workLog: {},          // { "2026_09_30": { "任务文字": [[开始, 结束 | null]] } }：任务每一段「进行中」的时间（null = 还在做），中断再续就是好几段
  dayBounds: {},        // { "2026_09_30": { start: 610, end: 1650 } }：在螺旋上拖出来的这天实际开始 / 结束时间（分钟，凌晨 > 1440）
  trackGames: true,     // 记录游戏时间（每分钟看一眼有没有在玩）
  gameProcs: "Hearthstone, steamapps/common",   // 进程路径里含这些词 = 在玩（steamapps/common 下的按游戏文件夹名记）
  gameFrontApps: "Steam",                       // 这些 App 只有在最前面时才算（Steam 客户端后台常驻，不能一开着就算）
  openTodayOnStartup: true,    // 启动 Obsidian 时打开今天的日记（按 dayCutoff 算「今天」）
  revealOnStartup: true,       // 启动时把左侧栏切到螺旋日程
};

// ---------------- 解析 ----------------

const LIST_RE = /^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/;
const STAMP_RE = /^\*\*(\d{1,2})[:：](\d{2})\*\*\s*/;           // 你习惯的 **07:37** 记录时间
const CHECKBOX_RE = /^\[([ xX\/\-])\]\s*/;
const KEYWORD_RE = /^(TODO|DOING|LATER|NOW|WAITING|WAIT|IN-PROGRESS|DONE|CANCELED|CANCELLED|FAILED)\s+/;
const TIME = String.raw`(\d{1,2})(?:[:：](\d{2})|点(?:(半)|(\d{1,2})分?)?)`;
const RANGE_RE = new RegExp(String.raw`(?<![\d:：])${TIME}\s*(?:-|–|—|~|～|到|至)\s*(?:${TIME}|(\d{1,2})(?![\d:：点]))`);
const SINGLE_RE = new RegExp(String.raw`(?<![\d:：])${TIME}(?![\d])`);
const CN_NUM = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };

function tokenMinutes(h, mm, half, cnMin) {
  const m = mm !== undefined ? +mm : half ? 30 : cnMin !== undefined ? +cnMin : 0;
  return +h * 60 + m;
}

// 凌晨的时间（比如 01:44、04:30）属于前一天的日记，算到当天夜里
function normalize(t, cfg) {
  const cutoff = Math.min(cfg.dayCutoff ?? Math.max(0, cfg.dayEnd - 24), cfg.dayStart) * 60;
  if (t < cutoff) return t + 1440;
  if (t < cfg.dayStart * 60 && t + 1440 <= cfg.dayEnd * 60) return t + 1440;
  return t;
}

function parseDuration(text) {
  let m;
  if ((m = /(\d+(?:\.\d+)?)\s*(?:h|小时)\s*(\d+)\s*(?:m|min|分钟)(?![a-zA-Z])/.exec(text))) return Math.round(+m[1] * 60 + +m[2]);
  if ((m = /(\d+(?:\.\d+)?)\s*(?:[~～\-–到至]\s*(\d+(?:\.\d+)?)\s*)?(hrs|hr|h|个小时|小时|mins|min|m|分钟)(?![a-zA-Z])/.exec(text))) {
    const v = m[2] ? +m[2] : +m[1];                   // 写成 25～30 分钟的按上限算
    return Math.round(/h|小时/.test(m[3]) ? v * 60 : v);
  }
  if (/半个?小时/.test(text)) return 30;
  if ((m = /([一两二三四五六])个?(半)?小时/.exec(text))) return CN_NUM[m[1]] * 60 + (m[2] ? 30 : 0);
  return null;
}

// 进度：单独写的「40%」「1/3」（分母不超过 10，免得把 9/30 这种日期当进度）「三分之一」「一半」
const PROG_END = String.raw`(?=$|[\s，,。；;)）])`;
const PROG_PCT_RE = new RegExp(String.raw`(?:^|\s)(\d{1,3})\s*[%％]` + PROG_END);
const PROG_FRAC_RE = new RegExp(String.raw`(?:^|\s)(\d{1,2})\s*\/\s*(\d{1,2})` + PROG_END);
const PROG_CN_RE = /([一二两三四五六七八九十\d]+)分之([一二两三四五六七八九十\d]+)/;
const PROG_HALF_RE = new RegExp(String.raw`(?:^|\s)(?:做了|完成了?)?一半` + PROG_END);
const CN_DIGIT = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
function parseProgress(text) {
  let m;
  if ((m = PROG_PCT_RE.exec(text)) && +m[1] <= 100) return +m[1] / 100;
  if ((m = PROG_FRAC_RE.exec(text)) && +m[2] > 0 && +m[2] <= 10 && +m[1] <= +m[2]) return +m[1] / +m[2];
  if ((m = PROG_CN_RE.exec(text))) {
    const b = CN_DIGIT[m[1]] ?? +m[1], a = CN_DIGIT[m[2]] ?? +m[2];
    if (b > 0 && a <= b) return a / b;
  }
  if (PROG_HALF_RE.test(text)) return 0.5;
  return null;
}
const stripProgress = (s) => (parseProgress(s) == null ? s : s.replace(PROG_PCT_RE, " ").replace(PROG_FRAC_RE, " ").replace(PROG_CN_RE, "").replace(PROG_HALF_RE, " "));
// 工作时段按这个键记：去掉「← 2026_09_30」这种挪过来的尾巴，挪到第二天还是同一件事
const workKey = (label) => label.replace(/\s*←\s*\S+\s*$/, "").trim();

// 去掉行里写的时长（3h、30m、一个半小时），Telegram Inbox 用它把「done 写稿 2h」的 2h 换进原来那条任务
const stripDuration = (s) => s
  .replace(/(?:\bfor\s+|做了|用了|花了)?\d+(?:\.\d+)?\s*(?:h|小时)\s*\d+\s*(?:m|min|分钟)(?![a-zA-Z])/g, "")
  .replace(/(?:\bfor\s+|做了|用了|花了)?\d+(?:\.\d+)?\s*(?:[~～\-–到至]\s*\d+(?:\.\d+)?\s*)?(?:hrs|hr|h|个小时|小时|mins|min|m|分钟)(?![a-zA-Z])/g, "")
  .replace(/(?:[一两二三四五六]个?半?|半)个?小时(?!候)/g, "")
  .replace(/\s+/g, " ").trim();

function cleanLabel(s) {
  return s
    .replace(RANGE_RE, "").replace(SINGLE_RE, "")
    .replace(/(?:\bfor\s+|做了|用了|花了)?\d+(?:\.\d+)?\s*(?:h|小时)\s*\d+\s*(?:m|min|分钟)(?![a-zA-Z])/g, "")
    .replace(/(?:\bfor\s+|做了|用了|花了)?\d+(?:\.\d+)?\s*(?:[~～\-–到至]\s*\d+(?:\.\d+)?\s*)?(?:hrs|hr|h|个小时|小时|mins|min|m|分钟)(?![a-zA-Z])/g, "")
    .replace(/(?:[一两二三四五六]个?半?|半)个?小时(?!候)/g, "")
    .replace(/\s+([，,。；;])/g, "$1")
    .replace(/[，,]\s*$|^\s*[，,]/g, "")
    .replace(/!?\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1")
    .replace(/!?\[\[([^\]]*)\]\]/g, (m, p) => p.split("#")[0])
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[[^\[\]]+::[^\]]*\]/g, "")
    .replace(/\s\^[A-Za-z0-9-]+\s*$/, "")
    .replace(/==|\*\*|~~|`/g, "")
    .replace(/[📅🛫✅⭐⏳]\s*\d{4}-\d{2}-\d{2}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseJournal(content, cfg) {
  const prio = cfg.priorityMarkers.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  const items = [];
  const lines = content.split("\n");
  let inCode = false;
  lines.forEach((raw, line) => {
    if (/^\s*```/.test(raw)) { inCode = !inCode; return; }
    if (inCode) return;
    const lm = LIST_RE.exec(raw);
    if (!lm) return;
    let s = lm[2];
    let stamp = null, state = "none", cb = null, kw = null;
    // 时间戳、复选框、关键词三者前后顺序不固定（「**07:37** DONE …」「[x] **01:44** …」都有）
    for (let i = 0; i < 3; i++) {
      let m;
      if (stamp === null && (m = STAMP_RE.exec(s))) { stamp = normalize(tokenMinutes(m[1], m[2]), cfg); s = s.slice(m[0].length); continue; }
      if (!cb && (m = CHECKBOX_RE.exec(s))) {
        cb = m;
        state = m[1] === " " || m[1] === "/" ? "open" : m[1] === "-" ? "drop" : "done";
        s = s.slice(m[0].length);
        continue;
      }
      if (!kw && (m = KEYWORD_RE.exec(s))) {
        kw = m;
        state = /DONE/.test(m[1]) ? "done" : /CANCEL|FAILED/.test(m[1]) ? "drop" : "open";
        s = s.slice(m[0].length);
        continue;
      }
      break;
    }
    if (state === "drop") return;
    const doing = kw && /DOING|NOW|IN-PROGRESS/.test(kw[1]) || (cb && cb[1] === "/");
    const suspended = !!kw && /^WAIT/.test(kw[1]);   // WAITING = 挂起：今天不排、不占容量，做过的时间和进度留着
    const progress = state === "none" ? null : parseProgress(s);
    let label = state === "none" ? s : stripProgress(s);
    for (const p of prio) label = label.split(p).join("");
    label = cleanLabel(label) || s.trim();
    const indent = lm[1].replace(/\t/g, "    ").length;
    const pr = /\[\[[^\]|#]+#\^([\w-]+)/.exec(s);   // [[长期计划#^lp-xxxx|简称]] = 挂在某个长期项目上
    const base = { line, indent, label, state, doing: !!doing, suspended, progress, prio: prio.some((p) => s.includes(p)), stamp, projRef: pr ? pr[1] : null };

    // 紧跟在关键词后面的时间是「记录」：DONE 18:02 = 几点做完；DONE 14:00-15:30 = 实际花在这段；DOING 14:05 = 几点开始做的
    if (state !== "none") {
      const lr = new RegExp("^" + RANGE_RE.source).exec(s);
      const ls = !lr && new RegExp("^" + SINGLE_RE.source).exec(s);
      if (state === "done" && lr) {
        const start = normalize(tokenMinutes(lr[1], lr[2], lr[3], lr[4]), cfg);
        let end = normalize(lr[5] !== undefined ? tokenMinutes(lr[5], lr[6], lr[7], lr[8]) : +lr[9] * 60, cfg);
        if (end <= start) end += 720;
        items.push({ ...base, kind: "task", dur: end - start, explicitDur: true, doneAt: end, actual: [start, end] });
        return;
      }
      // 「DONE 10-12 hsy」这种只写整点的时间段，只在紧跟关键词的位置认
      const br = !lr && state === "done" && /^(\d{1,2})\s*(?:-|–|~|～|到|至)\s*(\d{1,2})(?![\d:：点])/.exec(s);
      if (br && +br[1] <= 24 && +br[2] <= 24) {
        const start = normalize(+br[1] * 60, cfg);
        let end = normalize(+br[2] * 60, cfg);
        if (end <= start) end += 720;
        items.push({ ...base, kind: "task", dur: end - start, explicitDur: true, doneAt: end, actual: [start, end] });
        return;
      }
      if (state === "done" && ls) {
        const at = normalize(tokenMinutes(ls[1], ls[2], ls[3], ls[4]), cfg);
        items.push({ ...base, kind: "task", dur: parseDuration(s.slice(ls[0].length)) ?? cfg.defaultDur, explicitDur: parseDuration(s.slice(ls[0].length)) != null, doneAt: at });
        return;
      }
      if (state === "open" && doing && ls) {
        const startedAt = normalize(tokenMinutes(ls[1], ls[2], ls[3], ls[4]), cfg);
        items.push({ ...base, kind: "task", dur: parseDuration(s.slice(ls[0].length)) ?? cfg.defaultDur, explicitDur: parseDuration(s.slice(ls[0].length)) != null, startedAt });
        return;
      }
    }

    const rm = RANGE_RE.exec(s);
    if (rm) {
      const start = normalize(tokenMinutes(rm[1], rm[2], rm[3], rm[4]), cfg);
      let end = rm[5] !== undefined ? tokenMinutes(rm[5], rm[6], rm[7], rm[8]) : +rm[9] * 60;
      end = normalize(end, cfg);
      if (end <= start) end += 720;                 // 「3:00-5」这种按下午理解
      items.push({ ...base, kind: "event", start, end });
      return;
    }
    if (state === "none") {
      if (stamp !== null) items.push({ ...base, kind: "log", start: stamp });
      return;
    }
    const dur = parseDuration(s) ?? cfg.defaultDur;
    const single = SINGLE_RE.exec(s);
    if (single) {
      const start = normalize(tokenMinutes(single[1], single[2], single[3], single[4]), cfg);
      items.push({ ...base, kind: "event", start, end: start + dur, pinned: true });
      return;
    }
    items.push({ ...base, kind: "task", dur, explicitDur: parseDuration(s) != null });
  });
  // 父任务下面还挂着子任务、自己又没写时长：时间算在子任务上，父任务不重复占
  items.forEach((t, i) => {
    if (t.kind !== "task" || t.state !== "open" || t.explicitDur === true || t.startedAt != null) return;
    for (let j = i + 1; j < items.length && items[j].indent > t.indent; j++) {
      if (items[j].kind === "task") { t.container = true; break; }
    }
  });
  return items;
}

// ---------------- 排程 ----------------

function subtract(intervals, busy) {
  let out = intervals;
  for (const [b0, b1] of busy) {
    const next = [];
    for (const [a0, a1] of out) {
      if (b1 <= a0 || b0 >= a1) { next.push([a0, a1]); continue; }
      if (b0 > a0) next.push([a0, b0]);
      if (b1 < a1) next.push([b1, a1]);
    }
    out = next;
  }
  return out;
}

// 把记下来的工作时段（cfg.workLog）挂到任务上，排程之前调：
//   t.worked = 这天做过的几段；t.spentToday / t.spentBefore = 这天 / 前几天（挪过来之前）做掉的分钟
// 返回这天记了时段、但任务行已经不在日记里的（做到一半挪去明天了），螺旋上照样画出来
function applyWork(items, cfg, dayKey, now, dayRel, bounds = {}) {
  const log = cfg.workLog || {};
  const today = log[dayKey] || {};
  const E = bounds.end ?? cfg.dayEnd * 60;
  const sum = (segs) => segs.reduce((n, [a, b]) => n + b - a, 0);
  const close = (segs, est) => segs.map(([a, b]) => [a, b ?? (dayRel === 0 ? now : Math.min(E, a + est))]).filter(([a, b]) => b > a);
  const seen = new Set();
  for (const t of items) {
    if (t.kind !== "task") continue;
    const k = workKey(t.label);
    seen.add(k);
    let segs = close(today[k] || [], t.dur);
    // 手写了「DOING 14:05」但没被记到（比如那会儿 Obsidian 没开）：按写的算
    if (!segs.length && t.startedAt != null && t.state === "open") segs = close([[t.startedAt, null]], t.dur);
    t.worked = segs;
    t.spentToday = sum(segs);
    t.spentBefore = 0;
    for (const d in log) if (d < dayKey && log[d][k]) t.spentBefore += sum(log[d][k].filter(([, b]) => b != null));
  }
  return Object.entries(today).filter(([k]) => !seen.has(k)).map(([k, segs]) => ({ label: k, line: 0, segs: close(segs, 30) })).filter((o) => o.segs.length);
}

// bounds = 这天实际的开始 / 结束（螺旋上拖出来的），没设就用设置里的 dayStart / dayEnd
function schedule(items, cfg, now, dayRel, bounds = {}) {
  const S = bounds.start ?? cfg.dayStart * 60, E = bounds.end ?? cfg.dayEnd * 60;
  // 今天从「现在」开始排；过去的日子没做完的都算排不下；以后的日子从一早开始排
  const from = dayRel === 0 ? Math.min(Math.max(now, S), E) : dayRel < 0 ? E : S;
  const events = items.filter((i) => i.kind === "event");
  const busy = events.map((e) => [Math.max(e.start, from), Math.min(e.end, E)]).filter(([a, b]) => b > a);
  let free = subtract([[from, E]], busy);
  const available = free.reduce((s, [a, b]) => s + b - a, 0);

  const open = items.filter((i) => i.kind === "task" && i.state === "open" && !i.container && !i.suspended);
  const queue = [...open.filter((t) => t.doing), ...open.filter((t) => !t.doing)];
  let demand = 0;
  for (const t of queue) {
    t.segments = [];
    let need = t.dur;
    if (t.worked) {
      // 做过的几段先画出来（中断再续就是好几段），剩下的接着往后排：
      // 写了进度按进度算（3h 40% = 还剩 1h48m），没写就用 预估 − 已经做掉的（含前几天），至少留 5 分钟
      for (const [a, b] of t.worked) if (b > S) t.segments.push([Math.max(a, S), b]);
      const spent = t.spentToday + t.spentBefore;
      if (t.progress != null) need = t.dur * (1 - t.progress);
      else if (spent > 0) need = Math.max(5, t.dur - spent);
    } else if (t.startedAt != null && dayRel === 0 && t.startedAt < from) {
      // 没调 applyWork 的（任务提醒插件）：写了开始时间的 DOING，已经做掉的那段画出来
      t.segments.push([Math.max(t.startedAt, S), from]);
      need = Math.max(5, t.dur - (from - t.startedAt));
    }
    t.workedN = t.segments.length;   // 前面这几段是做过的，后面是排的
    t.remaining = need;
    demand += need;
    while (need > 0 && free.length) {
      const [a, b] = free[0];
      const take = Math.min(need, b - a);
      t.segments.push([a, a + take]);
      need -= take;
      if (a + take >= b) free.shift(); else free[0] = [a + take, b];
    }
    t.overflow = need;
  }
  const eventLeft = busy.reduce((s, [a, b]) => s + b - a, 0);
  const suspended = items.filter((i) => i.kind === "task" && i.state === "open" && i.suspended);
  for (const t of suspended) t.remaining = t.progress != null ? t.dur * (1 - t.progress) : Math.max(5, t.dur - ((t.spentToday || 0) + (t.spentBefore || 0)));
  return { from, available, demand, overflow: Math.max(0, demand - available), eventLeft, queue, suspended };
}

// ---------------- 工具 ----------------

const pad = (n) => String(n).padStart(2, "0");
const clock = (t) => `${pad(Math.floor(t / 60) % 24)}:${pad(Math.round(t % 60))}`;
function dur(m) {
  m = Math.round(m);
  const h = Math.floor(m / 60), r = m % 60;
  return h ? (r ? `${h}h${r}m` : `${h}h`) : `${r}m`;
}
const svgEl = (tag, attrs, parent) => {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(el);
  return el;
};

// ---------------- 人机协作：Claude Code 的本地会话日志 ----------------
// ~/.claude/projects/**/*.jsonl，每条 assistant 消息带 usage。按日记日（dayCutoff 分界）汇总成：
//   协作时长 = 有 Claude 在干活的墙钟时间（几个窗口同时开只算一次）；Claude 工时 = 各会话活跃时间相加（并行就多于协作时长）
//   产出 = output tokens（含思考）；读入 = input + cache 写入（新读进来的文件、命令输出）；
//   缓存命中 cache_read 只是每轮把上下文重读一遍，量最大但不代表干了活，只放在悬停提示里
// Claude Code 默认 30 天删会话日志，所以汇总结果另存一份（ai-usage.json），日志删了历史还在。
const AI_IDLE = 5;          // 同一会话两次活动间隔不超过 5 分钟，中间算在干活（跑长命令、等你确认都在内）
const AI_FRESH_DAYS = 14;   // 最近这么多天的汇总会随日志重算，更早的定格不再改
const AI_STORE_V = 2;       // ai-usage.json 的格式版本；升级时用现存日志把所有日子重算一遍（2 = 加了每个会话的明细 list）

const fmtKey = (d, cfg) => cfg.format.replace("YYYY", d.getFullYear()).replace("MM", pad(d.getMonth() + 1)).replace("DD", pad(d.getDate()));

function aiDay(ms, cfg) {
  const cutoff = cfg.dayCutoff ?? Math.max(0, cfg.dayEnd - 24);
  const d = new Date(ms - cutoff * 3600e3);
  const mid = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return { key: fmtKey(d, cfg), t: (ms - mid) / 60000 };   // t 和螺旋同一个坐标：当天 0 点起的分钟数，凌晨会超过 1440
}

function aiProject(cwd) {
  if (!cwd) return "?";
  const p = cwd.split("/.claude/worktrees/")[0].replace(/\/+$/, "");
  return p === require("os").homedir() ? "~" : p.split("/").pop() || p;
}

// 真的是你敲的指令（不是工具结果、斜杠命令、系统注入）：返回指令原文，不是就返回空串
function aiIsPrompt(d) {
  if (d.isMeta || d.isSidechain) return false;
  const c = d.message && d.message.content;
  const text = typeof c === "string" ? c : Array.isArray(c) && !c.some((b) => b.type === "tool_result") ? c.filter((b) => b.type === "text").map((b) => b.text).join("") : "";
  return text.trim() && !/^\s*(<(command-|local-command|system-reminder|task-notification|ci-monitor)|\[Request interrupted)/.test(text) ? text.trim() : "";
}

class AiUsage {
  constructor(cfg) {
    this.cfg = cfg;
    this.files = new Map();   // path -> { size, offset, days: Map(key -> { sess: Map(sid -> {proj, ts[], text}), prompts }), msgs: Map(id -> 用量), titles: Map(sid -> 标题) }
  }

  static roots() {
    const os = require("os"), path = require("path");
    const r = [path.join(os.homedir(), ".claude/projects"), path.join(os.homedir(), ".config/claude/projects")];
    for (const d of (process.env.CLAUDE_CONFIG_DIR || "").split(",").filter(Boolean)) r.push(path.join(d, "projects"));
    return [...new Set(r)];
  }

  // 读 mtime >= since 的日志；读过的文件只读新追加的部分。返回这次碰到的日记日
  async scan(since = 0) {
    const fs = require("fs"), path = require("path");
    const touched = new Set();
    const walk = async (dir, depth) => {
      let ents;
      try { ents = await fs.promises.readdir(dir, { withFileTypes: true }); } catch (e) { return []; }
      const out = [];
      for (const e of ents) {
        const p = path.join(dir, e.name);
        if (e.isDirectory() && depth < 4) out.push(...await walk(p, depth + 1));
        else if (e.isFile() && e.name.endsWith(".jsonl")) out.push(p);
      }
      return out;
    };
    for (const root of AiUsage.roots()) {
      for (const p of await walk(root, 0)) {
        let st;
        try { st = await fs.promises.stat(p); } catch (e) { continue; }
        let fc = this.files.get(p);
        if (!fc && st.mtimeMs < since) continue;
        if (fc && st.size === fc.size) continue;
        if (!fc || st.size < fc.size) this.files.set(p, fc = { size: 0, offset: 0, days: new Map(), msgs: new Map(), titles: new Map() });
        const fh = await fs.promises.open(p, "r");
        try {
          const buf = Buffer.alloc(st.size - fc.offset);
          await fh.read(buf, 0, buf.length, fc.offset);
          fc.size = st.size;
          const end = buf.lastIndexOf(10);
          if (end < 0) continue;
          fc.offset += end + 1;
          const lines = buf.toString("utf8", 0, end).split("\n");
          for (let i = 0; i < lines.length; i++) {
            this.ingest(lines[i], fc, touched);
            if (i % 3000 === 2999) await new Promise((r) => setTimeout(r, 0));   // 大文件分段，别把界面卡住
          }
        } finally { await fh.close(); }
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    return touched;
  }

  ingest(line, fc, touched) {
    if (!line || (line.indexOf('"type":"assistant"') < 0 && line.indexOf('"type":"user"') < 0 && line.indexOf('"type":"custom-title"') < 0)) return;
    let d;
    try { d = JSON.parse(line); } catch (e) { return; }
    if (d.type === "custom-title") { if (d.customTitle) fc.titles.set(d.sessionId, d.customTitle); return; }
    if (d.type !== "assistant" && d.type !== "user") return;
    const ms = Date.parse(d.timestamp);
    if (!ms) return;
    const { key, t } = aiDay(ms, this.cfg);
    touched.add(key);
    let day = fc.days.get(key);
    if (!day) fc.days.set(key, day = { sess: new Map(), prompts: 0 });
    const proj = aiProject(d.cwd);
    const sid = d.sessionId || "?";
    let s = day.sess.get(sid);
    if (!s) day.sess.set(sid, s = { proj, ts: [], text: "" });
    s.ts.push(t);
    if (d.type === "user") {
      const text = aiIsPrompt(d);
      if (text) {
        day.prompts++;
        // 留一点你发的原话，长期项目拿它和会话标题去匹配「归类：」词
        if (s.text.length < 300) s.text += (s.text ? " / " : "") + text.replace(/\s+/g, " ").slice(0, 300 - s.text.length);
      }
      return;
    }
    const u = d.message && d.message.usage;
    if (!u || !d.message.id) return;
    // 一条回复按内容块拆成好几行、每行都带 usage：按 message.id 去重，留最后一行（最完整）
    fc.msgs.set(d.message.id + ":" + (d.requestId || ""), { key, sid, proj: s.proj, model: d.message.model,
      out: u.output_tokens || 0, fresh: (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0), cached: u.cache_read_input_tokens || 0 });
  }

  summary(key) {
    const sess = new Map(), titles = new Map();
    let prompts = 0;
    for (const fc of this.files.values()) {
      for (const [sid, t] of fc.titles) titles.set(sid, t);
      const day = fc.days.get(key);
      if (!day) continue;
      prompts += day.prompts;
      for (const [sid, s] of day.sess) {
        const cur = sess.get(sid);
        if (cur) { cur.ts.push(...s.ts); if (cur.text.length < 300 && s.text) cur.text += " / " + s.text; }
        else sess.set(sid, { proj: s.proj, ts: [...s.ts], text: s.text, segs: [], min: 0, out: 0 });
      }
    }
    if (!sess.size) return null;
    const res = { wall: 0, agent: 0, sessions: sess.size, prompts, calls: 0, out: 0, fresh: 0, cached: 0, segs: [], proj: {}, models: {}, list: [] };
    const spans = [];
    for (const s of sess.values()) {
      s.ts.sort((a, b) => a - b);
      let a = s.ts[0], b = a + 1;
      const push = () => { spans.push([a, b]); s.segs.push([a, b]); s.min += b - a; res.agent += b - a; (res.proj[s.proj] ||= { min: 0, out: 0 }).min += b - a; };
      for (const t of s.ts.slice(1)) {
        if (t - b <= AI_IDLE) b = Math.max(b, t);
        else { push(); a = t; b = t + 1; }
      }
      push();
    }
    spans.sort((x, y) => x[0] - y[0]);
    for (const [a, b] of spans) {
      const last = res.segs[res.segs.length - 1];
      if (last && a <= last[1]) last[1] = Math.max(last[1], b); else res.segs.push([a, b]);
    }
    res.wall = res.segs.reduce((s, [a, b]) => s + b - a, 0);
    const seen = new Set();
    for (const fc of this.files.values()) for (const [id, m] of fc.msgs) {
      if (m.key !== key || seen.has(id)) continue;   // 续接的会话会把旧消息抄进新文件，跨文件也去重
      seen.add(id);
      res.calls++; res.out += m.out; res.fresh += m.fresh; res.cached += m.cached;
      (res.proj[m.proj] ||= { min: 0, out: 0 }).out += m.out;
      if (sess.has(m.sid)) sess.get(m.sid).out += m.out;
      if (m.model && m.model !== "<synthetic>") res.models[m.model] = (res.models[m.model] || 0) + m.out;
    }
    res.wall = Math.round(res.wall); res.agent = Math.round(res.agent);
    res.segs = res.segs.map(([a, b]) => [Math.round(a), Math.round(b)]);
    for (const p of Object.values(res.proj)) p.min = Math.round(p.min);
    // 每个会话一行：长期项目按标题 / 指令 / 目录把它归到项目上（scripts/long-projects.js）
    for (const [sid, s] of sess) res.list.push({ sid, dir: s.proj, title: titles.get(sid) || "", text: s.text.slice(0, 300),
      min: Math.round(s.min), out: s.out, segs: s.segs.map(([a, b]) => [Math.round(a), Math.round(b)]) });
    return res;
  }

  // 把碰到的日子写进汇总库；AI_FRESH_DAYS 天以前、库里已经有的日子定格不改（那时的日志可能已被 Claude Code 清掉一部分）
  merge(store, touched, force = false) {
    const t0 = new Date();
    t0.setDate(t0.getDate() - AI_FRESH_DAYS);
    const frozen = fmtKey(t0, this.cfg);
    let changed = false;
    for (const key of touched) {
      if (store.days[key] && key < frozen && !force) continue;
      const s = this.summary(key);
      if (s && JSON.stringify(s) !== JSON.stringify(store.days[key])) { store.days[key] = s; changed = true; }
    }
    return changed;
  }
}

// 几段时间合起来一共多少分钟（重叠的只算一次）
function unionMin(segs) {
  let min = 0, end = -Infinity;
  for (const [a, b] of [...segs].sort((x, y) => x[0] - y[0])) if (b > end) { min += b - Math.max(a, end); end = b; }
  return min;
}

const fmtTok = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? Math.round(n / 1e3) + "k" : String(n));

// ---------------- 视图 ----------------

class SpiralView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.offset = 0;   // 相对今天偏移几天；0 = 跟着今天走
  }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return "螺旋日程"; }
  getIcon() { return "orbit"; }

  async onOpen() {
    this.containerEl.children[1].addClass("naut-root");
    await this.render();
  }

  date() { return this.plugin.today().add(this.offset, "days"); }
  path() { return this.plugin.journalPath(this.date()); }

  async render() {
    const root = this.containerEl.children[1];
    const cfg = this.plugin.settings;
    const date = this.date();
    const file = this.app.vault.getAbstractFileByPath(this.path());
    const aiStore = cfg.showAi !== false ? await this.plugin.aiUsage() : null;
    const gameLog = cfg.trackGames !== false ? await this.plugin.gameLog() : null;
    root.empty();

    const head = root.createDiv({ cls: "naut-head" });
    const prev = head.createEl("button", { text: "‹" });
    head.createSpan({ cls: "naut-date", text: date.format("M月D日 ddd") });
    const next = head.createEl("button", { text: "›" });
    const today = head.createEl("button", { text: "今天" });
    prev.onclick = () => { this.offset--; this.render(); };
    next.onclick = () => { this.offset++; this.render(); };
    today.onclick = () => { this.offset = 0; this.render(); };
    today.disabled = this.offset === 0;

    if (!(file instanceof TFile)) {
      root.createDiv({ cls: "naut-empty", text: `还没有 ${this.path()}` });
      return;
    }
    const content = await this.app.vault.cachedRead(file);
    const items = parseJournal(content, cfg);
    // 自动归类到长期项目的行（long-projects.js 按项目的「归类：」词算的）：行号 → 项目
    const projOf = new Map();
    if (cfg.showProjects) {
      const lp = await this.plugin.projects();
      for (const it of lp?.data.items || []) for (const a of it.activity) if (a.file.path === file.path && a.kind !== "提及") projOf.set(a.line, it);
    }
    const dayKey = date.format(cfg.format);
    const done = cfg.doneTimes[dayKey] || {};
    const nowM = moment();
    const now = normalize(nowM.hours() * 60 + nowM.minutes(), cfg);
    const dayRel = this.offset === 0 ? 0 : this.offset < 0 ? -1 : 1;
    const bounds = (cfg.dayBounds || {})[dayKey] || {};
    const orphans = applyWork(items, cfg, dayKey, now, dayRel, bounds);   // 这天做过、但任务行已经挪走的
    const plan = schedule(items, cfg, now, dayRel, bounds);
    const S = cfg.dayStart * 60, E = cfg.dayEnd * 60;
    const S1 = bounds.start ?? S, E1 = bounds.end ?? E;   // 这天实际的开始 / 结束

    for (const t of items) {
      if (t.kind === "task" && t.state === "done") {
        // 完成时间的来源，按可信度：DONE 后面手写的时间 > **07:37** 时间戳 > 插件看到它变成 DONE 的时刻
        const at = t.doneAt ?? t.stamp ?? done[t.label];
        // 没写时长、但记到了做的时段：时长按实际做的算（含前几天做掉的）
        const spent = t.spentToday + t.spentBefore;
        if (!t.explicitDur && !t.actual && spent >= 1) t.dur = Math.round(spent);
        t.doneAt = at ?? (t.worked.length ? t.worked.at(-1)[1] : null);
        // 画在哪：记下来的那几段「进行中」+ DONE 14:00-15:30 写的时段（任务归位插件写的只是最后一段，中断之前的几段在记录里）
        //        都没有就用完成时刻往前推一个时长
        if (t.actual && t.worked.length) {
          const all = [...t.worked, t.actual].sort((a, b) => a[0] - b[0]);
          t.segments = [];
          for (const [a, b] of all) { const last = t.segments.at(-1); if (last && a <= last[1]) last[1] = Math.max(last[1], b); else t.segments.push([a, b]); }
          t.dur = Math.round(unionMin(t.segments) + t.spentBefore);
        } else t.segments = t.actual ? [t.actual] : t.worked.length ? t.worked : at != null ? [[Math.max(S, at - t.dur), at]] : [];
      }
    }

    // 容量条
    const cap = root.createDiv({ cls: "naut-cap" });
    const total = Math.max(plan.available, plan.demand) || 1;
    const bar = cap.createDiv({ cls: "naut-bar" });
    const fit = Math.min(plan.demand, plan.available);
    bar.createDiv({ cls: "naut-bar-task", attr: { style: `width:${(fit / total) * 100}%` } });
    bar.createDiv({ cls: "naut-bar-free", attr: { style: `width:${((plan.available - fit) / total) * 100}%` } });
    if (plan.overflow) bar.createDiv({ cls: "naut-bar-over", attr: { style: `width:${(plan.overflow / total) * 100}%` } });
    const info = cap.createDiv({ cls: "naut-cap-text" });
    info.createSpan({ text: `可用 ${dur(plan.available)} · 待办 ${dur(plan.demand)}` });
    if (plan.overflow) info.createSpan({ cls: "naut-over-text", text: ` · 超出 ${dur(plan.overflow)}` });
    else info.createSpan({ text: ` · 富余 ${dur(plan.available - plan.demand)}` });
    if (plan.eventLeft) info.createSpan({ cls: "naut-muted", text: ` · 事件占 ${dur(plan.eventLeft)}` });
    if (bounds.start != null || bounds.end != null) info.createSpan({ cls: "naut-muted", text: ` · ${clock(S1)}–${clock(E1)}` });

    // 人机协作：这一天 Claude 干了多少（数据见上面「人机协作」一节的口径）
    const ai = aiStore && aiStore.days[dayKey];
    if (ai) {
      const models = Object.entries(ai.models).sort((a, b) => b[1] - a[1]).map(([m, n]) => `${m} ${fmtTok(n)}`).join("、");
      cap.createDiv({ cls: "naut-ai-line", text: `🤖 协作 ${dur(ai.wall)} · Claude 工时 ${dur(ai.agent)} · 产出 ${fmtTok(ai.out)} tok · ${ai.prompts} 条指令`, attr: { title: [
        `协作 ${dur(ai.wall)}：有 Claude 在干活的时间，几个窗口同时开只算一次（螺旋内圈的紫线）`,
        `Claude 工时 ${dur(ai.agent)}：${ai.sessions} 个会话各自的活跃时间相加${ai.agent > ai.wall * 1.1 ? `，平均 ${(ai.agent / ai.wall).toFixed(1)} 路并行` : ""}`,
        `产出 ${fmtTok(ai.out)}：Claude 写出来的 token（含思考），${ai.calls} 次调用`,
        `读入 ${fmtTok(ai.fresh)}：新读进来的文件、命令输出`,
        `缓存命中 ${fmtTok(ai.cached)}：每轮重读上下文，不算工作量`,
        `指令 ${ai.prompts}：你亲手发的消息`,
        models && `模型：${models}`,
      ].filter(Boolean).join("\n") } });
    }
    // 🎮 游戏时间（插件每分钟看一眼在不在玩，记在 game-log.json）
    const games = (gameLog && gameLog.days[dayKey]) || [];
    if (games.length) {
      const by = {};
      for (const [a, b, n] of games) by[n] = (by[n] || 0) + b - a;
      const wall = unionMin(games);
      cap.createDiv({ cls: "naut-game-line", text: `🎮 游戏 ${dur(wall)}` + (Object.keys(by).length > 1 || !by.Steam ? " · " + Object.entries(by).sort((a, b) => b[1] - a[1]).map(([n, m]) => `${n} ${dur(m)}`).join(" · ") : ""),
        attr: { title: "开着 Hearthstone / Steam 里的游戏，或者 Steam 在最前面的时间（螺旋内圈的绿线）。只在 Obsidian 开着时记录。" } });
    }

    // 螺旋
    const size = 320, c = size / 2, R0 = 146, R1 = 42;
    const ang = (t) => ((t / 60) % 12) / 12 * Math.PI * 2 - Math.PI / 2;
    const rad = (t) => R0 - (R0 - R1) * (Math.min(Math.max(t, S), E) - S) / (E - S);
    const pt = (t, dr = 0) => [c + (rad(t) + dr) * Math.cos(ang(t)), c + (rad(t) + dr) * Math.sin(ang(t))];
    const arc = (a, b, dr = 0) => {
      a = Math.max(a, S); b = Math.min(b, E);
      if (b <= a) return null;
      let d = "";
      for (let t = a; t < b; t += 2) d += (d ? " L " : "M ") + pt(t, dr).map((v) => v.toFixed(1)).join(" ");
      return d + " L " + pt(b, dr).map((v) => v.toFixed(1)).join(" ");
    };
    const svg = svgEl("svg", { viewBox: `0 0 ${size} ${size}`, class: "naut-svg" });
    root.appendChild(svg);
    // 这天实际开始之前、结束之后的一段画成虚线
    svgEl("path", { d: arc(S1, E1), class: "naut-track" }, svg);
    if (S1 > S) svgEl("path", { d: arc(S, S1), class: "naut-off" }, svg);
    if (E1 < E) svgEl("path", { d: arc(E1, E), class: "naut-off" }, svg);
    for (let h = Math.ceil(S / 60); h <= E / 60; h++) {
      const [x, y] = pt(h * 60, 13);
      const tx = svgEl("text", { x, y, class: "naut-hour" }, svg);
      tx.textContent = String(h % 24);
    }
    // 内圈细线：Claude 在干活的时段
    for (const [a, b] of ai ? ai.segs : []) {
      const d = arc(a, Math.max(b, a + 3), -10);
      if (d) svgEl("title", {}, svgEl("path", { d, class: "naut-ai" }, svg)).textContent = `${clock(a)}–${clock(b)} Claude 在干活（${dur(b - a)}）`;
    }
    // 再往里一圈：游戏时间
    for (const [a, b, n] of games) {
      const d = arc(a, Math.max(b, a + 3), -16);
      if (d) svgEl("title", {}, svgEl("path", { d, class: "naut-game" }, svg)).textContent = `${clock(a)}–${clock(b)} 🎮 ${n}（${dur(b - a)}）`;
    }
    const drawSeg = (a, b, cls, item) => {
      const d = arc(a, b);
      if (!d) return;
      const p = svgEl("path", { d, class: `naut-seg ${cls}` }, svg);
      const title = svgEl("title", {}, p);
      title.textContent = `${clock(a)}–${clock(b)} ${item.label}`;
      p.addEventListener("click", () => this.plugin.openLine(file, item.line));
    };
    for (const e of items.filter((i) => i.kind === "event")) drawSeg(e.start, e.end, e.state === "done" ? "naut-event naut-done-event" : e.prio ? "naut-prio" : "naut-event", e);
    for (const t of items.filter((i) => i.kind === "task" && i.state === "done")) for (const [a, b] of t.segments) drawSeg(a, b, "naut-done", t);
    // 没做完的：做过的几段画淡一点，后面排的画实的
    for (const t of plan.queue) t.segments.forEach(([a, b], i) => drawSeg(a, b, (t.prio ? "naut-prio" : "naut-task") + (i < t.workedN ? " naut-worked" : ""), t));
    for (const t of plan.suspended) for (const [a, b] of t.worked || []) drawSeg(a, b, "naut-task naut-worked", t);
    for (const o of orphans) for (const [a, b] of o.segs) drawSeg(a, b, "naut-task naut-worked", o);
    for (const l of items.filter((i) => i.kind === "log")) {
      if (l.start < S || l.start > E) continue;
      const [x, y] = pt(l.start);
      const dot = svgEl("circle", { cx: x, cy: y, r: 2.6, class: "naut-log" }, svg);
      svgEl("title", {}, dot).textContent = `${clock(l.start)} ${l.label}`;
    }
    if (dayRel === 0 && now >= S && now <= E) {
      const [x0, y0] = [c, c];
      const [x1, y1] = [c + (R0 + 10) * Math.cos(ang(now)), c + (R0 + 10) * Math.sin(ang(now))];
      svgEl("line", { x1: x0, y1: y0, x2: x1, y2: y1, class: "naut-now" }, svg);
      const [px, py] = pt(now);
      svgEl("circle", { cx: px, cy: py, r: 4, class: "naut-now-dot" }, svg);
    }
    // 起止把手：沿着螺旋拖 = 改这天实际的开始 / 结束时间（5 分钟一格），双击恢复默认
    const handle = (kind, t0) => {
      const [x, y] = pt(t0);
      const h = svgEl("circle", { cx: x, cy: y, r: 6, class: `naut-handle naut-handle-${kind}` }, svg);
      const name = kind === "start" ? "开始" : "结束";
      svgEl("title", {}, h).textContent = `这天实际${name} ${clock(t0)}${bounds[kind] == null ? "（默认）" : ""}\n拖动调整，双击恢复默认`;
      const label = svgEl("text", { x, y, class: "naut-handle-label" }, svg);
      const nearest = (ev) => {
        const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(svg.getScreenCTM().inverse());
        let best = t0, bd = Infinity;
        for (let t = S; t <= E; t += 5) { const [px, py] = pt(t); const d = (px - p.x) ** 2 + (py - p.y) ** 2; if (d < bd) { bd = d; best = t; } }
        return best;
      };
      let cur = t0;
      h.addEventListener("pointerdown", (ev) => { ev.preventDefault(); ev.stopPropagation(); this.plugin.dragging = true; h.setPointerCapture(ev.pointerId); });
      h.addEventListener("pointermove", (ev) => {
        if (!this.plugin.dragging || !h.hasPointerCapture(ev.pointerId)) return;
        cur = kind === "start" ? Math.min(nearest(ev), E1 - 30) : Math.max(nearest(ev), S1 + 30);
        const [nx, ny] = pt(cur);
        h.setAttribute("cx", nx); h.setAttribute("cy", ny);
        label.setAttribute("x", nx); label.setAttribute("y", ny - 11);
        label.textContent = clock(cur);
      });
      const end = () => {
        if (!this.plugin.dragging) return;
        this.plugin.dragging = false;
        if (cur !== t0) this.plugin.setBounds(dayKey, kind, cur);   // 没挪动就不重绘，不然双击会被打断
      };
      h.addEventListener("pointerup", end);
      h.addEventListener("pointercancel", end);
      h.addEventListener("lostpointercapture", end);
      h.addEventListener("dblclick", () => this.plugin.setBounds(dayKey, kind, null));
    };
    handle("start", S1);
    handle("end", E1);
    const center = svgEl("text", { x: c, y: c + 4, class: "naut-center" }, svg);
    center.textContent = dayRel === 0 ? clock(now) : date.format("M/D");

    // 列表
    const list = root.createDiv({ cls: "naut-list" });
    const section = (title, rows) => {
      if (!rows.length) return;
      list.createDiv({ cls: "naut-sec", text: title });
      for (const r of rows) {
        const row = list.createDiv({ cls: `naut-row ${r.cls}` });
        row.createSpan({ cls: "naut-time", text: r.time });
        const proj = projOf.get(r.item.line);
        row.createSpan({ cls: "naut-label", text: (r.item.projRef || proj ? "🧭 " : "") + r.item.label, attr: proj ? { title: "算进长期项目：" + proj.short } : {} });
        row.createSpan({ cls: "naut-dur", text: r.dur, attr: r.tip ? { title: r.tip } : {} });
        row.onclick = () => this.plugin.openLine(file, r.item.line);
      }
    };
    const events = items.filter((i) => i.kind === "event").sort((a, b) => a.start - b.start);
    section("固定事件", events.map((e) => ({ item: e, cls: e.state === "done" ? "is-done" : "is-event", time: `${clock(e.start)}–${clock(e.end)}`, dur: dur(e.end - e.start) })));
    // 进度：写了 40% / 1/3 按写的；没写但做过，按 已做 / 预估 估一个
    const spentOf = (t) => (t.spentToday || 0) + (t.spentBefore || 0);
    const pctOf = (t) => (t.progress != null ? Math.round(t.progress * 100) : spentOf(t) >= 1 ? Math.min(99, Math.round(spentOf(t) / (spentOf(t) + t.remaining) * 100)) : null);
    const durText = (t) => (pctOf(t) == null ? dur(t.dur) : `${pctOf(t)}% · 剩 ${dur(t.remaining)}`);
    const tipOf = (t) => (pctOf(t) == null ? "" : `预估 ${dur(t.dur)}${spentOf(t) >= 1 ? ` · 已做 ${dur(spentOf(t))}（今天 ${dur(t.spentToday)}${t.spentBefore >= 1 ? `，之前 ${dur(t.spentBefore)}` : ""}）` : ""}${t.progress != null ? ` · 进度是你写的 ${pctOf(t)}%` : ""}`);
    const placed = plan.queue.filter((t) => t.segments.length > t.workedN);
    section("接下来", placed.map((t) => ({
      item: t, cls: t.prio ? "is-prio" : "is-task",
      time: t.doing && dayRel === 0 ? "进行中" : clock(t.segments[t.workedN][0]) + (t.overflow ? " 起" : ""),
      dur: durText(t), tip: tipOf(t),
    })));
    const over = plan.queue.filter((t) => t.overflow);
    section(dayRel < 0 ? "没做完" : "排不下", over.map((t) => ({ item: t, cls: "is-over", time: "—", dur: t.segments.length > t.workedN ? `缺 ${dur(t.overflow)}` : durText(t), tip: tipOf(t) })));
    section("⏸ 挂起", plan.suspended.map((t) => ({ item: t, cls: "is-susp", time: "⏸", dur: durText(t), tip: tipOf(t) })));
    section("做过 · 已挪走", orphans.map((o) => ({ item: o, cls: "is-done", time: `${clock(o.segs[0][0])}–${clock(o.segs.at(-1)[1])}`, dur: dur(o.segs.reduce((n, [a, b]) => n + b - a, 0)) })));
    const doneTasks = items.filter((i) => i.kind === "task" && i.state === "done").sort((a, b) => (a.doneAt ?? 1e9) - (b.doneAt ?? 1e9));
    section(`已完成 ${doneTasks.length}`, doneTasks.map((t) => ({
      item: t, cls: "is-done",
      time: t.actual ? `${clock(t.actual[0])}–${clock(t.actual[1])}` : t.doneAt != null ? clock(t.doneAt) : "—",
      dur: dur(t.dur),
    })));

    if (ai || aiStore && dayRel === 0) this.renderAi(list, aiStore, date, ai);

    // 长期项目：该推一把（数据来自 scripts/long-projects.js，和「长期项目」看板同一份）
    if (cfg.showProjects && dayRel === 0) await this.renderProjects(list, file);
  }

  // 🤖 人机协作：按项目分 + 近 7 天
  renderAi(list, store, date, ai) {
    const cfg = this.plugin.settings;
    list.createDiv({ cls: "naut-sec", text: "🤖 人机协作" });
    if (ai) {
      const rows = Object.entries(ai.proj).filter(([, p]) => p.out >= 1000 || p.min >= 2).sort((a, b) => b[1].out - a[1].out).slice(0, 5);
      for (const [name, p] of rows) {
        const row = list.createDiv({ cls: "naut-row naut-ai-row" });
        row.createSpan({ cls: "naut-time", text: dur(p.min) });
        row.createSpan({ cls: "naut-label", text: name });
        row.createSpan({ cls: "naut-dur", text: fmtTok(p.out) });
      }
    }
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = date.clone().subtract(i, "days");
      days.push({ d, s: store.days[d.format(cfg.format)] });
    }
    const max = Math.max(60, ...days.map((x) => (x.s ? x.s.wall : 0)));
    const had = days.filter((x) => x.s);
    const week = list.createDiv({ cls: "naut-ai-week" });
    for (const { d, s } of days) {
      const col = week.createDiv({ cls: "naut-ai-col" + (d.isSame(date, "day") ? " is-cur" : ""), attr: { title: s ? `${d.format("M/D ddd")}  协作 ${dur(s.wall)} · 工时 ${dur(s.agent)} · 产出 ${fmtTok(s.out)} · ${s.prompts} 条指令` : `${d.format("M/D ddd")}  没用 Claude` } });
      col.createDiv({ cls: "naut-ai-bar", attr: { style: `height:${s ? Math.max(2, (s.wall / max) * 100) : 0}%` } });
      col.createDiv({ cls: "naut-ai-day", text: d.format("dd") });
    }
    const sum = (k) => had.reduce((n, x) => n + x.s[k], 0);
    list.createDiv({ cls: "naut-proj-note", text: had.length ? `近 7 天：${had.length} 天在用 · 协作 ${dur(sum("wall"))} · 产出 ${fmtTok(sum("out"))} tok · 日均 ${dur(sum("wall") / 7)}` : "近 7 天还没有 Claude Code 记录" });
  }

  async renderProjects(list, file) {
    const lp = await this.plugin.projects();
    if (!lp) return;
    const { LP, data } = lp;
    const open = !this.plugin.settings.projFolded;
    const head = list.createDiv({ cls: "naut-sec naut-proj-head", text: `${open ? "▾" : "▸"} 🧭 长期项目 · 该推一把` });
    head.onclick = () => { this.plugin.settings.projFolded = open; this.plugin.saveSoon(); this.render(); };
    if (!open) return;
    const todayIds = new Set(data.items.filter((i) => i.todayActs.length).map((i) => i.key));
    const doneToday = data.items.filter((i) => i.todayActs.some((a) => a.state === "done")).length;
    // 今天日记里归到各个项目的投入（写了时长按写的，没写的按 long-projects.js 的估算）
    const todays = (i) => i.activity.filter((a) => file && a.file.path === file.path && a.kind !== "提及");
    const spent = data.items.map((i) => ({ i, m: todays(i).reduce((s, a) => s + (a.spent || 0), 0), est: todays(i).some((a) => a.estimated) })).filter((x) => x.m).sort((a, b) => b.m - a.m);
    if (spent.length) list.createDiv({ cls: "naut-proj-note", text: "今天算进长期项目：" + spent.map((x) => `${x.i.short} ${x.est ? "约 " : ""}${x.m >= 60 ? (x.m / 60).toFixed(1) + "h" : x.m + "m"}`).join(" · "), attr: { title: "日记里命中项目「归类：」词的块；没写时长的每块按 15 分钟估" } });
    else if (todayIds.size) list.createDiv({ cls: "naut-proj-note", text: `今天挂在项目上的任务涉及 ${todayIds.size} 个项目${doneToday ? `，已推进 ${doneToday} 个` : ""}（上面带 🧭 的）` });
    // 时长目标（🎯10000h 这种）：累计多少了
    for (const i of data.items.filter((i) => i.goal && i.goal.kind === "时长" && i.hours)) {
      const h = i.hours.total;
      const aiH = i.hours.ai ? `，其中 🤖 Claude 协作 ${i.hours.ai.toFixed(1)}h` : "";
      list.createDiv({ cls: "naut-proj-note", text: `🎯 ${i.short}：累计 ${h >= 100 ? Math.round(h) : h.toFixed(1)} / ${i.goal.target.toLocaleString()} 小时（${(h / i.goal.target * 100).toFixed(2)}%${aiH}）` });
    }
    const rows = data.nudges.filter((n) => n.item.domain !== "外形穿搭").slice(0, 5);
    if (!rows.length) list.createDiv({ cls: "naut-proj-note", text: "没有逾期、快到期或冷掉的项目 👍" });
    for (const n of rows) {
      const i = n.item;
      const row = list.createDiv({ cls: "naut-row naut-proj" });
      row.createSpan({ cls: "naut-time naut-proj-why" + (/逾期/.test(n.reason) ? " is-late" : /剩/.test(n.reason) ? " is-soon" : ""), text: n.reason });
      const lab = row.createSpan({ cls: "naut-label", text: i.short, attr: { title: i.title } });
      lab.onclick = () => this.plugin.openLine(i.file, i.line);
      const add = row.createEl("button", { cls: "naut-proj-add", text: "＋" , attr: { title: "今天推进它：在今天日记里加一条带项目链接的 TODO" } });
      add.onclick = (e) => { e.stopPropagation(); LP.pushTodayModal(i, OB); };
    }
    const more = list.createDiv({ cls: "naut-proj-note naut-link", text: "打开长期项目看板 →" });
    more.onclick = () => { const f = this.app.metadataCache.getFirstLinkpathDest("长期项目", ""); if (f) this.app.workspace.getLeaf(false).openFile(f); };
  }
}

// ---------------- 插件 ----------------

module.exports = class NautilusSpiral extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
    this.states = new Map();   // path -> Map(label -> state)，用来发现「刚改成 DONE」
    this.core = { parseJournal, parseDuration, parseProgress, stripProgress, stripDuration, applyWork, workKey, schedule, normalize };   // 给「任务提醒」插件复用
    this.saveSoon = debounce(() => this.saveData(this.settings), 1000, true);
    this.refresh = debounce(() => { if (!this.dragging) this.views().forEach((v) => v.render()); }, 300, true);   // 正在拖把手时不重绘
    this.pruneDoneTimes();
    this.aiStorePath = `${this.manifest.dir}/ai-usage.json`;
    this.gameLogPath = `${this.manifest.dir}/game-log.json`;
    this.registerInterval(window.setInterval(() => this.pollGames(), 60 * 1000));

    this.registerView(VIEW_TYPE, (leaf) => new SpiralView(leaf, this));
    this.addRibbonIcon("orbit", "螺旋日程", () => this.activate());
    this.addCommand({ id: "open", name: "打开螺旋日程", callback: () => this.activate() });
    this.addCommand({ id: "open-today", name: "打开今天的日记（凌晨按日界算前一天）", callback: () => this.openToday() });
    this.addSettingTab(new SpiralSettings(this.app, this));

    // 在日历里点某一天（或打开任何一篇日记），螺旋跟着切到那一天
    this.registerEvent(this.app.workspace.on("file-open", (f) => {
      if (!(f instanceof TFile) || !f.path.startsWith(this.settings.folder + "/")) return;
      const d = moment(f.basename, this.settings.format, true);
      if (!d.isValid()) return;
      const offset = d.startOf("day").diff(this.today(), "days");
      for (const v of this.views()) if (v.offset !== offset) { v.offset = offset; v.render(); }
    }));
    this.registerEvent(this.app.vault.on("modify", (f) => this.onFileChange(f)));
    this.registerEvent(this.app.vault.on("create", (f) => this.onFileChange(f)));
    this.registerInterval(window.setInterval(() => this.refresh(), 60 * 1000));

    this.app.workspace.onLayoutReady(async () => {
      const f = this.app.vault.getAbstractFileByPath(this.journalPath(this.today()));
      if (f instanceof TFile) this.observe(f, await this.app.vault.read(f), false);
      if (!this.settings.autoOpened) {
        this.settings.autoOpened = true;
        this.saveSoon();
        this.activate();
      }
      // 启动页：今天的日记 + 左侧栏显示螺旋日程（其它插件恢复布局也在这时候，稍等一下再切，免得被盖掉）
      window.setTimeout(async () => {
        try {
          if (this.settings.openTodayOnStartup) await this.openToday();
          if (this.settings.revealOnStartup) await this.activate(false);
        } catch (e) { console.error("[螺旋日程] 启动页失败", e); }
      }, 600);
    });
  }

  // 长期项目数据：载入共用脚本，结果缓存 20 秒（日记每次保存都会重绘，不必每次全库扫）
  async projects() {
    try {
      const f = this.app.vault.getAbstractFileByPath(LP_SCRIPT);
      if (!(f instanceof TFile)) return null;
      if (!this._lp || this._lpMtime !== f.stat.mtime) {
        this._lp = new Function("app", "require", await this.app.vault.adapter.read(LP_SCRIPT))(this.app, require);
        this._lpMtime = f.stat.mtime;
        this._lpData = null;
      }
      // 第一次同步算；之后日记一改只标记「过期」，先用旧数据画，等你停手几秒再在空闲时重算（全库扫一遍要几百毫秒，
      // 以前每次保存都同步重算，会把编辑器卡住 —— ⌘/ 连按不动就是这个原因）
      if (!this._lpData) await this.recomputeProjects();
      else if (this._lpStale || Date.now() - this._lpAt > 120000) this.scheduleProjects();
      return { LP: this._lp, data: this._lpData };
    } catch (e) {
      console.error("[螺旋日程] 长期项目读取失败", e);
      return null;
    }
  }

  async recomputeProjects() {
    if (!this._lp) return;
    this._lpData = await this._lp.collect({ exclude: [] });
    this._lpAt = Date.now();
    this._lpStale = false;
  }
  scheduleProjects(delay = 4000) {
    window.clearTimeout(this._lpTimer);
    this._lpTimer = window.setTimeout(() => {
      const run = async () => { try { await this.recomputeProjects(); this.refresh(); } catch (e) { console.error("[螺旋日程] 长期项目重算失败", e); } };
      window.requestIdleCallback ? window.requestIdleCallback(run, { timeout: 3000 }) : run();
    }, delay);
  }

  // ---- 给 Telegram Inbox（自用版）用的：手机上问「现在该干嘛」、报「睡了 / 起了」 ----

  // 容量速览（和 KM 的 HUD 同一份内容）
  async capacityText() {
    const cfg = this.settings;
    const date = this.today();
    const dayKey = date.format(cfg.format);
    const file = this.app.vault.getAbstractFileByPath(this.journalPath(date));
    if (!(file instanceof TFile)) return `今天（${dayKey}）还没有日记`;
    const items = parseJournal(await this.app.vault.read(file), cfg);
    const nowM = moment();
    const now = normalize(nowM.hours() * 60 + nowM.minutes(), cfg);
    const bounds = (cfg.dayBounds || {})[dayKey] || {};
    applyWork(items, cfg, dayKey, now, 0, bounds);
    const plan = schedule(items, cfg, now, 0, bounds);
    const head = `可用 ${dur(plan.available)} · 待办 ${dur(plan.demand)}`;
    const lines = [plan.overflow ? `${head} · ⚠️ 超出 ${dur(plan.overflow)}` : `${head} · 富余 ${dur(plan.available - plan.demand)}`];
    const next = plan.queue.filter((t) => t.segments.length > t.workedN).slice(0, 5);
    if (next.length) lines.push("", "接下来：", ...next.map((t) => `${t.doing ? "进行中" : clock(t.segments[t.workedN][0])}  ${t.label}（${t.remaining < t.dur - 1 ? "剩 " + dur(t.remaining) : dur(t.dur)}）`));
    const over = plan.queue.filter((t) => t.overflow);
    if (over.length) lines.push("", "排不下：", ...over.map((t) => `· ${t.label}`));
    if (plan.suspended.length) lines.push("", "⏸ 挂起：" + plan.suspended.map((t) => t.label).join("、"));
    const tail = await this.dayTail(dayKey, items);
    if (tail.length) lines.push("", ...tail);
    return lines.join("\n");
  }

  // 这天的成绩单：做完几件、人机协作、游戏
  async dayTail(dayKey, items) {
    const out = [];
    const done = items.filter((i) => i.kind === "task" && i.state === "done").length;
    const open = items.filter((i) => i.kind === "task" && i.state === "open" && !i.container).length;
    out.push(`✅ 做完 ${done} 件 · 还有 ${open} 件没做完`);
    const ai = this.settings.showAi !== false && (await this.aiUsage()).days[dayKey];
    if (ai) out.push(`🤖 协作 ${dur(ai.wall)} · Claude 工时 ${dur(ai.agent)} · 产出 ${fmtTok(ai.out)} tok`);
    const games = this.settings.trackGames !== false && (await this.gameLog()).days[dayKey];
    if (games && games.length) out.push(`🎮 游戏 ${dur(unionMin(games))}`);
    return out;
  }

  // 「睡了」= 把这天的结束时间设成消息发出的时刻，还开着的工作时段在那一刻收掉；「起了」= 设这天的开始时间。
  // 时间按消息发出的时刻算（ms），不是 Obsidian 收到的时刻。返回一段回执
  async markDay(kind, ms = Date.now()) {
    const cfg = this.settings;
    const S = cfg.dayStart * 60, E = cfg.dayEnd * 60;
    const d = new Date(ms);
    if (kind === "wake") {
      // 起床算在日历上的这一天；比螺旋起点（dayStart）还早就按起点记
      const dayKey = fmtKey(d, cfg);
      const t = Math.max(S, Math.round((d.getHours() * 60 + d.getMinutes()) / 5) * 5);
      await this.setBounds(dayKey, "start", t);
      return `☀️ ${clock(t)} 开始\n\n` + (await this.capacityText());
    }
    const { key: dayKey, t: raw } = aiDay(ms, cfg);   // 凌晨睡的算前一天
    const work = (cfg.workLog || {})[dayKey] || {};
    for (const segs of Object.values(work)) for (const seg of segs) if (seg[1] == null) seg[1] = Math.max(seg[0], Math.round(raw));
    const t = Math.min(E, Math.max(S + 30, Math.round(raw / 5) * 5));
    await this.setBounds(dayKey, "end", t);
    const file = this.app.vault.getAbstractFileByPath(`${cfg.folder}/${dayKey}.md`);
    const items = file instanceof TFile ? parseJournal(await this.app.vault.read(file), cfg) : [];
    const b = cfg.dayBounds[dayKey] || {};
    return [`🌙 ${clock(t)} 收工 · 今天 ${clock(b.start ?? S)}–${clock(t)}`, ...(await this.dayTail(dayKey, items))].join("\n");
  }

  async setBounds(dayKey, kind, t) {
    const all = (this.settings.dayBounds ||= {});
    const b = (all[dayKey] ||= {});
    if (t == null) delete b[kind]; else b[kind] = t;
    if (!Object.keys(b).length) delete all[dayKey];
    await this.saveData(this.settings);
    this.refresh();
  }

  async gameLog() {
    if (!this._games) {
      try { this._games = JSON.parse(await this.app.vault.adapter.read(this.gameLogPath)); } catch (e) { this._games = { days: {} }; }
    }
    return this._games;
  }

  // 每分钟看一眼在不在玩：进程路径含 gameProcs 的词（Steam 游戏按 steamapps/common 下的文件夹名记），或者 gameFrontApps 在最前面
  async pollGames() {
    if (this.settings.trackGames === false || !(OB.Platform && OB.Platform.isDesktopApp)) return;
    try {
      const { execFile } = require("child_process");
      const run = (cmd, args) => new Promise((res) => execFile(cmd, args, { maxBuffer: 16e6 }, (e, out) => res(e ? "" : out)));
      const split = (s) => (s || "").split(/[,，]/).map((x) => x.trim()).filter(Boolean);
      const names = new Set();
      const procs = (await run("/bin/ps", ["-axo", "comm="])).split("\n");
      for (const term of split(this.settings.gameProcs)) {
        for (const p of procs) {
          if (!p.toLowerCase().includes(term.toLowerCase())) continue;
          const steam = /steamapps\/common\/([^/]+)/.exec(p);
          names.add(steam ? steam[1] : term);
        }
      }
      const fronts = split(this.settings.gameFrontApps);
      if (fronts.length) {
        const m = /"LSDisplayName"="([^"]*)"/.exec(await run("/bin/sh", ["-c", 'lsappinfo info -only name "$(lsappinfo front)"']));
        const f = m && fronts.find((x) => x.toLowerCase() === m[1].toLowerCase());
        if (f) names.add(f);
      }
      if (!names.size) return;
      const { key, t } = aiDay(Date.now(), this.settings);
      const log = await this.gameLog();
      const day = (log.days[key] ||= []);
      const now = Math.round(t);
      for (const n of names) {
        const last = day.filter((s) => s[2] === n).at(-1);
        if (last && now - last[1] <= 3) last[1] = now + 1;   // 一分钟看一次，隔得不远就接上
        else day.push([now, now + 1, n]);
      }
      await this.app.vault.adapter.write(this.gameLogPath, JSON.stringify(log));
      this.refresh();
    } catch (e) {
      console.error("[螺旋日程] 游戏时间记录失败", e);
    }
  }

  // 人机协作汇总：先用存下的（手机上也能看），再在后台读 Claude Code 日志更新，至多一分钟一次
  async aiUsage() {
    if (!this.aiStore) {
      try { this.aiStore = JSON.parse(await this.app.vault.adapter.read(this.aiStorePath)); } catch (e) { this.aiStore = { days: {} }; }
    }
    if (OB.Platform && OB.Platform.isDesktopApp && !this._aiBusy && Date.now() - (this._aiAt || 0) > 55000) this.scanAi();
    return this.aiStore;
  }

  async scanAi() {
    this._aiBusy = true;
    try {
      this._ai ||= new AiUsage(this.settings);
      // 头一回（或汇总格式升级后）把现存日志全读一遍补历史；之后重启只读最近改过的
      const upgrade = this.aiStore.v !== AI_STORE_V;
      const since = this.aiStore.backfilled && !upgrade ? Date.now() - (AI_FRESH_DAYS + 2) * 864e5 : 0;
      const touched = await this._ai.scan(this._ai.files.size ? Date.now() - 2 * 864e5 : since);
      const changed = this._ai.merge(this.aiStore, touched, upgrade) || !this.aiStore.backfilled || upgrade;
      this.aiStore.backfilled = true;
      this.aiStore.v = AI_STORE_V;
      if (changed) {
        await this.app.vault.adapter.write(this.aiStorePath, JSON.stringify(this.aiStore));
        this.refresh();
      }
    } catch (e) {
      console.error("[螺旋日程] 人机协作统计失败", e);
    } finally {
      this._aiBusy = false;
      this._aiAt = Date.now();
    }
  }

  views() {
    return this.app.workspace.getLeavesOfType(VIEW_TYPE).map((l) => l.view).filter((v) => v instanceof SpiralView);
  }

  // 「今天」的日记：凌晨 dayCutoff 点前还算前一天
  today() {
    const m = moment();
    const cutoff = this.settings.dayCutoff ?? Math.max(0, this.settings.dayEnd - 24);
    if (m.hours() * 60 + m.minutes() < cutoff * 60) m.subtract(1, "day");
    return m.startOf("day");
  }

  journalPath(m) {
    return `${this.settings.folder}/${m.format(this.settings.format)}.md`;
  }

  async activate(focus = true) {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeftLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE, active: focus });
    }
    if (focus) this.app.workspace.revealLeaf(leaf);
    else {
      // 只把左侧栏展开、切到螺旋日程这个标签，焦点留在日记上
      if (this.app.workspace.leftSplit.collapsed) this.app.workspace.leftSplit.expand();
      const group = leaf.parent;
      if (group && typeof group.selectTab === "function") group.selectTab(leaf);
      else this.app.workspace.revealLeaf(leaf);
    }
  }

  // 打开「今天」的日记：已经开着就切过去，当前标签是空白页就用它，否则开新标签；没有就建一篇
  async openToday() {
    const d = this.today();
    const path = this.journalPath(d);
    let file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      file = await this.app.vault.create(path, `---\njournal: 每日\njournal-date: ${d.format("YYYY-MM-DD")}\n---\n`);
    }
    let target = null;
    this.app.workspace.iterateRootLeaves((l) => { if (!target && l.view?.file?.path === path) target = l; });
    if (!target) {
      const cur = this.app.workspace.getMostRecentLeaf(this.app.workspace.rootSplit);
      target = cur && cur.view?.getViewType() === "empty" ? cur : this.app.workspace.getLeaf("tab");
      await target.openFile(file);
    }
    this.app.workspace.setActiveLeaf(target, { focus: true });
  }

  async onFileChange(f) {
    if (!(f instanceof TFile) || !f.path.startsWith(this.settings.folder + "/")) return;
    const content = await this.app.vault.read(f);
    this.observe(f, content, true);
    this._lpStale = true;
    this.scheduleProjects();
    if (this.views().some((v) => v.path() === f.path)) this.refresh();
  }

  // 对比上一次看到的状态（不写回日记）：
  //   · 待办变成 DONE：把「现在」记为完成时间
  //   · 今天的日记里，任务变成 DOING / 不再是 DOING：记一段工作时间（workLog）。中断再续 = 好几段；
  //     DOING 后面手写了开始时间按写的；改成 DONE 时手写了完成时间按写的
  observe(file, content, record) {
    const items = parseJournal(content, this.settings);
    const cur = new Map();
    for (const i of items) if (i.kind === "task") cur.set(i.label, { state: i.state, doing: i.doing && i.state === "open", startedAt: i.startedAt, doneAt: i.doneAt, dur: i.dur });
    const prev = this.states.get(file.path);
    this.states.set(file.path, cur);
    const nowM = moment();
    const now = normalize(nowM.hours() * 60 + nowM.minutes(), this.settings);
    const isToday = file.basename === this.today().format(this.settings.format);
    let changed = false;

    if (isToday) {
      const log = (this.settings.workLog ||= {});
      const work = (log[file.basename] ||= {});
      const openSeg = (k) => (work[k] || []).find((x) => x[1] == null);
      const stop = (k, at) => {
        const seg = openSeg(k);
        if (!seg) return;
        seg[1] = Math.max(seg[0], at);
        if (seg[1] - seg[0] < 1) work[k].splice(work[k].indexOf(seg), 1);   // 不到一分钟的不记
        if (!work[k].length) delete work[k];
        changed = true;
      };
      if (!record || !prev) {
        // 刚启动：上次没收尾的时段，对应的任务已经不在做了，按半小时封顶收掉
        const doingKeys = new Set([...cur].filter(([, c]) => c.doing).map(([l]) => workKey(l)));
        for (const k of Object.keys(work)) if (openSeg(k) && !doingKeys.has(k)) stop(k, Math.min(now, openSeg(k)[0] + 30));
        // 正在做、但没有开着的时段（Obsidian 关着的时候改成 DOING 的）：写了开始时间按写的，没写从现在算
        for (const [label, c] of cur) if (c.doing && !openSeg(workKey(label))) { (work[workKey(label)] ||= []).push([c.startedAt ?? now, null]); changed = true; }
      } else {
        // 进行中的任务改了字：把记下的时段跟着挪到新名字下面，算同一件事
        const gone = [...prev].filter(([l, p]) => p.doing && !cur.has(l)).map(([l]) => l);
        const born = [...cur].filter(([l, c]) => c.doing && !prev.has(l)).map(([l]) => l);
        const renamed = gone.length === 1 && born.length === 1 ? [workKey(gone[0]), workKey(born[0])] : null;
        if (renamed && renamed[0] !== renamed[1] && work[renamed[0]]) {
          work[renamed[1]] = [...(work[renamed[1]] || []), ...work[renamed[0]]];
          delete work[renamed[0]];
          changed = true;
        }
        for (const [label, c] of cur) {
          const k = workKey(label), p = prev.get(label);
          if (c.doing && !openSeg(k) && !(renamed && renamed[1] === k && work[k])) { (work[k] ||= []).push([c.startedAt ?? now, null]); changed = true; }
          if (c.doing && c.startedAt != null && openSeg(k) && openSeg(k)[0] !== c.startedAt && (!p || p.startedAt !== c.startedAt)) { openSeg(k)[0] = c.startedAt; changed = true; }
          if (!c.doing && p && p.doing) stop(k, c.state === "done" && c.doneAt != null ? c.doneAt : now);
        }
        // 进行中的任务行没了（删了 / 挪去明天）：收掉。隔了 6 小时以上多半是睡了一觉才挪的，按预估时长封顶
        if (!renamed) for (const l of gone) {
          const k = workKey(l), seg = openSeg(k);
          if (seg) stop(k, now - seg[0] > 360 ? seg[0] + prev.get(l).dur : now);
        }
      }
      if (!Object.keys(work).length) delete log[file.basename];
    }

    if (record && prev) {
      const day = (this.settings.doneTimes[file.basename] ||= {});
      for (const [label, c] of cur) {
        if (c.state === "done" && prev.get(label)?.state === "open" && day[label] == null) { day[label] = now; changed = true; }
        if (c.state === "open" && day[label] != null) { delete day[label]; changed = true; }
      }
    }
    if (changed) this.saveSoon();
  }

  pruneDoneTimes() {
    const cutoff = moment().subtract(45, "days");
    for (const store of [this.settings.doneTimes, (this.settings.workLog ||= {})]) for (const k of Object.keys(store)) {
      const d = moment(k, this.settings.format, true);
      if (!d.isValid() || d.isBefore(cutoff) || !Object.keys(store[k]).length) delete store[k];
    }
  }

  async openLine(file, line) {
    const leaf = this.app.workspace.getLeaf(false);
    await leaf.openFile(file, { eState: { line } });
  }

  onunload() {}
};

class SpiralSettings extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;
    const num = (name, desc, key, min, max) => new Setting(containerEl).setName(name).setDesc(desc).addText((t) => t
      .setValue(String(s[key]))
      .onChange(async (v) => {
        const n = Number(v);
        if (!Number.isFinite(n) || n < min || n > max) return;
        s[key] = n;
        await this.plugin.saveData(s);
        this.plugin.refresh();
      }));
    num("一天从几点开始", "螺旋的起点（0–23）", "dayStart", 0, 23);
    num("一天到几点结束", "螺旋和排程到几点为止，超过 24 表示次日凌晨，比如 31 = 次日早上 7 点", "dayEnd", 12, 36);
    num("日记日期分界（点）", "凌晨几点前还算前一天的日记，比如 7 = 早上 7 点前都算昨天", "dayCutoff", 0, 12);
    num("默认任务时长（分钟）", "没写时长的任务按这个算", "defaultDur", 1, 240);
    const text = (name, desc, key) => new Setting(containerEl).setName(name).setDesc(desc).addText((t) => t
      .setValue(s[key])
      .onChange(async (v) => { s[key] = v.trim(); await this.plugin.saveData(s); this.plugin.refresh(); }));
    text("日记文件夹", "", "folder");
    text("日记文件名格式", "moment.js 格式", "format");
    text("重要标记", "任务里含有这些文字就标成红色，用逗号分隔", "priorityMarkers");
    new Setting(containerEl).setName("启动时打开今天的日记").setDesc("按上面的「日记日期分界」算今天：已经开着就切过去，没开就开一个新标签，还没有这篇就新建")
      .addToggle((t) => t.setValue(s.openTodayOnStartup !== false).onChange(async (v) => { s.openTodayOnStartup = v; await this.plugin.saveData(s); }));
    new Setting(containerEl).setName("启动时左侧栏显示螺旋日程").setDesc("展开左侧栏并切到螺旋日程标签（Wiki、文件列表等标签还在，点图标切换）")
      .addToggle((t) => t.setValue(s.revealOnStartup !== false).onChange(async (v) => { s.revealOnStartup = v; await this.plugin.saveData(s); }));
    new Setting(containerEl).setName("显示人机协作").setDesc("读 Claude Code 的本地会话日志（~/.claude/projects），在容量条下面显示当天协作时长、token 产出，螺旋内圈画出 Claude 在干活的时段；汇总另存在插件目录的 ai-usage.json")
      .addToggle((t) => t.setValue(s.showAi !== false).onChange(async (v) => { s.showAi = v; await this.plugin.saveData(s); this.plugin.refresh(); }));
    new Setting(containerEl).setName("记录游戏时间").setDesc("每分钟看一眼在不在玩，螺旋最里面一圈画绿线；记在插件目录的 game-log.json。只在 Obsidian 开着时记录")
      .addToggle((t) => t.setValue(s.trackGames !== false).onChange(async (v) => { s.trackGames = v; await this.plugin.saveData(s); this.plugin.refresh(); }));
    text("游戏进程关键词", "进程路径里含这些词就算在玩，逗号分隔；steamapps/common 会按游戏文件夹名分开记", "gameProcs");
    text("在最前面才算的 App", "这些 App 常驻后台，只有切到最前面时才算游戏时间，比如 Steam 客户端", "gameFrontApps");
    new Setting(containerEl).setName("显示长期项目提醒").setDesc("在今天的列表底部显示「🧭 长期项目 · 该推一把」，数据和「长期项目」看板同一份（scripts/long-projects.js）")
      .addToggle((t) => t.setValue(s.showProjects !== false).onChange(async (v) => { s.showProjects = v; await this.plugin.saveData(s); this.plugin.refresh(); }));
  }
}

module.exports.core = { parseJournal, parseDuration, parseProgress, applyWork, workKey, schedule, normalize, DEFAULTS, AiUsage, fmtTok, unionMin };
