const { Plugin, PluginSettingTab, Setting, TFile, Notice, moment, debounce } = require("obsidian");
const { execFile } = require("child_process");

// 所有分析都借螺旋日程插件（nautilus-spiral）的：解析、排程、容量、日期分界
const NAUTILUS = "nautilus-spiral";

const DEFAULTS = {
  enabled: true,
  upcoming: true, upcomingMin: 10,          // 事件 / 钉了时间的待办，提前几分钟提醒
  pinnedLate: true, pinnedLateMin: 15,      // 钉了时间的待办过点多久还没开始就提醒
  doing: true, doingRepeatMin: 30,          // DOING 超过预估后每隔多久再提醒；没写时长的按 1 小时算
  congrats: true,                           // 完成时祝贺，带用时、和预估比、下一件
  overflow: true, overflowStepMin: 30,      // 今天排不下时预警，超出量每再涨多少分钟提醒一次
  nudge: true, nudgeIdleMin: 60, nudgeEveryMin: 90,   // 没有进行中的事、又一阵子没动静时，提示下一件
  brief: true,                              // 当天第一次动日记时发一条今日简报
  endOfDay: true, endOfDayMin: 60,          // 一天结束前多久提醒收尾
  snoozeUntil: 0,
  day: null,                                // 以下是当天的运行状态，换天清空
  state: null,
};
const NO_DUR_DOING_MIN = 60;

// 通知类别：用来「一键清掉同一类」。命令 id 是 clear-<key>，可以在 Obsidian 里绑快捷键，
// 也可以从外部用 `obsidian command id=nautilus-notify:clear-<key>`（比如 Keyboard Maestro 的全局快捷键）
const KINDS = [
  { key: "done",     name: "完成" },
  { key: "brief",    name: "今日简报" },
  { key: "upcoming", name: "快开始了" },
  { key: "late",     name: "过点了" },
  { key: "doing",    name: "做了很久" },
  { key: "overflow", name: "排不下" },
  { key: "nudge",    name: "接下来做什么" },
  { key: "eod",      name: "收尾" },
  { key: "test",     name: "测试" },
];
const kindName = (key) => KINDS.find((k) => k.key === key)?.name ?? key;

const pad = (n) => String(n).padStart(2, "0");
const clock = (t) => `${pad(Math.floor(t / 60) % 24)}:${pad(Math.round(t % 60))}`;
function dur(m) {
  m = Math.max(0, Math.round(m));
  const h = Math.floor(m / 60), r = m % 60;
  return h ? (r ? `${h}h${r}m` : `${h}h`) : `${r}m`;
}
// 同一条任务的稳定标识：去掉空格和标点（盘古之类的排版插件会插空格）
const keyOf = (label) => label.replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();
const stateOf = (t) => (t.state === "done" ? "done" : t.doing ? "doing" : t.state === "open" ? "open" : null);

module.exports = class NautilusNotify extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
    this.saveSoon = debounce(() => this.saveData(this.settings), 2000, true);
    this.idleSec = 0;
    this.live = [];   // 这次运行里发出、还没撤回的通知 { n, kind }；Obsidian 重启前发的拿不到，只能用系统的「全部清除」
    this.addSettingTab(new NotifySettings(this.app, this));

    this.addCommand({ id: "brief", name: "发一条今日简报", callback: () => this.tick({ forceBrief: true }) });
    this.addCommand({ id: "snooze", name: "暂停提醒 1 小时", callback: () => this.snooze(60) });
    this.addCommand({ id: "resume", name: "恢复提醒", callback: () => { this.settings.snoozeUntil = 0; this.saveSoon(); new Notice("任务提醒已恢复"); } });
    this.addCommand({ id: "test", name: "发一条测试提醒", callback: () => this.send("🔔 任务提醒", "通知横幅能正常显示", { kind: "test", force: true, sound: true }) });
    this.addCommand({ id: "clear-latest-kind", name: "清除通知：和最新一条同类的全部", callback: () => this.clear(this.live[this.live.length - 1]?.kind, true) });
    this.addCommand({ id: "clear-all", name: "清除通知：全部任务提醒", callback: () => this.clear(null, true) });
    for (const k of KINDS) {
      this.addCommand({ id: `clear-${k.key}`, name: `清除通知：所有「${k.name}」`, callback: () => this.clear(k.key, true) });
    }

    const onChange = debounce(() => this.tick({ fromEdit: true }), 1500, true);
    this.registerEvent(this.app.vault.on("modify", (f) => { if (this.isToday(f)) onChange(); }));
    this.registerInterval(window.setInterval(() => this.tick(), 30 * 1000));
    this.registerInterval(window.setInterval(() => this.readIdle(), 60 * 1000));
    this.app.workspace.onLayoutReady(() => { this.readIdle(); this.tick(); });
  }

  nautilus() {
    const p = this.app.plugins.plugins[NAUTILUS];
    return p && p.core ? p : null;
  }
  isToday(f) {
    const np = this.nautilus();
    return np && f instanceof TFile && f.path === np.journalPath(np.today());
  }
  snooze(min) {
    this.settings.snoozeUntil = Date.now() + min * 60 * 1000;
    this.saveSoon();
    new Notice(`任务提醒暂停到 ${moment(this.settings.snoozeUntil).format("HH:mm")}`);
  }

  // 键盘鼠标多久没动（秒）；人不在电脑前时不发「下一件」这类可有可无的提醒
  readIdle() {
    execFile("ioreg", ["-c", "IOHIDSystem"], (err, out) => {
      const m = !err && /"HIDIdleTime" = (\d+)/.exec(out);
      if (m) this.idleSec = Math.floor(+m[1] / 1e9);
    });
  }

  send(title, body, { kind = "other", file, line, sound = false, force = false } = {}) {
    if (!force && (!this.settings.enabled || Date.now() < this.settings.snoozeUntil)) return;
    try {
      const n = new Notification(title, { body, silent: !sound });
      const rec = { n, kind };
      this.live.push(rec);
      n.onclose = () => { this.live = this.live.filter((x) => x !== rec); };
      n.onclick = () => {
        window.focus();
        if (file) this.app.workspace.getLeaf(false).openFile(file, line != null ? { eState: { line } } : undefined);
      };
    } catch (e) {
      new Notice(`${title}\n${body}`, 8000);
    }
  }

  // 撤回通知（同时从通知中心删掉）；kind 为空 = 全部
  clear(kind, notice = false) {
    if (kind === undefined) { if (notice) new Notice("这次启动后还没有发过任务提醒通知"); return; }
    const hit = this.live.filter((x) => !kind || x.kind === kind);
    for (const x of hit) { try { x.n.close(); } catch (e) { /* 已经没了 */ } }
    this.live = this.live.filter((x) => !hit.includes(x));
    if (notice) new Notice(hit.length ? `已清除 ${hit.length} 条${kind ? `「${kindName(kind)}」` : "任务提醒"}通知` : `没有${kind ? `「${kindName(kind)}」` : ""}通知可清除`);
  }

  async tick({ fromEdit = false, forceBrief = false } = {}) {
    const np = this.nautilus();
    if (!np) return;
    const s = this.settings;
    const cfg = np.settings;
    const core = np.core;
    const day = np.today();
    const dayKey = day.format(cfg.format);
    const file = this.app.vault.getAbstractFileByPath(np.journalPath(day));
    if (!(file instanceof TFile)) return;

    if (s.day !== dayKey) { s.day = dayKey; s.state = null; }
    const nowM = moment();
    const now = core.normalize(nowM.hours() * 60 + nowM.minutes(), cfg);
    const E = cfg.dayEnd * 60;
    const fresh = !s.state;
    const st = (s.state ||= { sent: {}, states: {}, doingSeen: {}, doingLevel: {}, overflowSent: 0, lastActivity: now, lastNudge: 0, briefSent: false });
    const once = (key) => (st.sent[key] ? false : (st.sent[key] = true));

    const content = await this.app.vault.cachedRead(file);
    const lines = content.split("\n");
    const items = core.parseJournal(content, cfg);
    const plan = core.schedule(items, cfg, now, 0);
    const doneTimes = cfg.doneTimes?.[dayKey] || {};
    const tasks = items.filter((t) => stateOf(t) && (t.kind === "task" || t.pinned));
    const doneTasks = tasks.filter((t) => t.state === "done");
    const nextUp = plan.queue.find((t) => t.segments.length && !t.doing);
    const opts = (t) => ({ file, line: t?.line });

    // ---------- 状态变化：完成、开始做 ----------
    const cur = {};
    for (const t of tasks) cur[keyOf(t.label)] = stateOf(t);
    const newlyDone = [];
    let changed = false;
    for (const t of tasks) {
      const k = keyOf(t.label), was = st.states[k], is = cur[k];
      if (was !== is) changed = true;
      if (fresh) continue;
      if (is === "doing" && was !== "doing" && t.startedAt == null) st.doingSeen[k] = now;
      if (is === "done" && was !== "done") {
        // 原本就在清单里、刚打勾的；或者刚写下的 DONE 带着 15 分钟内的完成时间
        const at = t.doneAt ?? t.stamp ?? doneTimes[t.label];
        if (was === "open" || was === "doing" || (was === undefined && at != null && now - at <= 15)) newlyDone.push(t);
      }
    }
    st.states = cur;
    if (changed && !fresh) st.lastActivity = now;

    if (s.congrats && newlyDone.length) {
      const total = doneTasks.length;
      const openLeft = plan.queue.length;
      if (!openLeft && total >= 3) {
        this.send("🏁 今天的待办全部清空！", `一共完成 ${total} 件。辛苦了 🎉`, { ...opts(newlyDone[0]), kind: "done", sound: true });
      } else if (newlyDone.length === 1) {
        const t = newlyDone[0];
        const parts = [];
        if (t.actual) {
          const used = t.actual[1] - t.actual[0];
          parts.push(`用时 ${dur(used)}`);
          const est = core.parseDuration(lines[t.line].replace(/\d{1,2}[:：]\d{2}\s*[-–~～到至]\s*\d{1,2}[:：]\d{2}/, ""));
          if (est) parts.push(used <= est ? `比预估快 ${dur(est - used)} 👍` : `比预估多 ${dur(used - est)}`);
        }
        parts.push(`今天第 ${total} 件`);
        if (nextUp) parts.push(`下一件：${nextUp.label}（${dur(nextUp.dur)}）`);
        this.send(`🎉 完成：${t.label}`, parts.join(" · "), { ...opts(t), kind: "done", sound: true });
      } else {
        this.send(`🎉 一口气完成 ${newlyDone.length} 件`, `${newlyDone.map((t) => t.label).join("、")} · 今天第 ${total} 件${nextUp ? ` · 下一件：${nextUp.label}` : ""}`, { ...opts(newlyDone[0]), kind: "done", sound: true });
      }
    }

    // ---------- 今日简报：当天第一次动日记时 ----------
    if (s.brief && (forceBrief || (fromEdit && !st.briefSent))) {
      st.briefSent = true;
      const events = items.filter((i) => i.kind === "event" && i.state !== "done" && i.start >= now).sort((a, b) => a.start - b.start);
      const parts = [`待办 ${plan.queue.length} 件，需要 ${dur(plan.demand)}，可用 ${dur(plan.available)}`];
      if (plan.overflow) parts.push(`⚠️ 超出 ${dur(plan.overflow)}`);
      if (events.length) parts.push(`固定：${events.slice(0, 3).map((e) => `${clock(e.start)} ${e.label}`).join("，")}`);
      if (nextUp) parts.push(`先做：${nextUp.label}`);
      this.send(`☀️ 今天的螺旋（${day.format("M月D日")}）`, parts.join(" · "), { file, kind: "brief", force: forceBrief });
    }

    // ---------- 快开始的事件 / 钉了时间的待办 ----------
    for (const e of items.filter((i) => i.kind === "event" && i.state !== "done")) {
      const until = e.start - now;
      if (s.upcoming && until > 0 && until <= s.upcomingMin && once(`up|${e.start}|${keyOf(e.label)}`)) {
        const range = e.pinned ? clock(e.start) : `${clock(e.start)}–${clock(e.end)}`;
        this.send(`⏰ ${Math.round(until)} 分钟后`, `${range} ${e.label}${e.pinned ? "（待办）" : ""}`, { ...opts(e), kind: "upcoming", sound: true });
      }
      if (s.pinnedLate && e.pinned && e.state === "open" && !e.doing && now - e.start >= s.pinnedLateMin && now - e.start < 180 && once(`late|${e.start}|${keyOf(e.label)}`)) {
        this.send("⌛ 过点了", `${clock(e.start)} ${e.label} · 已经过了 ${dur(now - e.start)}，还没开始`, { ...opts(e), kind: "late" });
      }
    }

    // ---------- 做太久的 DOING ----------
    if (s.doing) {
      for (const t of tasks.filter((x) => x.state === "open" && x.doing)) {
        const k = keyOf(t.label);
        const start = t.startedAt ?? st.doingSeen[k];
        if (start == null) continue;
        const explicit = core.parseDuration(lines[t.line] || "") != null;
        const limit = explicit ? t.dur : Math.max(t.dur, NO_DUR_DOING_MIN);
        const elapsed = now - start;
        if (elapsed <= limit) continue;
        const level = Math.floor((elapsed - limit) / s.doingRepeatMin);
        if (level > (st.doingLevel[k] ?? -1)) {
          st.doingLevel[k] = level;
          const est = explicit ? `预估 ${dur(t.dur)}，` : "";
          const tip = level >= 2 ? " 要不要先收个尾，或者拆成小块？" : "";
          this.send("🔥 做了很久了", `${t.label}：${est}已经做了 ${dur(elapsed)}。${tip}`, { ...opts(t), kind: "doing", sound: level === 0 });
        }
      }
    }

    // ---------- 容量预警 ----------
    if (s.overflow) {
      if (!plan.overflow) st.overflowSent = 0;
      else if (plan.overflow >= 15 && plan.overflow >= st.overflowSent + (st.overflowSent ? s.overflowStepMin : 0)) {
        st.overflowSent = plan.overflow;
        const over = plan.queue.filter((t) => t.overflow).map((t) => t.label);
        this.send("⚠️ 今天排不下了", `待办 ${dur(plan.demand)}，剩余可用 ${dur(plan.available)}，超出 ${dur(plan.overflow)}${over.length ? ` · 排不下：${over.slice(0, 3).join("、")}` : ""} · ⌃⌘M 可以挪到明天`, { file, kind: "overflow" });
      }
    }

    // ---------- 下一件：没在做事、一阵子没动静、人在电脑前 ----------
    const hasDoing = tasks.some((t) => t.state === "open" && t.doing);
    const eventSoon = items.some((i) => i.kind === "event" && i.state !== "done" && i.start > now && i.start - now <= 20);
    if (s.nudge && nextUp && !hasDoing && !eventSoon && this.idleSec < 300
        && now - st.lastActivity >= s.nudgeIdleMin && now - st.lastNudge >= s.nudgeEveryMin) {
      st.lastNudge = now;
      this.send("🧭 接下来做什么？", `现在没有进行中的事。按螺旋，下一件是：${nextUp.label}（${dur(nextUp.dur)}）· 今天还剩 ${dur(plan.available)} 可用`, { ...opts(nextUp), kind: "nudge" });
    }

    // ---------- 收尾 ----------
    if (s.endOfDay && plan.queue.length && E - now > 0 && E - now <= s.endOfDayMin && once("eod")) {
      this.send(`🌙 今天还剩 ${dur(E - now)}`, `还有 ${plan.queue.length} 件没做完（${dur(plan.demand)}）· ⌃⌘M 挪到明天`, { file, kind: "eod" });
    }

    this.saveSoon();
  }
};

class NotifySettings extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    const { containerEl } = this;
    const s = this.plugin.settings;
    containerEl.empty();
    const save = async () => { await this.plugin.saveData(s); };
    const toggle = (name, desc, key) => new Setting(containerEl).setName(name).setDesc(desc).addToggle((t) => t.setValue(s[key]).onChange(async (v) => { s[key] = v; await save(); }));
    const num = (name, key) => new Setting(containerEl).setName(name).addText((t) => t.setValue(String(s[key])).onChange(async (v) => { const n = +v; if (n > 0) { s[key] = n; await save(); } }));
    toggle("总开关", "关掉后所有提醒都不发（命令面板里也可以「暂停提醒 1 小时」）", "enabled");
    toggle("快开始的事件", "事件和钉了时间的待办，开始前提醒", "upcoming");
    num("　提前几分钟", "upcomingMin");
    toggle("过点没开始", "钉了时间的待办过点还没开始", "pinnedLate");
    num("　过点多久提醒（分钟）", "pinnedLateMin");
    toggle("做太久的 DOING", "超过预估就提醒；没写时长的按 1 小时算", "doing");
    num("　之后每隔几分钟再提醒", "doingRepeatMin");
    toggle("完成祝贺", "打勾时祝贺，附用时、和预估比、今天第几件、下一件", "congrats");
    toggle("排不下预警", "今天的待办超出剩余可用时间时提醒", "overflow");
    num("　超出量再涨多少分钟再提醒", "overflowStepMin");
    toggle("下一件", "没有进行中的事、一阵子没动静、人在电脑前时，提示螺旋上的下一件", "nudge");
    num("　多久没动静算闲下来（分钟）", "nudgeIdleMin");
    num("　两次提示至少间隔（分钟）", "nudgeEveryMin");
    toggle("今日简报", "当天第一次动日记时，发一条今天的待办、容量和固定事件", "brief");
    toggle("收尾提醒", "一天结束前提醒还剩几件没做", "endOfDay");
    num("　结束前多久（分钟）", "endOfDayMin");
  }
}
