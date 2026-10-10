const { Plugin, PluginSettingTab, Setting, TFile, Notice, moment, debounce, requestUrl } = require("obsidian");
const { execFile, spawn } = require("child_process");

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
  // ---- 训练提醒：读 训练计划 里的「周模板」，不依赖螺旋日程 ----
  workout: true,
  workoutAt: "22:00",                       // 开练提醒；休息日断档太久也在这时提醒
  workoutChaseAt: "00:30",                  // 当天主要训练还没打勾就追一条（日界之前都算当天）；周日这时发周复盘
  workoutGapDays: 2,                        // 连着几天没练算断档
  weigh: true,
  weighDays: "一,三,五,日",                  // 称重日：当天第一次动日记时提醒
  review: true,                             // 周日周复盘
  planPath: "健康/训练计划.md",
  weightPath: "健康/体重记录.md",
  dashboardPath: "健康/力量训练与健康.md",
  wDay: null,
  wState: null,
  // ---- 人不在电脑前时转发到 Telegram ----
  tgAway: true,
  tgAwayMin: 5,                             // 键盘鼠标多久没动算不在（锁屏直接算不在）
  tgChatId: "",                             // 空着就用 Telegram Inbox 插件记下的主人 chat id
  keepAwakeAC: true,                        // 插电时不让 Mac 闲置睡眠，屏幕照样息屏
  tgReportTimes: "12:00,18:00,22:00",       // 每天定时把螺旋日程图文版推到 Telegram（不管人在不在）
  tgReportSent: {},                         // { "2026-10-10 12:00": true }，只留最近几天
  pushWorkout: true, pushWorkoutAt: "08:00", // 健身早报：今天练什么、本周练了几天、要不要称重
  pushStale: true, pushStaleAt: "23:00", staleDays: 3,   // 拖了几天以上的 TODO，每件带按钮
  staleMsg: null,
  pushCards: true, pushCardsAt: "12:00",    // Anki 到期卡片数
  pushPeriod: true, pushPeriodAt: "12:00", periodPath: "健康/经期记录.md", periodWho: "TA",
  pushInsight: true, pushInsightAt: "21:30", insightPath: "计划与总结/周洞察.md",   // 每周日
  claudePath: "~/.local/bin/claude",
  comfort: true, comfortProfile: "健康/陪伴档案.md",   // Telegram 里说累、难受、开心时陪你聊
  chitchat: true,                           // 哈喽、呱、谢谢：马上回一句
  chatIdleMin: 20,                          // 自动进入的对话模式多久没说话就回到记录模式
  profileUpdate: true, profileUpdateAt: "22:30", profileUseChat: true,   // 每周日更新陪伴档案的「🔄 近况」
  profileReportPath: "计划与总结/库周报.md", projectReviewDir: "计划与总结/长期项目复盘",
  chatMemory: [], profileSugs: null, profileUpdatedAt: 0,
  chat: null,                               // 当前这段对话（对话模式）
};
const NO_DUR_DOING_MIN = 60;

// 训练项目关键词：和看板（力量训练与健康）认的一致；「锻炼」「健身」只在打了勾的行里算
const EX_WORDS = ["引体向上", "俯卧撑", "仰卧起坐", "深蹲", "分腿蹲", "硬拉", "平板支撑", "卷腹", "静态悬挂", "静态悬垂",
  "卧推", "推举", "划船", "侧平举", "弯举", "弓步", "臀桥", "跑步", "慢跑", "快走", "有氧", "跳绳", "游泳", "篮球", "锻炼", "健身"];
const CARDIO = ["跑步", "慢跑", "快走", "有氧", "跳绳", "游泳", "篮球"];
const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const DONE_RE = /^\s*-\s+(?:\[[xX]\]|DONE)\s/;
const exWords = (s) => EX_WORDS.filter((w) => s.includes(w));
const doneExLines = (content) => content.split("\n").filter((l) => DONE_RE.test(l) && !/#card\b/.test(l) && exWords(l).length);
// 情绪话：Telegram 陪聊的触发词，也用来从日记里捞「最近说过的类似的话」；FEEL_SKIP 先去掉容易误判的词
const FEEL_RE = /(好?累|难受|好?烦|崩溃|焦虑|难过|伤心|想哭|哭了|emo|撑不住|不想活|想死|没意思|好丧|郁闷|压力好?大|心累|孤独|迷茫|自我怀疑|痛苦|绝望|委屈|失眠|睡不着|不开心|抑郁|好废|想她|想你了|好想你|想宝宝|想女朋友)/i;
const HAPPY_RE = /(好?开心|太好了|太棒了|好棒|好耶|耶+[!！~～]*$|搞定了?|成了|做完了|哈哈哈+|嘿嘿|nice|好爽|赢了|过了|激动|兴奋|呱)/i;
const FEEL_SKIP = /累计|积累|累积|麻烦|烦请|没意思的话|成了一个|过了一遍/g;
const s_keepChat = (p) => p.settings.profileUpdate && p.settings.profileUseChat;
const toMin = (hhmm) => { const m = /^(\d{1,2})[:：](\d{2})$/.exec(String(hhmm).trim()); return m ? +m[1] * 60 + +m[2] : null; };

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
  { key: "workout",  name: "训练" },
  { key: "weigh",    name: "称重" },
  { key: "review",   name: "周复盘" },
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
    this.addCommand({ id: "workout-today", name: "训练：今天练什么（发一条提醒）", callback: () => this.workoutTick({ force: "start" }) });
    this.addCommand({ id: "workout-write", name: "训练：把今天的训练待办写进日记", callback: () => this.openTodayWorkout(true) });
    this.addCommand({ id: "workout-review", name: "训练：本周复盘（发一条提醒）", callback: () => this.workoutTick({ force: "review" }) });

    const onChange = debounce(() => this.tick({ fromEdit: true }), 1500, true);
    this.registerEvent(this.app.vault.on("modify", (f) => { if (this.isToday(f)) onChange(); }));
    this.registerInterval(window.setInterval(() => this.tick(), 30 * 1000));
    this.registerInterval(window.setInterval(() => this.readIdle(), 60 * 1000));
    this.addCommand({ id: "tg-test", name: "发一条测试提醒到 Telegram", callback: async () => {
      new Notice((await this.tg("🔔 任务提醒", "Telegram 转发能正常收到")) ? "已发到 Telegram" : "没发出去：先给 Telegram bot 发一条消息，让它记下你的 chat id（详情看控制台）");
    } });
    this.addCommand({ id: "push-workout", name: "Telegram：发今天的健身早报", callback: () => this.pushWorkout() });
    this.addCommand({ id: "push-stale", name: "Telegram：发拖了好几天的任务", callback: async () => { await this.pushStale() || new Notice("今天日记里没有拖了这么久的任务"); } });
    this.addCommand({ id: "push-cards", name: "Telegram：发闪卡到期数", callback: () => this.pushCards() });
    this.addCommand({ id: "profile-update", name: "陪伴档案：现在更新「近况」并发到 Telegram", callback: () => { new Notice("在更新陪伴档案（要一两分钟），好了会发到 Telegram"); this.profileUpdate({ manual: true }).then((r) => r.ok || new Notice(r.msg)); } });
    this.addCommand({ id: "push-insight", name: "Telegram：现在写这周的周洞察", callback: () => { new Notice("在写周洞察，写好直接发到 Telegram（要一两分钟）"); this.pushInsight(true); } });
    this.addCommand({ id: "tg-report", name: "把螺旋日程图文版发到 Telegram", callback: async () => {
      new Notice((await this.reportTick(true)) ? "已发到 Telegram" : "没发出去（螺旋日程没开，或还没有 chat id）");
    } });
    this.keepAwake();
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

  // 键盘鼠标多久没动（秒）；人不在电脑前时不发「下一件」这类可有可无的提醒，其余的转发到 Telegram
  readIdle() {
    execFile("ioreg", ["-c", "IOHIDSystem"], (err, out) => {
      const m = !err && /"HIDIdleTime" = (\d+)/.exec(out);
      if (m) this.idleSec = Math.floor(+m[1] / 1e9);
    });
    // 锁屏时 Root 下会多出 CGSSessionScreenIsLocked = Yes
    execFile("ioreg", ["-n", "Root", "-d1"], (err, out) => {
      if (!err) this.locked = /"CGSSessionScreenIsLocked"\s*=\s*Yes/.test(out);
    });
  }
  away() { return this.locked || this.idleSec >= this.settings.tgAwayMin * 60; }   // 息屏一定是先没动够了时间，所以按没动的时长算就够

  // ---------- 人不在电脑前：转发到 Telegram（借 Telegram Inbox 插件的 bot token 和它记下的 chat id） ----------
  tgTarget() {
    const tp = this.app.plugins.plugins["telegram-inbox-local"];
    const token = tp?.settings?.token;
    const owner = tp?.settings?.owner_chat_id;
    if (owner && String(owner) !== String(this.settings.tgChatId)) { this.settings.tgChatId = String(owner); this.saveSoon(); }
    return token && this.settings.tgChatId ? { token, chat: this.settings.tgChatId } : null;
  }
  async tg(title, body, { html = false, markup = null } = {}) {
    const t = this.tgTarget();
    if (!t) { console.warn("[nautilus-notify] 还没有 Telegram chat id：给 bot 发一条消息就会记下"); return false; }
    try {
      await requestUrl({
        url: `https://api.telegram.org/bot${t.token}/sendMessage`, method: "POST", contentType: "application/json",
        body: JSON.stringify({ chat_id: t.chat, text: body ? `${title}\n${body}` : title, ...(html ? { parse_mode: "HTML" } : {}), ...(markup ? { reply_markup: markup } : {}) }),
      });
      return true;
    } catch (e) { console.error("[nautilus-notify] Telegram 发送失败", e); return false; }
  }

  // 每天几个固定时刻推一次螺旋日程图文版；到点时 Mac 在睡觉的话，醒来 90 分钟内补发
  async reportTick(force = false) {
    const s = this.settings;
    const np = this.app.plugins.plugins[NAUTILUS];
    if (!np?.telegramReport || !this.tgTarget()) return false;
    // 图文版前面带一张今天的螺旋图；螺旋日程没有这个方法（旧版）或者发失败了就只发文字
    const send = async (html) => { const t = this.tgTarget(); if (np.tgSendWithSpiral && await np.tgSendWithSpiral(t.token, t.chat, html).catch(() => false)) return true; return this.tg(html, "", { html: true }); };
    if (force) return send(await np.telegramReport("螺旋日程 · 现在"));
    if (!s.enabled) return false;
    const nowM = moment(), now = nowM.hours() * 60 + nowM.minutes(), today = nowM.format("YYYY-MM-DD");
    for (const hhmm of s.tgReportTimes.split(/[,，、\s]+/).filter(Boolean)) {
      const at = toMin(hhmm);
      const key = `${today} ${hhmm}`;
      if (at == null || s.tgReportSent[key] || now < at || now - at >= 90) continue;
      s.tgReportSent[key] = true;
      const old = nowM.clone().subtract(3, "day").format("YYYY-MM-DD");
      for (const k of Object.keys(s.tgReportSent)) if (k.slice(0, 10) < old) delete s.tgReportSent[k];
      this.saveSoon();
      const icon = at < 15 * 60 ? "☀️" : at < 20 * 60 ? "🌇" : "🌙";
      await send(await np.telegramReport(`${icon} ${hhmm} 螺旋日程`));
    }
    return true;
  }

  // ================= Telegram 推送：健身早报、拖延任务、闪卡、经期、周洞察、收工小结 =================
  // 每个定时推送按「日期 + 名字」只发一次；到点时 Mac 在睡觉，醒来 90 分钟内补发
  dueOnce(name, hhmm, { weekday = null } = {}) {
    const s = this.settings;
    const at = toMin(hhmm);
    const nowM = moment();
    if (at == null || (weekday != null && nowM.day() !== weekday)) return false;
    const now = nowM.hours() * 60 + nowM.minutes();
    const key = `${nowM.format("YYYY-MM-DD")} ${name}`;
    if (s.tgReportSent[key] || now < at || now - at >= 90) return false;
    s.tgReportSent[key] = true;
    this.saveSoon();
    return true;
  }
  esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  async pushTick() {
    const s = this.settings;
    if (!s.enabled || !this.tgTarget()) return;
    if (s.pushWorkout && this.dueOnce("workout", s.pushWorkoutAt)) await this.pushWorkout();
    if (s.pushStale && this.dueOnce("stale", s.pushStaleAt)) await this.pushStale();
    if (s.pushCards && this.dueOnce("cards", s.pushCardsAt)) await this.pushCards();
    if (s.pushPeriod && this.dueOnce("period", s.pushPeriodAt)) await this.pushPeriod();
    if (s.pushInsight && this.dueOnce("insight", s.pushInsightAt, { weekday: 0 })) await this.pushInsight();
    if (s.profileUpdate && this.dueOnce("profile", s.profileUpdateAt, { weekday: 0 })) await this.profileUpdate();
  }

  // ---------- 🏋️ 健身早报 ----------
  async pushWorkout() {
    const day = this.wToday();
    const plan = await this.readPlan();
    const tp = this.todayPlan(plan, day);
    const st = await this.workoutStats(day);
    const E = (x) => this.esc(x);
    const lines = [tp.kind === "休息" ? `😴 <b>${tp.wd} · 休息日</b>` : `${tp.kind === "有氧" ? "🏃" : "🏋️"} <b>${tp.wd} · ${E(tp.label)}</b>`];
    if (tp.items.length) lines.push("", ...tp.items.map((x) => `▫️ ${E(x)}`));
    if (tp.daily.length) lines.push("", `🔁 每天：${tp.daily.map(E).join("；")}`);
    lines.push("", `📊 本周已练 <b>${st.weekDays}</b> 天（目标 5）` + (st.gap === 0 ? " · 今天已经练过 ✅" : st.gap >= 31 ? "" : ` · 上次练是 ${st.gap} 天前`));
    if (st.gap >= this.settings.workoutGapDays && plan.fallback) lines.push(`🧯 断了 ${st.gap} 天，先做保底版：${E(plan.fallback)}`);
    if (this.settings.weighDays.split(/[,，、\s]+/).some((x) => x && tp.wd.endsWith(x.replace(/^周/, "")))) lines.push("⚖️ 今天称重日：起床后空腹、赤脚称一次，截图发我");
    lines.push("", `<i>⏰ ${this.settings.workoutAt} 再提醒一次</i>`);
    return this.tg(lines.join("\n"), "", { html: true });
  }

  // ---------- 🐢 拖了好几天的任务：每件带三个按钮 ----------
  // 日记里「- TODO xxx ← [[2026_10_02]]」= 从 10-02 一路挪过来的
  async staleTasks() {
    const day = this.wToday();
    const path = this.wJournalPath(day);
    const lines = (await this.wRead(path)).split("\n");
    const out = [];
    lines.forEach((l, i) => {
      const m = /^-\s+(?:TODO|LATER)\s+(.*?)\s*←\s*\[\[(\d{4})_(\d{2})_(\d{2})\]\]/.exec(l);
      if (!m) return;
      const age = day.diff(moment(`${m[2]}-${m[3]}-${m[4]}`, "YYYY-MM-DD"), "days");
      if (age >= this.settings.staleDays) out.push({ line: i, raw: l, label: m[1].replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, "$1"), age, from: `${m[3]}-${m[4]}` });
    });
    return { path, day, items: out.sort((a, b) => b.age - a.age) };
  }
  staleMessage(items, done = {}) {
    const E = (x) => this.esc(x);
    const head = `🐢 <b>拖了 ${this.settings.staleDays} 天以上的事</b>（${items.length} 件）\n点按钮直接改日记：🗑 不做了 · 📅 挪明天 · 💤 搁置\n`;
    const body = items.map((t, i) => `${done[t.id] ? done[t.id] : `${i + 1}️⃣`} ${E(t.label.length > 30 ? t.label.slice(0, 30) + "…" : t.label)} <i>· ${t.age} 天（从 ${t.from}）</i>`);
    const kb = items.filter((t) => !done[t.id]).map((t) => {
      const n = items.indexOf(t) + 1;
      return [{ text: `🗑 ${n}`, callback_data: `nn|drop|${t.id}` }, { text: `📅 ${n}`, callback_data: `nn|move|${t.id}` }, { text: `💤 ${n}`, callback_data: `nn|wait|${t.id}` }];
    });
    return { text: head + "\n" + body.join("\n"), markup: { inline_keyboard: kb } };
  }
  async pushStale() {
    const { path, items } = await this.staleTasks();
    if (!items.length) return;
    const list = items.slice(0, 8).map((t, i) => ({ ...t, id: `${Date.now().toString(36)}${i}` }));
    this.settings.staleMsg = { path, items: list, done: {} };
    this.saveSoon();
    const m = this.staleMessage(list);
    return this.tg(m.text, "", { html: true, markup: m.markup });
  }
  // Telegram Inbox 收到按钮回调时调这里；返回 { toast, edit, markup }
  async onTgCallback(data) {
    const [, act, id] = String(data).split("|");
    if (act === "pok" || act === "pno") return this.onProfileCallback(act, id);
    const sm = this.settings.staleMsg;
    const t = sm?.items.find((x) => x.id === id);
    if (!t) return { toast: "这条已经过期了" };
    if (sm.done[id]) return { toast: "已经处理过了" };
    const f = this.app.vault.getAbstractFileByPath(sm.path);
    if (!(f instanceof TFile)) return { toast: "找不到那天的日记" };
    let moved = null, ok = false;
    await this.app.vault.process(f, (txt) => {
      const ls = txt.split("\n");
      const i = ls.findIndex((l) => l === t.raw) >= 0 ? ls.findIndex((l) => l === t.raw) : ls.findIndex((l) => /^-\s+(?:TODO|LATER)\s/.test(l) && l.includes(t.label));
      if (i < 0) return txt;
      ok = true;
      if (act === "drop") ls[i] = ls[i].replace(/^-\s+(?:TODO|LATER)\s/, "- CANCELED ");
      else if (act === "wait") ls[i] = ls[i].replace(/^-\s+(?:TODO|LATER)\s/, "- WAITING ");
      else if (act === "move") {
        let j = i + 1;
        while (j < ls.length && /^\s+\S/.test(ls[j])) j++;   // 连同缩进的子项一起搬
        moved = ls.splice(i, j - i);
      }
      return ls.join("\n");
    });
    if (!ok) return { toast: "日记里没找到这一行（可能已经改过了）" };
    if (moved) {
      const tom = this.wToday().add(1, "day");
      const tp = this.wJournalPath(tom);
      let tf = this.app.vault.getAbstractFileByPath(tp);
      if (!(tf instanceof TFile)) tf = await this.app.vault.create(tp, `---\njournal: 每日\njournal-date: ${tom.format("YYYY-MM-DD")}\n---\n`);
      await this.app.vault.process(tf, (txt) => (txt.endsWith("\n") || !txt ? txt : txt + "\n") + moved.join("\n") + "\n");
    }
    sm.done[id] = { drop: "🗑", move: "📅", wait: "💤" }[act];
    this.saveSoon();
    const m = this.staleMessage(sm.items, sm.done);
    return { toast: { drop: "已改成 CANCELED", move: "已挪到明天", wait: "已改成 WAITING（搁置）" }[act], edit: m.text, markup: m.markup };
  }

  // ---------- 🃏 闪卡到期（借第二大脑插件的 AnkiConnect；Anki 没开就不发） ----------
  async pushCards() {
    const sb = this.app.plugins.plugins["second-brain"];
    if (!sb?.anki) return;
    let n;
    try { n = (await sb.anki("findCards", { query: "is:due -is:suspended -is:buried" })).length; } catch (e) { console.warn("[nautilus-notify] Anki 没连上，今天不发闪卡提醒", e); return; }
    if (!n) return;
    let last = "";
    for (let i = 0; i < 14 && !last; i++) {
      const d = this.wToday().subtract(i, "day");
      const m = /复习卡片\s*(\d+)\s*张/.exec(await this.wRead(this.wJournalPath(d)));
      if (m) last = i === 0 ? `今天已经复习过 ${m[1]} 张` : `上次复习是 ${d.format("MM-DD")}（${m[1]} 张）`;
    }
    const mins = Math.max(3, Math.round(n * 0.4));
    return this.tg(`🃏 <b>今天有 ${n} 张卡到期</b>\n⏱ 大约 ${mins} 分钟就能过完${last ? `\n📚 ${last}` : ""}\n💡 在 Obsidian 打开「每日回顾」或者直接用 Anki`, "", { html: true });
  }

  // ---------- 🌸 伴侣的经期预测：提前 3 天、当天各提醒一次 ----------
  async pushPeriod() {
    const rows = (await this.wRead(this.settings.periodPath)).split("\n").map((l) => /^\|\s*(\d{4}-\d{2}-\d{2})\s*\|/.exec(l)).filter(Boolean).map((m) => moment(m[1], "YYYY-MM-DD")).sort((a, b) => a - b);
    if (!rows.length) return;
    const gaps = rows.slice(1).map((d, i) => d.diff(rows[i], "days")).filter((g) => g >= 20 && g <= 45);
    const cycle = gaps.length ? Math.round(gaps.reduce((a, b) => a + b) / gaps.length) : 28;
    const next = rows.at(-1).clone().add(cycle, "day");
    const left = next.diff(moment().startOf("day"), "days");
    const who = this.esc(this.settings.periodWho || "TA");
    const E = `预计 <b>${next.format("M月D日")}</b>（按平均周期 ${cycle} 天算${gaps.length < 3 ? "，记录还少，可能差几天" : ""}）`;
    if (left === 3) return this.tg(`🌸 <b>${who}的经期大概 3 天后</b>\n${E}\n💝 可以提前备好暖宝宝、红糖姜茶、止痛药；那几天少约累的事，多点耐心`, "", { html: true });
    if (left === 0) return this.tg(`🌸 <b>${who}的经期预计今天开始</b>\n${E}\n📝 来了的话在「经期记录」加一行开始日期，预测会越来越准\n💝 今天多关心一句`, "", { html: true });
  }

  // ---------- 🧭 周日：这一周做了什么（claude 读日记写） ----------
  // 日记太长（摘抄、长文）只取任务行和顶格条目，每行截断
  digestJournal(txt, maxLines = 160) {
    const out = [];
    let fm = false;
    for (const l of txt.split("\n")) {
      if (l === "---") { fm = !fm; continue; }
      if (fm || !l.trim() || /!\[\[|^\s*\^/.test(l)) continue;
      const task = /^\s*-\s+(?:TODO|DOING|DONE|FAILED|CANCELED|WAITING|LATER|NOW|PAUSED|\[.\])\s/.test(l);
      if (!task && /^\s/.test(l)) continue;
      out.push(l.length > 140 ? l.slice(0, 140) + "…" : l);
      if (out.length >= maxLines) break;
    }
    return out.join("\n");
  }
  runClaude(prompt, timeoutSec = 240) {
    const os = require("os"), path = require("path");
    return new Promise((resolve, reject) => {
      const bin = this.settings.claudePath.replace(/^~(?=\/)/, os.homedir());
      const env = { ...process.env, PATH: [path.join(os.homedir(), ".local/bin"), "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", process.env.PATH || ""].join(":") };
      let child;
      try { child = spawn(bin, ["-p", "--output-format", "json", "--no-session-persistence", "--strict-mcp-config", "--tools", ""], { cwd: os.tmpdir(), env }); }
      catch (e) { return reject(e); }
      let out = "", err = "";
      child.stdout.on("data", (d) => { out += d; });
      child.stderr.on("data", (d) => { err += d; });
      const timer = setTimeout(() => { child.kill(); reject(new Error("claude 超时")); }, timeoutSec * 1000);
      child.on("error", (e) => { clearTimeout(timer); reject(e); });
      child.on("close", (code) => {
        clearTimeout(timer);
        let d;
        try { d = JSON.parse(out); } catch (e) { return reject(new Error((err || out || `claude 退出码 ${code}`).trim().slice(0, 300))); }
        if (d.is_error) return reject(new Error(String(d.result || "claude 出错").slice(0, 300)));
        resolve(String(d.result || "").trim());
      });
      child.stdin.write(prompt);
      child.stdin.end();
    });
  }
  // Telegram 只认少数 HTML 标签；模型偶尔写出 Markdown 的 **粗体**，顺手换掉
  tgHtml(s) {
    return s.replace(/^```\w*\n?|```$/g, "").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/<br\s*\/?>/g, "\n").trim();
  }
  async pushInsight(force = false) {
    const day = this.wToday();
    const mon = day.clone().startOf("isoWeek");
    const parts = [];
    for (let d = mon.clone(); !d.isAfter(day, "day"); d.add(1, "day")) {
      const txt = this.digestJournal(await this.wRead(this.wJournalPath(d)));
      if (txt) parts.push(`### ${d.format("YYYY-MM-DD dddd")}\n${txt}`);
    }
    if (!parts.length) return force ? this.tg("🧭 这周日记是空的，没什么可写", "") : false;
    const prompt = `下面是我这一周（${mon.format("MM-DD")} ～ ${day.format("MM-DD")}）的 Obsidian 日记摘要：DONE 是做完的，TODO 是没做的，FAILED 是没做成的，CANCELED 是不做了，「← [[日期]]」是从那天一路拖过来的。

请写一份「这一周我做了什么」的洞察，发到 Telegram，用中文，只用 Telegram 支持的 HTML 标签（<b> <i> <code>），不要用 Markdown，不要用 <br>、<p>、<ul>。多用 emoji 当小标题和条目前缀。结构：
🧭 一句话总结这周（加粗）
📦 这周主要做了什么：按主题归成 3～6 类（比如插件开发、教课、写作、AI 工具、生活琐事、健身），每类一行，写清楚具体做了什么、大概哪几天
🚀 推进最大的一件事
🐢 拖着没动的：反复出现在 TODO 里、或带「←」拖了很多天的，点名
🔍 一个模式观察：时间和精力实际花在哪、和想做的事是否一致（要具体，引用日记里的事，不要泛泛而谈）
🎯 下周最值得先做的 1～2 件
💬 最后一句给我的话：不要鸡汤，用这周的事实肯定我
全文 25 行以内。只输出正文，不要前言。

${parts.join("\n\n")}`;
    let text;
    try { text = this.tgHtml(await this.runClaude(prompt)); }
    catch (e) { console.error("[nautilus-notify] 周洞察", e); return this.tg(`🧭 这周的洞察没写成：${this.esc(e.message || e)}`, ""); }
    const title = `🗓 <b>周洞察 · ${mon.format("M/D")}–${day.format("M/D")}</b>\n━━━━━━━━━━━━━━━\n`;
    await this.saveInsight(mon, day, text);
    return this.tg(title + text, "", { html: true });
  }
  async saveInsight(mon, day, html) {
    const p = this.settings.insightPath;
    const md = html.replace(/<b>(.*?)<\/b>/g, "**$1**").replace(/<i>(.*?)<\/i>/g, "*$1*").replace(/<\/?code>/g, "`").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    const entry = `- **${mon.format("YYYY-MM-DD")} ～ ${day.format("MM-DD")} 周洞察**\n` + md.split("\n").filter((l) => l.trim()).map((l) => `\t- ${l.trim()}`).join("\n") + "\n";
    let f = this.app.vault.getAbstractFileByPath(p);
    if (!(f instanceof TFile)) { f = await this.app.vault.create(p, `---\ntype: 自动生成\n---\n${entry}`); return; }
    await this.app.vault.process(f, (txt) => {
      const m = /^---\n[\s\S]*?\n---\n/.exec(txt);
      return m ? m[0] + entry + txt.slice(m[0].length) : entry + txt;
    });
  }

  // ---------- 🌙 收工小结：Telegram 里说「睡了 / 休息了 / 不干了」时，Telegram Inbox 调这里 ----------
  async daySummary(day = this.wToday()) {
    const txt = this.digestJournal(await this.wRead(this.wJournalPath(day)), 220);
    const np = this.nautilus();
    let stats = "";
    try {
      if (np) {
        const items = np.core.parseJournal(await this.wRead(this.wJournalPath(day)), np.settings);
        stats = (await np.dayTail(day.format(np.settings.format), items)).join("\n");
      }
    } catch (e) { /* 没有就算了 */ }
    const w = await this.workoutStats(day);
    const profile = (await this.wRead(this.settings.comfortProfile)).replace(/^---\n[\s\S]*?\n---\n/, "");
    const prompt = `我刚在 Telegram 里说今天收工了。下面是我今天（${day.format("YYYY-MM-DD dddd")}）的日记摘要：DONE 是做完的，TODO 是还没做的，FAILED 是没做成的。
${stats ? `\n螺旋日程的统计：\n${stats}\n` : ""}${w.gap === 0 ? "\n今天练过身体。\n" : ""}
请写一条发到 Telegram 的收工小结，中文，只用 Telegram 支持的 HTML 标签（<b> <i>），不要 Markdown，不要 <br>。多用 emoji。结构：
🌙 第一行加粗，一句话说今天是怎样的一天
✅ 今天做成了什么：按事情归类，3～7 条，每条一行，写具体（课、插件、写作、生活琐事都算），能看出价值的点一下
⏭ 明天先做哪一件：从没做完的里挑最重要的一件，给一个 10 分钟就能开始的第一步
💬 最后 3～4 句给我的话，按下面陪伴档案里「回我的时候」的要求写（档案里没写的话：不要鸡汤、不要空洞夸奖、不要感叹号堆砌；用今天日记里的具体事实说明我做得不错、我的能力在哪；没做完的事要说成是计划或系统的问题，不是我这个人的问题；语气像一个很懂我、很理性又很温柔的朋友。最后一句可以让我安心去睡）。日记里别人说的话和摘抄不要套在我身上。
全文 18 行以内。只输出正文。

陪伴档案：
${profile || "（没有）"}

今天的日记摘要：
${txt || "（今天日记里几乎没写东西）"}`;
    try { return this.tgHtml(await this.runClaude(prompt, 150)); }
    catch (e) {
      console.error("[nautilus-notify] 收工小结", e);
      // 兜底：不靠模型，列出今天做完的
      const done = txt.split("\n").filter((l) => /^-\s+(?:DONE|\[x\])\s/i.test(l)).map((l) => l.replace(/^-\s+(?:DONE|\[x\])\s+(\d{1,2}:\d{2}(?:-\d{1,2}:\d{2})?\s+)?/i, "")).slice(0, 10);
      return `🌙 <b>今天收工了</b>\n${done.length ? `✅ 做完了 ${done.length} 件：\n` + done.map((x) => `▫️ ${this.esc(x.slice(0, 40))}`).join("\n") : "今天记下的不多，也没关系。"}\n\n💬 今天做完的每一件都是真的。剩下的明天接着来，你的节奏没问题。好好睡。`;
    }
  }

  // ---------- 🫂 陪你聊：Telegram 里说「好累」「好难受」，或者回复陪聊消息时，Telegram Inbox 调这里 ----------
  // 读：陪伴档案（你写给它的「我是谁、怎么回我」）+ 最近三天日记 + 最近一个月说过的情绪话 + 这几天几点收工 + 训练体重
  async comfort(text, history = [], mood = "low") {
    const day = this.wToday();
    const np = this.nautilus();
    const profile = (await this.wRead(this.settings.comfortProfile)).replace(/^---\n[\s\S]*?\n---\n/, "");
    const recent = [];
    for (let i = 0; i < 3; i++) {
      const d = day.clone().subtract(i, "day");
      const t = this.digestJournal(await this.wRead(this.wJournalPath(d)), i === 0 ? 120 : 50);
      if (t) recent.push(`### ${d.format("MM-DD dddd")}${i === 0 ? "（今天）" : ""}\n${t}`);
    }
    const moods = [];
    for (let i = 1; i <= 30 && moods.length < 12; i++) {
      const d = day.clone().subtract(i, "day");
      for (const l of (await this.wRead(this.wJournalPath(d))).split("\n")) {
        const s = l.replace(/^\s*-\s*/, "").trim();
        if (s.length <= 60 && FEEL_RE.test(s.replace(FEEL_SKIP, ""))) moods.push(`${d.format("MM-DD")}：${s}`);
      }
    }
    const facts = [];
    if (np) {
      const b = np.settings.dayBounds || {};
      const ends = [];
      for (let i = 1; i <= 5; i++) { const k = day.clone().subtract(i, "day").format(np.settings.format); if (b[k]?.end != null) ends.push(`${k.slice(5).replace("_", "-")} ${clock(b[k].end)}`); }
      if (ends.length) facts.push(`最近几天收工（睡觉）时间：${ends.join("，")}`);
      try { facts.push(...(await np.dayTail(day.format(np.settings.format), np.core.parseJournal(await this.wRead(this.wJournalPath(day)), np.settings)))); } catch (e) { /* 没有就算了 */ }
    }
    const w = await this.workoutStats(day);
    facts.push(`本周练了 ${w.weekDays} 天，上次练是 ${w.gap >= 31 ? "一个月以前" : w.gap === 0 ? "今天" : `${w.gap} 天前`}`);
    const nowM = moment();
    const talk = history.map((h) => `${h.who}：${h.text}`).join("\n");
    const prompt = `你是他很信任、也很了解他的一个朋友（他是谁写在下面的陪伴档案里）。${mood === "happy" ? "他刚在 Telegram 里给你发了消息，心情很好（他开心的时候会说「呱」）。" : mood === "chat" ? "他在 Telegram 里找你聊天。" : "他刚在 Telegram 里给你发了消息，情绪不太好。"}现在是 ${nowM.format("M月D日 dddd HH:mm")}。

先读他自己写的「陪伴档案」，严格按里面「回我的时候」的要求回复：
${profile}

他最近的情况（来自他的 Obsidian 日记，DONE 是做完的，TODO 是没做的）：
${facts.map((f) => "- " + f).join("\n")}

${recent.join("\n\n")}
${moods.length ? `\n最近一个月他在日记里说过的类似的话：\n${moods.join("\n")}\n` : ""}
${talk ? `你们刚才的对话：\n${talk}\n` : ""}
他现在说：「${text}」

${mood === "chat" ? `回复要求：中文；像朋友聊天，1～6 行，他说得短你也短；他问问题就直接回答（你不能联网，实时信息不知道就直说）；他聊他在做的事、想法，就接着聊，可以用日记里的背景，但不要列清单、不要复述日记；不说教，不主动提醒他还有什么没做；只回应他自己的事，日记里别人说的话不要套在他身上；他说「呱」就呱回去 🐸。适量 emoji（1～3 个）。只用 Telegram 支持的 HTML（<b> <i>），不要 Markdown。只输出要发给他的话。` : mood === "happy" ? `回复要求：中文；像朋友发消息，2～5 行；跟着他一起高兴，不要说教、不要提建议、不要转去聊没做完的事；他说做成了什么就具体地接住，没说就从今天的日记里找一件他刚做成的事一起高兴，或者问他发生了什么好事；可以回一两个「呱」🐸；只回应他自己的事，日记里别人说的话不要套在他身上。适量 emoji（2～4 个）。只用 Telegram 支持的 HTML（<b> <i>），不要 Markdown。只输出要发给他的话。` : `回复要求：中文；像朋友发消息，4～8 行；只回应他自己的感受和处境，日记里别人说的话、摘抄、转述的内容不要拿来套在他身上，也不要提及别人的隐私；只有他这句话或你们刚才的对话里明确流露出想伤害自己、不想活，才按档案里的危机部分回应，否则一个字都不要提自伤和热线；先接住情绪，引用一两件他最近具体在做的事说明你懂他的处境（不要列清单、不要复述全部日记）；不要说教、不要鸡汤、不要「加油」；建议最多一个且非常小，没必要就不给；可以用一个问题结尾让他多说一点。适量 emoji（2～4 个）。只用 Telegram 支持的 HTML（<b> <i>），不要 Markdown。只输出要发给他的话。`}`;
    let reply;
    try { reply = this.tgHtml(await this.runClaude(prompt, 150)); }
    catch (e) {
      console.error("[nautilus-notify] 陪聊", e);
      reply = mood === "chat" ? "🐸 我在听，不过这会儿脑子有点卡，没法好好回你。\n再说一遍，或者等一下再找我？"
        : mood === "happy" ? "呱呱！🐸 听起来是好事，我跟着一起高兴 ✨\n发生什么了，跟我说说？"
        : "🫂 我在。现在没法细看你今天的日记，但你说累，我信。\n先别管清单，喝口水，能躺就躺一会儿。\n想说的话，接着回我这条。";
    }
    return { html: reply, mood, history: [...history, { who: "他", text }, { who: "你", text: reply.replace(/<[^>]+>/g, "") }].slice(-10) };
  }
  // ================= 🔄 定期更新陪伴档案 =================
  // 每周日：读这一周的日记、第二大脑的库周报、最近一期长期项目复盘、周洞察、这周对话模式里说过的话、作息训练数据，
  //   1) 整段重写档案末尾「🔄 近况」一节（自动维护，不用确认）
  //   2) 发现稳定、长期的新特点时，作为「建议补进档案」发到 Telegram，点 ✅ 才写进上面手写的那几节
  // 对话内容只存在本插件的数据里（chatMemory），不进日记和笔记；每次更新完清空
  profileSections(text) {
    return text.split("\n").filter((l) => /^- \S/.test(l) && !l.startsWith("- 🔄")).map((l) => l.slice(2).replace(/（.*$/, "").trim());
  }
  async profileUpdate({ manual = false } = {}) {
    const s = this.settings;
    const f = this.app.vault.getAbstractFileByPath(s.comfortProfile);
    if (!(f instanceof TFile)) return { ok: false, msg: `没找到陪伴档案（${s.comfortProfile}）` };
    const profile = await this.app.vault.read(f);
    const day = this.wToday();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = day.clone().subtract(i, "day");
      const t = this.digestJournal(await this.wRead(this.wJournalPath(d)), 80);
      if (t) days.push(`### ${d.format("MM-DD dddd")}\n${t}`);
    }
    // 第二大脑的库周报：只取最新一期（第一个 ## 段）
    const rep = (await this.wRead(s.profileReportPath)).replace(/^---\n[\s\S]*?\n---\n/, "");
    const repLatest = (/(## [^\n]+\n[\s\S]*?)(?=\n## |$)/.exec(rep) || [])[1] || "";
    // 最近一期长期项目复盘、最新的周洞察
    const revDir = this.app.vault.getAbstractFileByPath(s.projectReviewDir);
    const revFile = revDir?.children?.filter((x) => x instanceof TFile).sort((a, b) => b.name.localeCompare(a.name))[0];
    const review = revFile ? (await this.app.vault.read(revFile)).replace(/^---\n[\s\S]*?\n---\n/, "").replace(/<!--.*?-->/g, "").slice(0, 2500) : "";
    const insight = ((await this.wRead(s.insightPath)).replace(/^---\n[\s\S]*?\n---\n/, "").split(/\n(?=- \*\*)/)[0] || "").slice(0, 2000);
    // 作息、训练、体重
    const facts = [];
    const np = this.nautilus();
    if (np) {
      const b = np.settings.dayBounds || {};
      const ends = [];
      for (let i = 1; i <= 7; i++) { const k = day.clone().subtract(i, "day").format(np.settings.format); if (b[k]?.end != null) ends.push(`${k.slice(5).replace("_", "-")} ${clock(b[k].end)}`); }
      if (ends.length) facts.push(`这周的收工（睡觉）时间：${ends.join("，")}`);
    }
    const w = await this.workoutStats(day);
    facts.push(`本周练了 ${w.weekDays} 天`);
    const wt = await this.weightWeeks(day);
    if (wt.thisWeek != null) facts.push(`本周周均体重 ${wt.thisWeek.toFixed(1)}kg${wt.lastWeek != null ? `（上周 ${wt.lastWeek.toFixed(1)}）` : ""}`);
    const chats = (s.chatMemory || []).map((x) => `${moment(x.at).format("MM-DD HH:mm")}（${x.mood}）${x.text}`).join("\n");
    const sections = this.profileSections(profile);
    const prompt = `你在维护一份「陪伴档案」：它是一个陪伴型 Telegram 机器人对他的长期了解，机器人每次回他之前都会先读它。下面是档案现在的全文，以及他这一周的各种记录。

【档案全文】
${profile}

【这一周的日记摘要】（DONE 做完、TODO 没做、FAILED 没做成）
${days.join("\n\n") || "（没有）"}

【第二大脑的库周报，最新一期】（反映他这周在记、在学、在钻研什么）
${repLatest || "（没有）"}

【最近一期长期项目复盘】
${review || "（没有）"}

【最近一期周洞察】
${insight || "（没有）"}

【作息、训练、体重】
${facts.map((x) => "- " + x).join("\n")}

【这周在对话模式里他对机器人说过的话】
${chats || "（没有）"}

任务一：重写档案末尾的「🔄 近况」一节。5～8 条，每条一行、以 emoji 开头，依次覆盖：💼 最近在忙什么（具体项目）、🌡 这周的状态和压力来源、🎉 这周开心或有成就感的事、📚 最近在钻研 / 学习什么（看库周报）、😴 作息和身体（几点睡、练没练、体重）、🫶 和在乎的人有关的近况（只写他自己写下的）、📈 和档案里上一版近况相比的变化。要具体、引用事实，不评价他、不给建议、不写心理诊断。
任务二：只有当这周的记录里出现了**稳定、长期**的新信息（新的压力模式、他喜欢或讨厌的被回应方式、新的口头禅、重要的人或长期目标），才给出最多 3 条「建议补进档案」的内容，每条一句话，注明放进哪一节（只能是：${sections.join("、")}），不能和档案已有内容重复。没有就留空，宁缺毋滥。
不要写进日记里别人说的话、摘抄转述的内容、第三方的隐私。

严格按这个格式输出，不要别的话：
<<<近况>>>
- 💼 ……
<<<建议>>>
- 节名｜内容`;
    let out;
    try { out = await this.runClaude(prompt, 300); }
    catch (e) { console.error("[nautilus-notify] 更新陪伴档案", e); return { ok: false, msg: `没写成：${e.message || e}` }; }
    const recent = (((/<<<近况>>>\s*([\s\S]*?)(?:<<<建议>>>|$)/.exec(out) || [])[1]) || "").split("\n").map((l) => l.replace(/^\s*[-*]\s*/, "").trim()).filter(Boolean).slice(0, 8);
    if (!recent.length) return { ok: false, msg: "模型没按格式回，档案没动" };
    const sugs = (((/<<<建议>>>\s*([\s\S]*)$/.exec(out) || [])[1]) || "").split("\n").map((l) => l.replace(/^\s*[-*]\s*/, "").trim())
      .map((l) => { const m = /^(.+?)[｜|]\s*(.+)$/.exec(l); return m ? { section: sections.find((x) => m[1].includes(x) || x.includes(m[1].trim())) || null, text: m[2].trim() } : null; })
      .filter((x) => x && x.section && x.text).slice(0, 3);
    // 整段替换「🔄 近况」
    const stamp = moment().format("YYYY-MM-DD");
    const block = [`- 🔄 近况（每周日自动更新 · 最后更新 ${stamp} · 这一节会整段重写，想长期留着的写到上面）`, ...recent.map((x) => `\t- ${x}`)];
    await this.app.vault.process(f, (txt) => {
      const ls = txt.split("\n");
      const i = ls.findIndex((l) => l.startsWith("- 🔄 近况"));
      if (i < 0) return txt.replace(/\n*$/, "\n") + block.join("\n") + "\n";
      let j = i + 1;
      while (j < ls.length && !/^\S/.test(ls[j])) j++;
      ls.splice(i, j - i, ...block);
      return ls.join("\n");
    });
    s.chatMemory = [];
    s.profileSugs = { items: sugs.map((x, k) => ({ ...x, id: `${Date.now().toString(36)}${k}` })), done: {} };
    s.profileUpdatedAt = Date.now();
    this.saveSoon();
    const m = this.profileMessage(recent, s.profileSugs, manual);
    await this.tg(m.text, "", { html: true, markup: m.markup });
    return { ok: true, recent, sugs };
  }
  profileMessage(recent, ps, manual = false) {
    const E = (x) => this.esc(x);
    const lines = [`🔄 <b>${manual ? "更新好了" : "这周"}，我对你的了解更新了一下</b>`, "", ...recent.map(E)];
    if (ps.items.length) {
      lines.push("", "💡 <b>这周看到的新特点，要不要记进你的档案？</b>（点 ✅ 才会写进去）");
      ps.items.forEach((x, i) => lines.push(`${ps.done[x.id] || `${i + 1}️⃣`} <i>${E(x.section)}</i>：${E(x.text)}`));
    }
    lines.push("", "<i>想改哪里，直接改「陪伴档案」那篇笔记</i>");
    const kb = ps.items.filter((x) => !ps.done[x.id]).map((x) => { const n = ps.items.indexOf(x) + 1; return [{ text: `✅ 记进档案 ${n}`, callback_data: `nn|pok|${x.id}` }, { text: `❌ 不要 ${n}`, callback_data: `nn|pno|${x.id}` }]; });
    return { text: lines.join("\n"), markup: kb.length ? { inline_keyboard: kb } : null };
  }
  async onProfileCallback(act, id) {
    const s = this.settings, ps = s.profileSugs;
    const x = ps?.items.find((y) => y.id === id);
    if (!x) return { toast: "这条已经过期了" };
    if (ps.done[id]) return { toast: "已经处理过了" };
    if (act === "pok") {
      const f = this.app.vault.getAbstractFileByPath(s.comfortProfile);
      if (!(f instanceof TFile)) return { toast: "没找到陪伴档案" };
      let ok = false;
      await this.app.vault.process(f, (txt) => {
        const ls = txt.split("\n");
        const i = ls.findIndex((l) => /^- \S/.test(l) && l.slice(2).startsWith(x.section));
        if (i < 0) return txt;
        let j = i + 1;
        while (j < ls.length && !/^\S/.test(ls[j])) j++;
        while (j > i + 1 && !ls[j - 1].trim()) j--;   // 插在这一节最后一个子项后面
        ls.splice(j, 0, `\t- ${x.text}`);
        ok = true;
        return ls.join("\n");
      });
      if (!ok) return { toast: `档案里没找到「${x.section}」这一节` };
    }
    ps.done[id] = act === "pok" ? "✅" : "❌";
    this.saveSoon();
    const f = await this.wRead(s.comfortProfile);
    const ls = f.split("\n"), i = ls.findIndex((l) => l.startsWith("- 🔄 近况"));
    const recent = [];
    for (let j = i + 1; i >= 0 && j < ls.length && /^\t- /.test(ls[j]); j++) recent.push(ls[j].replace(/^\t- /, ""));
    const m = this.profileMessage(recent, ps);
    return { toast: act === "pok" ? `已记进「${x.section}」` : "好，不记", edit: m.text, markup: m.markup || { inline_keyboard: [] } };
  }

  // ================= 对话模式 / 记录模式 =================
  // 记录模式（默认）：Telegram 发来的都记进日记。对话模式：每句都由 claude 接着聊，对话内容不进日记。
  // 进对话模式有两种：
  //   explicit：说「对话模式」「陪我聊天」，一直保持到说「退出」「记录模式」「睡了」
  //   auto：情绪话、打招呼、「聊聊 / 陪我」、回复它的消息时自动进入，chatIdleMin 分钟没说话就自己回到记录模式
  chatCommand(said) {
    const s = String(said || "").trim().replace(/[!！。.~～\s]+$/, "");
    if (/^(?:进入)?(?:对话|聊天)模式$|^(?:来)?陪我聊(?:聊|天|会儿?)?$|^\/chat$/.test(s)) return "enter";
    if (/^(?:退出(?:对话|聊天)?(?:模式)?|记录模式|回到记录模式|不聊了|先不聊了|结束对话|\/record|\/exit)$/.test(s)) return "exit";
    return null;
  }
  // 现在是否在对话模式：返回 "explicit" / "auto" / false（auto 超时也算 false，等 tick 或下一句收尾）
  chatActive() {
    const c = this.settings.chat;
    if (!c) return false;
    if (c.mode === "auto" && Date.now() - c.last > this.settings.chatIdleMin * 60e3) return false;
    return c.mode;
  }
  async chatStart(mode, mood = "chat", seed = []) {
    const c = this.settings.chat;
    if (c && this.chatActive()) { if (mode === "explicit") c.mode = "explicit"; c.last = Date.now(); this.saveSoon(); return c; }
    if (c) await this.chatEnd();   // 超时还没收尾的那段先收掉
    this.settings.chat = { mode, mood, since: Date.now(), last: Date.now(), history: seed, n: 0 };
    this.saveSoon();
    return this.settings.chat;
  }
  async chatEnd() {
    const c = this.settings.chat;
    if (!c) return null;
    this.settings.chat = null;
    this.saveSoon();
    return c;
  }
  // 对话模式里的一句：接着之前的对话回
  async chatReply(text) {
    const c = this.settings.chat || (await this.chatStart("auto"));
    const idleLong = c.mode === "explicit" && Date.now() - c.last > 6 * 3600e3;
    c.last = Date.now();
    const mood = this.moodOf(text) || (c.mood === "chat" ? "chat" : c.mood) || "chat";
    const r = await this.comfort(text, c.history, mood);
    c.history = r.history;
    if (mood !== "chat") c.mood = mood;
    c.n = (c.n || 0) + 1;
    if (s_keepChat(this)) (this.settings.chatMemory ||= []).push({ at: Date.now(), text: String(text).slice(0, 300), mood });   // 给每周更新陪伴档案用，不进日记
    if (this.settings.chatMemory && this.settings.chatMemory.length > 300) this.settings.chatMemory.splice(0, this.settings.chatMemory.length - 300);
    c.last = Date.now();
    this.saveSoon();
    return r.html + (idleLong ? "\n\n<i>（还在对话模式，说「退出」回到记录模式）</i>" : "");
  }
  // 自动进入的对话超时了：收尾、说一声
  async chatTick() {
    const c = this.settings.chat;
    if (!c || c.mode !== "auto" || this.chatActive()) return;
    const ended = await this.chatEnd();
    if (ended && ended.n) await this.tg(`📝 ${this.settings.chatIdleMin} 分钟没说话，我先回到记录模式啦 🐸\n想接着聊就再找我`, "");
  }

  // ---------- 🐸 打招呼、呱、谢谢：不用等模型，马上回一句；带上今天的状态 ----------
  async todayStatus() {
    const np = this.nautilus();
    const day = this.wToday();
    const out = { doing: [], done: 0, open: 0, lastDone: null, trained: false };
    try {
      const items = np ? np.core.parseJournal(await this.wRead(this.wJournalPath(day)), np.settings) : [];
      const tasks = items.filter((i) => i.kind === "task" && !i.container);
      out.doing = tasks.filter((t) => t.state === "open" && t.doing).map((t) => t.label);
      out.done = tasks.filter((t) => t.state === "done").length;
      out.open = tasks.filter((t) => t.state === "open").length;
      out.lastDone = tasks.filter((t) => t.state === "done" && t.stamp != null).sort((a, b) => b.stamp - a.stamp)[0]?.label || null;
    } catch (e) { /* 螺旋日程没开就少说两句 */ }
    out.trained = (await this.workoutStats(day)).gap === 0;
    return out;
  }
  async chitchat(said) {
    if (!this.settings.chitchat) return null;
    const s = String(said || "").trim();
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const short = (x) => this.esc(x.length > 24 ? x.slice(0, 24) + "…" : x);
    const h = new Date().getHours();
    let kind = null;
    if (/^(?:[呱瓜][!！~～。.\s]*)+$/.test(s)) kind = "gua";
    else if (/^(?:哈喽|哈啰|哈罗|hello|hi|hey|嗨|嘿|你好|在吗|在不在|喂|yo)[!！~～。.?？\s]*$/i.test(s)) kind = "hello";
    else if (/^(?:谢谢|谢啦|多谢|thx|thanks|thank you|辛苦了|爱你|么么哒?|贴贴|抱抱)[!！~～。.\s]*$/i.test(s)) kind = "thanks";
    if (!kind) return null;
    const st = await this.todayStatus();
    const lines = [];
    if (kind === "gua") {
      const n = Math.min(([...s].filter((c) => c === "呱" || c === "瓜").length || 1) + 1, 7);
      lines.push(`${"呱".repeat(n)}！🐸`);
      lines.push(pick(["听到呱声就知道你心情不错 😆", "收到一只开心的你 ✨", "呱回去！今天是有什么好事吗？👀", "这个呱听起来很有精神 💚", "开心就多呱两声，我都接着 🫶"]));
      if (st.doing.length) lines.push(`⭐ 一边做「${short(st.doing[0])}」一边呱，状态很可以`);
      else if (st.lastDone) lines.push(`🎉 是因为刚搞定「${short(st.lastDone)}」吗`);
      else if (st.done >= 5) lines.push(`💪 今天已经做完 ${st.done} 件了，呱得理直气壮`);
      if (st.trained) lines.push(pick(["🏋️ 今天还练了，呱上加呱", "🏋️ 练完身体再呱一声，满分"]));
    } else if (kind === "hello") {
      lines.push(h < 5 ? pick(["这么晚还在呀 🌙", "哈喽～夜猫子 🦉"]) : h < 11 ? pick(["早呀 ☀️", "哈喽，早上好 🌤"]) : h < 14 ? "中午好 🍚" : h < 18 ? pick(["下午好 ☕️", "哈喽～ 🙌"]) : pick(["晚上好 🌙", "哈喽～今天辛苦啦 🫶"]));
      if (st.doing.length) lines.push(`⭐ 你在做「${short(st.doing[0])}」`);
      if (st.done) lines.push(`✅ 今天已经做完 ${st.done} 件了`);   // 打招呼不提还剩多少，免得有压力
      if (h < 5) lines.push(pick(["别熬太狠，困了就说一声「睡了」😴", "今天的事可以明天再接着来 🌙"]));
      lines.push(pick(["想聊什么都可以，回「?」看今天的螺旋 🌀", "我在，随时说 💬", "有事说事，没事呱一声也行 🐸"]));
    } else {
      lines.push(pick(["不客气呀 🫶", "嘿嘿，收到 💚", "我一直在 🫂", "贴贴 🐸"]));
      if (h < 5) lines.push("该睡啦，晚安 🌙");
    }
    return lines.join("\n");
  }
  // 情绪短句：难受 → low，开心 → happy；任务行、链接、长摘录不算
  moodOf(s) {
    s = String(s || "").trim();
    if (!this.settings.comfort || s.length > 40 || /^(?:TODO|DONE|DOING|LATER|NOW|FAILED|WAITING|CANCELED)\b/.test(s) || /https?:\/\//.test(s)) return null;
    const t = s.replace(FEEL_SKIP, "");
    if (FEEL_RE.test(t)) return "low";
    if (HAPPY_RE.test(t)) return "happy";
    return null;
  }
  isFeeling(s) { return this.moodOf(s) === "low"; }
  // 陪聊消息的 message_id → 对话，回复那条消息就接着聊；6 小时后过期
  rememberThread(id, history, mood = "low") {
    const m = (this.comfortThreads ||= new Map());
    m.set(id, { history, mood, at: Date.now() });
    for (const [k, v] of m) if (Date.now() - v.at > 6 * 3600e3 || m.size > 30) m.delete(k);
  }
  threadOf(id) {
    const t = this.comfortThreads?.get(id);
    return t && Date.now() - t.at < 6 * 3600e3 ? t.history : null;
  }
  threadMood(id) { return this.comfortThreads?.get(id)?.mood || "low"; }

  // 插电时不让 Mac 闲置睡眠（屏幕照样息屏）：睡着了 Obsidian 不运行，什么提醒都发不出去
  keepAwake() {
    const on = this.settings.enabled && this.settings.tgAway && this.settings.keepAwakeAC;
    if (on && !this.caf) {
      this.caf = spawn("caffeinate", ["-s", "-w", String(process.pid)], { stdio: "ignore" });
      this.caf.on("exit", () => { this.caf = null; });
    } else if (!on && this.caf) { this.caf.kill(); this.caf = null; }
  }
  onunload() { if (this.caf) this.caf.kill(); }

  send(title, body, { kind = "other", file, line, sound = false, force = false, onClick } = {}) {
    if (!force && (!this.settings.enabled || Date.now() < this.settings.snoozeUntil)) return;
    if (this.settings.tgAway && (this.away() || force === "tg")) this.tg(title, body);
    try {
      const n = new Notification(title, { body, silent: !sound });
      const rec = { n, kind };
      this.live.push(rec);
      n.onclose = () => { this.live = this.live.filter((x) => x !== rec); };
      n.onclick = () => {
        window.focus();
        if (onClick) onClick();
        else if (file) this.app.workspace.getLeaf(false).openFile(file, line != null ? { eState: { line } } : undefined);
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

  // ================= 训练提醒 =================
  // 日界跟螺旋日程走（凌晨 7 点前算前一天）；螺旋日程没开时按 7 点算
  wCutoff() { const np = this.nautilus(); return (np?.settings.dayCutoff ?? 7) * 60; }
  wToday() {
    const np = this.nautilus();
    if (np) return np.today().clone();
    const m = moment();
    if (m.hours() * 60 + m.minutes() < this.wCutoff()) m.subtract(1, "day");
    return m.startOf("day");
  }
  wNorm(t) { return t < this.wCutoff() ? t + 1440 : t; }
  wJournalPath(day) {
    const np = this.nautilus();
    return np ? np.journalPath(day) : `日记/${day.format("YYYY_MM_DD")}.md`;
  }
  async wRead(path) {
    const f = this.app.vault.getAbstractFileByPath(path);
    return f instanceof TFile ? await this.app.vault.cachedRead(f) : "";
  }

  // 训练计划里的「- 周模板｜」：{ 每天: {label, items}, 周一: {...}, ... }，外加「- 保底版｜」第一条
  async readPlan() {
    const lines = (await this.wRead(this.settings.planPath)).split("\n");
    const groups = {};
    let fallback = null;
    const i = lines.findIndex((l) => /^- 周模板[｜|]/.test(l));
    if (i >= 0) {
      let cur = null, m;
      for (let j = i + 1; j < lines.length; j++) {
        const l = lines[j];
        if (/^\S/.test(l)) break;
        if ((m = /^\t- (每天|周[一二三四五六日天])(?:\s*[｜|]\s*(.*?))?\s*$/.exec(l))) groups[m[1].replace("周天", "周日")] = cur = { label: m[2] || "", items: [] };
        else if (cur && (m = /^\t\t- (.+)$/.exec(l))) cur.items.push(m[1].trim());
      }
    }
    const k = lines.findIndex((l) => /^- 保底版[｜|]/.test(l));
    if (k >= 0 && /^\t- /.test(lines[k + 1] || "")) fallback = lines[k + 1].replace(/^\t- /, "").replace(/\*\*/g, "").trim();
    return { groups, fallback };
  }

  // 今天的安排：类型（力量 / 有氧 / 休息）、条目、算「主要训练做了没」用的关键词（去掉每天都有的那条）
  todayPlan(plan, day) {
    const wd = WEEKDAYS[day.day()];
    const g = plan.groups[wd];
    const daily = plan.groups["每天"]?.items || [];
    const items = g?.items || [];
    const words = new Set(items.flatMap(exWords));
    const dailyWords = new Set(daily.flatMap(exWords));
    let main = [...words].filter((w) => !dailyWords.has(w));
    if (!main.length) main = [...words];
    const cardio = items.length && items.every((x) => exWords(x).every((w) => CARDIO.includes(w)));
    if (cardio) main = [...new Set([...main, ...CARDIO])];   // 有氧日：跑步、篮球、游泳……做了哪样都算
    const kind = !items.length ? "休息" : cardio ? "有氧" : "力量";
    return { wd, kind, label: g?.label || kind, items, daily, main };
  }

  // 本周（周一起）练了几天、离上次练过去几天（0 = 今天练过）
  async workoutStats(day) {
    const memo = {};
    const trained = async (d) => {
      const k = d.format("YYYYMMDD");
      return (memo[k] ??= doneExLines(await this.wRead(this.wJournalPath(d))).length > 0);
    };
    let weekDays = 0;
    for (let d = day.clone().startOf("isoWeek"); !d.isAfter(day, "day"); d.add(1, "day")) if (await trained(d)) weekDays++;
    let gap = 31;
    for (let i = 0; i <= 30; i++) if (await trained(day.clone().subtract(i, "day"))) { gap = i; break; }
    return { weekDays, gap };
  }

  // 体重记录表：按天均值 → 本周、上周周均
  async weightWeeks(day) {
    const all = (await this.wRead(this.settings.weightPath)).split("\n");
    const hdr = (all.find((l) => /^\|\s*日期\s*\|/.test(l)) || "").split("|").slice(1, -1).map((s) => s.trim());
    const wi = hdr.indexOf("体重kg");
    const byDay = {};
    let last = null;
    for (const l of all.filter((x) => /^\|\s*\d{4}-\d{2}-\d{2}/.test(x))) {
      const c = l.split("|").slice(1, -1).map((s) => s.trim());
      const v = parseFloat(c[wi]);
      if (!Number.isFinite(v)) continue;
      (byDay[c[0]] ||= []).push(v);
      last = { date: c[0], v };
    }
    const avg = (from) => {
      const vs = [];
      for (let i = 0; i < 7; i++) { const a = byDay[from.clone().add(i, "day").format("YYYY-MM-DD")]; if (a) vs.push(a.reduce((x, y) => x + y) / a.length); }
      return vs.length ? vs.reduce((x, y) => x + y) / vs.length : null;
    };
    const mon = day.clone().startOf("isoWeek");
    return { thisWeek: avg(mon), lastWeek: avg(mon.clone().subtract(7, "day")), last };
  }

  // 打开今天的日记；append 为真时把今天的训练写成顶层 TODO（已有同样文字的行就跳过）
  async openTodayWorkout(append) {
    const day = this.wToday();
    const path = this.wJournalPath(day);
    let f = this.app.vault.getAbstractFileByPath(path);
    if (!(f instanceof TFile)) f = await this.app.vault.create(path, `---\njournal: 每日\njournal-date: ${day.format("YYYY-MM-DD")}\n---\n`);
    if (append) {
      const tp = this.todayPlan(await this.readPlan(), day);
      const want = [...tp.daily, ...tp.items];
      let added = 0;
      await this.app.vault.process(f, (txt) => {
        const add = want.filter((x) => !txt.includes(x)).map((x) => `- TODO ${x}`);
        added = add.length;
        if (!add.length) return txt;
        return (txt.endsWith("\n") || !txt ? txt : txt + "\n") + add.join("\n") + "\n";
      });
      new Notice(added ? `已把今天的 ${added} 条训练写进日记` : "今天的训练已经在日记里了");
    }
    await this.app.workspace.getLeaf(false).openFile(f);
  }

  async workoutTick({ fromEdit = false, force = null } = {}) {
    const s = this.settings;
    if (!force && !s.workout && !s.weigh && !s.review) return;
    const day = this.wToday();
    const dayKey = day.format("YYYY-MM-DD");
    if (s.wDay !== dayKey) { s.wDay = dayKey; s.wState = {}; }
    const st = (s.wState ||= {});
    const nowM = moment();
    const now = this.wNorm(nowM.hours() * 60 + nowM.minutes());
    // 到点后两小时内都补发（Obsidian 那会儿没开着也不至于整天漏掉）
    const due = (hhmm, flag) => { const t = toMin(hhmm); if (t == null || st[flag]) return false; const at = this.wNorm(t); return now >= at && now - at < 120; };
    const wd = WEEKDAYS[day.day()];
    let dirty = false;

    // ---------- 称重日：当天第一次动日记时 ----------
    if (s.weigh && fromEdit && !st.weigh && s.weighDays.split(/[,，、\s]+/).some((x) => x && wd.endsWith(x.replace(/^周/, "")))) {
      st.weigh = dirty = true;
      const w = await this.weightWeeks(day);
      const lastTxt = w.last ? `表里最近一条：${w.last.date.slice(5)} ${w.last.v}kg。` : "";
      this.send("⚖️ 今天是称重日", `起床后先称：如厕后、空腹、赤脚。称完截图发 Telegram bot。${lastTxt}`, { kind: "weigh" });
    }

    const needStart = force === "start" || (s.workout && due(s.workoutAt, "start"));
    const needChase = !force && s.workout && due(s.workoutChaseAt, "chase");
    const needReview = force === "review" || (s.review && wd === "周日" && due(s.workoutChaseAt, "review"));
    if (!needStart && !needChase && !needReview) { if (dirty) this.saveSoon(); return; }

    const plan = await this.readPlan();
    const tp = this.todayPlan(plan, day);
    const stats = await this.workoutStats(day);
    const today = doneExLines(await this.wRead(this.wJournalPath(day)));
    const mainDone = today.some((l) => tp.main.some((w) => l.includes(w)));
    const fallback = plan.fallback || "引体向上 3 组 + 徒手深蹲 3×15，交替着做，10 分钟做完，记成 DONE，算一次训练";
    const missed = stats.gap >= s.workoutGapDays ? `已经 ${stats.gap} 天没练了。` : "";
    const openDiary = () => this.openTodayWorkout(true);
    const opts = { kind: "workout", sound: true, force: !!force, onClick: openDiary };

    if (needStart) {
      st.start = dirty = true;
      if (tp.kind !== "休息" && (!mainDone || force)) {
        this.send(`💪 ${tp.wd} · ${tp.label}`, `${missed}${tp.items.join("；")}　· 本周已练 ${stats.weekDays} 天 · 点这里把待办写进日记`, opts);
      } else if (tp.kind === "休息" && (missed || force)) {
        this.send(missed ? `⏳ ${missed.replace(/。$/, "")}` : `😴 ${tp.wd}休息`, missed ? `今天是休息日，但别让它断下去：${fallback}` : `今天只做：${tp.daily.join("；") || "休息"}`, { ...opts, onClick: () => this.openTodayWorkout(false) });
      } else if (force) {
        this.send(`✅ ${tp.wd}的训练已经做了`, `本周已练 ${stats.weekDays} 天`, opts);
      }
    }
    if (needChase) {
      st.chase = dirty = true;
      if (tp.kind !== "休息" && !mainDone) this.send(`⌛ 今天的${tp.label}还没练`, `来不及整套就做保底版：${fallback}`, opts);
    }
    if (needReview) {
      st.review = dirty = true;
      const w = await this.weightWeeks(day);
      const f1 = (x) => x.toFixed(1);
      let wTxt = "本周还没有体重数据（截图要等定时任务补进表格）";
      if (w.thisWeek != null) {
        const d = w.lastWeek != null ? w.thisWeek - w.lastWeek : null;
        wTxt = `周均 ${f1(w.thisWeek)}kg` + (d != null ? `（上周 ${f1(w.lastWeek)}，${d <= 0 ? "↓" : "↑"}${f1(Math.abs(d))}）` : "");
      }
      const dash = this.app.vault.getAbstractFileByPath(s.dashboardPath);
      this.send("📊 本周复盘", `练了 ${stats.weekDays} 天（目标 5：3 力量 + 2 有氧）· ${wTxt}`, {
        kind: "review", force: !!force, onClick: () => dash instanceof TFile && this.app.workspace.getLeaf(false).openFile(dash),
      });
    }
    this.saveSoon();
  }

  async tick({ fromEdit = false, forceBrief = false } = {}) {
    this.keepAwake();   // 设置里开关改了也跟着生效
    try { await this.reportTick(); await this.pushTick(); await this.chatTick(); } catch (e) { console.error("[nautilus-notify] 定时推送", e); }
    try { await this.workoutTick({ fromEdit }); } catch (e) { console.error("[nautilus-notify] 训练提醒", e); }
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
    np.withCalendar?.(items, day);   // macOS 日历里的事件也算固定事件（螺旋日程设置里打开时）
    const plan = core.schedule(items, cfg, now, 0);
    const doneTimes = cfg.doneTimes?.[dayKey] || {};
    const tasks = items.filter((t) => stateOf(t) && (t.kind === "task" || t.pinned));
    const doneTasks = tasks.filter((t) => t.state === "done");
    // 下一件：排到的时间最早的（小任务会补位到前面的空档，不一定是列表里的下一行）
    const nextUp = plan.queue.filter((t) => t.segments.length > t.workedN && !t.doing).sort((a, b) => a.segments[a.workedN][0] - b.segments[b.workedN][0])[0];
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
        if (s.workout && exWords(t.label).length) {
          const w = await this.workoutStats(this.wToday());
          parts.push(`本周练了 ${w.weekDays} 天 💪`);
        }
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
    // 日历事件不在这里提醒：「日历」App 自己有提醒
    for (const e of items.filter((i) => i.kind === "event" && i.state !== "done" && !i.cal)) {
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

    containerEl.createEl("h3", { text: "训练提醒" });
    containerEl.createEl("p", { text: "训练内容读「训练计划」里的周模板，改训练就改那份笔记。时间写 HH:MM，日界前（凌晨 7 点前）都算当天。", cls: "setting-item-description" });
    const text = (name, desc, key, check = () => true) => new Setting(containerEl).setName(name).setDesc(desc).addText((t) => t.setValue(String(s[key])).onChange(async (v) => { if (check(v)) { s[key] = v.trim(); await save(); } }));
    const isClock = (v) => toMin(v) != null;
    toggle("开练 / 追提醒", "训练日到点提醒今天练什么；到追提醒的时间主要训练还没打勾，就提醒做保底版；断档太久休息日也提醒", "workout");
    text("　开练提醒时间", "点通知会打开今天的日记，并写入今天的训练待办", "workoutAt", isClock);
    text("　追提醒时间", "周日这个时间发周复盘", "workoutChaseAt", isClock);
    num("　连着几天没练算断档", "workoutGapDays");
    toggle("称重提醒", "称重日当天第一次动日记时提醒", "weigh");
    text("　称重日", "用逗号分开，比如 一,三,五,日", "weighDays");
    toggle("周日周复盘", "本周练了几天、周均体重和上周比；点通知打开健康看板", "review");
    text("　训练计划笔记", "", "planPath");
    text("　体重记录笔记", "", "weightPath");
    text("　健康看板笔记", "", "dashboardPath");

    containerEl.createEl("h3", { text: "不在电脑前时转发到 Telegram" });
    containerEl.createEl("p", { text: "键盘鼠标一阵子没动或锁屏时，上面所有提醒除了照常弹通知，还会用 Telegram Inbox 的 bot 发到你的 Telegram。chat id 空着时，给 bot 发一条消息它就会记下。Mac 睡着时 Obsidian 不运行，什么都发不出去，所以默认插电时不让它闲置睡眠（屏幕照样息屏，合盖照样睡）。", cls: "setting-item-description" });
    toggle("转发到 Telegram", "", "tgAway");
    num("　多久没动算不在（分钟）", "tgAwayMin");
    text("　Telegram chat id", "一般不用填，自动从 Telegram Inbox 插件取", "tgChatId");
    const isClockOrEmpty = (v) => toMin(v) != null;
    containerEl.createEl("h3", { text: "Telegram 推送" });
    toggle("🏋️ 健身早报", "今天练什么、本周练了几天、是不是称重日", "pushWorkout");
    text("　时间", "", "pushWorkoutAt", isClockOrEmpty);
    toggle("🐢 拖延任务", "今天日记里「← [[日期]]」拖了好几天的 TODO，每件带「不做了 / 挪明天 / 搁置」按钮", "pushStale");
    text("　时间", "", "pushStaleAt", isClockOrEmpty);
    num("　拖了几天算", "staleDays");
    toggle("🃏 闪卡到期", "借第二大脑插件问 Anki，要 Anki 开着；没到期的就不发", "pushCards");
    text("　时间", "", "pushCardsAt", isClockOrEmpty);
    toggle("🌸 经期预测", "按经期记录算平均周期，提前 3 天和预计当天各提醒一次", "pushPeriod");
    text("　时间", "", "pushPeriodAt", isClockOrEmpty);
    text("　经期记录笔记", "", "periodPath");
    text("　称呼", "通知里怎么称呼对方，比如「她」", "periodWho");
    toggle("🧭 周日周洞察", "claude 读这一周的日记写「这周做了什么」，发到 Telegram，也存一份到下面的笔记", "pushInsight");
    text("　时间（每周日）", "", "pushInsightAt", isClockOrEmpty);
    text("　存到", "", "insightPath");
    toggle("🫂 陪你聊", "在 Telegram 里说「好累」「好难受」「好开心」「搞定了」之类的短句，或者回复它的陪聊消息时，读陪伴档案和最近的日记回你", "comfort");
    num("💬 自动进入的对话模式，多少分钟没说话回到记录模式", "chatIdleMin");
    toggle("🔄 每周日更新陪伴档案", "读这周的日记、库周报、长期项目复盘、周洞察和作息训练，重写档案末尾的「近况」；发现长期的新特点时发到 Telegram，点 ✅ 才写进档案上面那几节", "profileUpdate");
    text("　时间（每周日）", "", "profileUpdateAt", isClockOrEmpty);
    toggle("　参考这周在对话模式里说过的话", "对话内容只存在本插件的数据里，不进日记和笔记，每次更新完就清空", "profileUseChat");
    text("　库周报笔记", "第二大脑生成的", "profileReportPath");
    text("　长期项目复盘文件夹", "取文件名排最后的那一期", "projectReviewDir");
    toggle("🐸 打招呼和呱", "「哈喽」「呱呱呱」「谢谢」这类话马上回一句（不用等模型），带上今天在做什么、做完几件；这些话不记进日记", "chitchat");
    text("　陪伴档案笔记", "写着「我是谁、累的时候是因为什么、怎么回我」，直接改它就能改回复的方式", "comfortProfile");
    text("　claude 命令行路径", "周洞察和收工小结用它（用命令行自己的登录）", "claudePath");
    text("定时推送螺旋日程", "这几个时刻把螺旋日程图文版（⭐ 正在做、接下来、排不下……）发到 Telegram，不管人在不在电脑前；用逗号分开，空着就不推", "tgReportTimes", (v) => !v.trim() || v.split(/[,，、\s]+/).filter(Boolean).every((x) => toMin(x) != null));
    new Setting(containerEl).setName("插电时不让 Mac 闲置睡眠").setDesc("用 caffeinate -s，只在接电源时生效；Obsidian 退出就失效").addToggle((t) => t.setValue(s.keepAwakeAC).onChange(async (v) => { s.keepAwakeAC = v; await save(); this.plugin.keepAwake(); }));
  }
}
