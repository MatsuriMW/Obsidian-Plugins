var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => AtomCreator
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SUPERTAGS = [
  {
    id: "atom",
    tag: "#atom",
    name: "Atom",
    color: "#7c3aed",
    folder: "Notes/",
    frontmatterTemplate: [
      "type:",
      "  - atom",
      "status:",
      "  - seedling",
      "up: []",
      "created: {{date}}",
      'day: "[[{{dateLink}}]]"'
    ].join("\n"),
    bodyTemplate: [
      "> {{title}}",
      "",
      "{{content}}",
      "## North",
      "*Where X comes from*",
      "-",
      "",
      "## West",
      "*What's similar to X*",
      "-",
      "",
      "## East",
      "*What's opposite of X*",
      "-",
      "",
      "## South",
      "*Where this idea can be linked to*",
      "-",
      "",
      "### Reference",
      "-"
    ].join("\n")
  }
];
var DEFAULT_SETTINGS = {
  supertags: DEFAULT_SUPERTAGS,
  debounceMs: 2e3,
  watchFolders: "Calendar/"
};
function randomId() {
  return Math.random().toString(36).slice(2, 8);
}
var AtomCreatorSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Watch folders").setDesc("Comma-separated folders monitored for supertags (e.g. calendar/, inbox/).").addText((text) => text.setPlaceholder("Calendar/").setValue(this.plugin.settings.watchFolders).onChange(async (value) => {
      this.plugin.settings.watchFolders = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Debounce delay (ms)").setDesc("Wait time after last edit before processing (minimum 500 ms).").addText((text) => text.setPlaceholder("2000").setValue(String(this.plugin.settings.debounceMs)).onChange(async (value) => {
      const n = parseInt(value);
      if (!isNaN(n) && n >= 500) {
        this.plugin.settings.debounceMs = n;
        await this.plugin.saveSettings();
      }
    }));
    new import_obsidian.Setting(containerEl).setName("Tag definitions").setHeading();
    containerEl.createEl("p", {
      text: "Each supertag defines a trigger tag, a destination folder, and templates for the frontmatter and body of the created note.",
      cls: "setting-item-description"
    });
    const supertagsContainer = containerEl.createDiv();
    this.renderSupertags(supertagsContainer);
    new import_obsidian.Setting(containerEl).addButton((btn) => btn.setButtonText("Add supertag").setCta().onClick(async () => {
      this.plugin.settings.supertags.push({
        id: randomId(),
        tag: "#newtag",
        name: "New tag",
        color: "#0ea5e9",
        folder: "Notes/",
        frontmatterTemplate: "type:\n  - note\ncreated: {{date}}",
        bodyTemplate: "> {{title}}\n\n{{content}}"
      });
      await this.plugin.saveSettings();
      this.display();
    }));
  }
  renderSupertags(container) {
    container.empty();
    for (const [index, supertag] of this.plugin.settings.supertags.entries()) {
      const card = container.createDiv({ cls: "st-card" });
      const header = card.createDiv({ cls: "st-card-header" });
      const chip = header.createEl("span", { cls: "st-settings-chip" });
      chip.textContent = supertag.tag;
      chip.setCssProps({ "--st-chip-bg": supertag.color });
      const deleteBtn = header.createEl("button", { text: "Remove", cls: "st-delete-btn" });
      deleteBtn.onclick = () => void (async () => {
        this.plugin.settings.supertags.splice(index, 1);
        await this.plugin.saveSettings();
        this.display();
      })();
      const row1 = card.createDiv({ cls: "st-grid-2" });
      this.inlineInput(row1, "Tag", supertag.tag, async (v) => {
        supertag.tag = v.startsWith("#") ? v : "#" + v;
        chip.textContent = supertag.tag;
        await this.plugin.saveSettings();
        this.plugin.refreshDecorations();
      });
      this.inlineInput(row1, "Name", supertag.name, async (v) => {
        supertag.name = v;
        await this.plugin.saveSettings();
      });
      const row2 = card.createDiv({ cls: "st-grid-color" });
      const colorWrap = row2.createDiv();
      colorWrap.createEl("small", { text: "Color", cls: "setting-item-description" });
      const colorInput = colorWrap.createEl("input", { type: "color" });
      colorInput.addClass("st-color-input");
      colorInput.value = supertag.color;
      colorInput.oninput = () => void (async () => {
        supertag.color = colorInput.value;
        chip.setCssProps({ "--st-chip-bg": supertag.color });
        await this.plugin.saveSettings();
        this.plugin.refreshDecorations();
      })();
      this.inlineInput(row2, "Destination folder", supertag.folder, async (v) => {
        supertag.folder = v.endsWith("/") ? v : v + "/";
        await this.plugin.saveSettings();
      });
      this.inlineTextarea(card, "Frontmatter template", supertag.frontmatterTemplate, async (v) => {
        supertag.frontmatterTemplate = v;
        await this.plugin.saveSettings();
      });
      this.inlineTextarea(card, "字段 Fields（键: 默认值，一行一个；新建页面写进属性，整理日记时插到 [[标签名]] 下面让你填）", supertag.fields || "", async (v) => {
        supertag.fields = v;
        await this.plugin.saveSettings();
      });
      this.inlineTextarea(card, "Body template", supertag.bodyTemplate, async (v) => {
        supertag.bodyTemplate = v;
        await this.plugin.saveSettings();
      });
      card.createEl("small", {
        text: "变量：{{title}} 标题、{{date}} 今天（YYYY-MM-DD）、{{source}} 来源笔记名（如 2026_09_30）、{{content}} 子项。行内 [键:: 值]、子项「键:: 值」、#键/值 会写进同名属性",
        cls: "setting-item-description"
      });
    }
  }
  inlineInput(container, label, value, onChange) {
    const wrap = container.createDiv();
    wrap.createEl("small", { text: label, cls: "setting-item-description" });
    const input = wrap.createEl("input", { type: "text" });
    input.addClass("st-full-input");
    input.value = value;
    input.oninput = () => {
      void onChange(input.value);
    };
  }
  inlineTextarea(container, label, value, onChange) {
    const wrap = container.createDiv({ cls: "st-textarea-wrap" });
    wrap.createEl("small", { text: label, cls: "setting-item-description" });
    const ta = wrap.createEl("textarea");
    ta.addClass("st-textarea");
    ta.value = value;
    ta.rows = 4;
    ta.oninput = () => {
      void onChange(ta.value);
    };
  }
};

// src/processor.ts —— 自用版改写（2026-09-30）：
//   · 标签按边界匹配：#选题 不会命中 #选题/草稿，#小说 不会命中 #小说选题
//   · 标题去掉列表符号 / 任务关键字 / 复选框 / 块 ID / 行内字段 / 其它标签，文件名非法字符去掉
//   · 字段：行内 [键:: 值]、子项「键:: 值」、#键/值（#选题/草稿 记作 状态）写进新页属性，覆盖模板里的同名键
//   · 同名笔记已经存在（库里任何位置）：不新建，原行换成链接，字段写进那篇、子项追加到那篇末尾
//   · 变量：{{title}} {{date}} {{source}}（来源笔记名，如 2026_09_30）{{content}}
//   · Bike 开着这篇日记：Bike 里有没保存的改动就等它存完再处理；处理完让 Bike 重新载入，免得被 Bike 的自动保存覆盖
var import_obsidian2 = require("obsidian");
function renderTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    var _a;
    return (_a = vars[key]) != null ? _a : "";
  });
}
// 字段（Field）：每个 supertag 可以单独定义一组「键: 默认值」（一行一个）。
//   · 新建页面时和属性模板合在一起写进属性；已有页面缺的补上
//   · 日记整理（journal-tidy）碰到写了 [[标签名]] 的列表项，会把这些字段作为子项「键:: 默认值」插在下面，让你填
function fmTemplateOf(st) {
  return st.fields && st.fields.trim() ? st.frontmatterTemplate.replace(/\s*$/, "") + "\n" + st.fields.trim() : st.frontmatterTemplate;
}
function parseFieldDefs(text) {
  const out = [];
  for (const line of String(text || "").split("\n")) {
    const m = line.match(/^([^:#\s][^:]*?):\s*(.*)$/);
    if (!m) continue;
    const v = m[2].trim();
    out.push({ key: m[1].trim(), def: /^\[\s*\]$/.test(v) ? "" : v.replace(/^\[|\]$/g, "").replace(/^"(.*)"$/, "$1") });
  }
  return out;
}
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function tagRe(tag, flags) {
  return new RegExp(`(?<![\\w#/&])${escRe(tag)}(?![\\w/\\-\\u3400-\\u9fff])`, flags || "i");
}
const PREFIX_RE = /^(\s*(?:[-*+]|\d+[.)])?\s*(?:\[.\]\s+)?(?:(?:TODO|DOING|DONE|NOW|LATER|WAITING|CANCELL?ED|FAILED)\s+)?)/;
const FIELD_RE = /\[([^\[\]:]+?)::\s*([^\]]*)\]/g;
const CHILD_FIELD_RE = /^\s*(?:[-*+]\s+)?([^\s:：\[\]#][^:：\[\]#]{0,15}?)::\s*(.+)$/;
function fmValue(v) {
  const s = String(v).trim();
  if (s === "") return "";
  if (/^-?\d+(\.\d+)?$/.test(s)) return s;
  return JSON.stringify(s);
}
// 把字段写进 YAML 文本：同名顶层键替换（连同它下面的列表行），没有就追加
function applyFields(yaml, fields) {
  let lines = yaml.split("\n");
  for (const [k, v] of Object.entries(fields)) {
    const i = lines.findIndex((l) => l.startsWith(k + ":"));
    const isList = i >= 0 && (/:\s*\[.*\]\s*$/.test(lines[i]) || /^\s+-/.test(lines[i + 1] || ""));
    const val = isList ? "[" + String(v).split(/\s*[,，、]\s*/).filter(Boolean).map(fmValue).join(", ") + "]" : fmValue(v);
    const line = `${k}: ${val}`;
    if (i < 0) { lines.push(line); continue; }
    let j = i + 1;
    while (j < lines.length && /^\s+/.test(lines[j])) j++;
    lines.splice(i, j - i, line);
  }
  return lines.join("\n");
}
function buildNote(supertag, title, subLines, fields, source) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const dateLink = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
  const content = subLines.length ? subLines.map((l) => "- " + l).join("\n") + "\n\n" : "";
  const vars = { title, date, dateLink, content, source };
  const frontmatter = applyFields(renderTemplate(fmTemplateOf(supertag), vars), fields);
  const body = renderTemplate(supertag.bodyTemplate, vars);
  return `---
${frontmatter}
---

${body}
`;
}
// ---- Bike ----
function osa(script) {
  let execFile;
  try { execFile = require("child_process").execFile; } catch (e) { return Promise.resolve(""); }
  return new Promise((res) => execFile("osascript", ["-l", "JavaScript", "-e", script], { timeout: 5000 }, (err, out) => res(err ? "" : String(out).trim())));
}
async function bikeState(fullPath) {
  const r = await osa(`const b=Application("Bike"); if(!b.running()) "none"; else { const d=b.documents().find(x=>{try{return x.file().toString()===${JSON.stringify(fullPath)}}catch(e){return false}}); d ? (d.modified() ? "modified" : "clean") : "none" }`);
  return r || "none";
}
async function bikeReload(fullPath) {
  await osa(`const b=Application("Bike"); const d=b.documents().find(x=>{try{return x.file().toString()===${JSON.stringify(fullPath)}}catch(e){return false}}); if(d && !d.modified()){ d.close({saving:"no"}); b.open(Path(${JSON.stringify(fullPath)})); "ok" } else "skip"`);
}
function showUndoNotice(action, vault, workspace, fileManager) {
  for (const created of action.created) {
    const fragment = document.createDocumentFragment();
    const container = fragment.createEl("div", { cls: "st-notice-container" });
    const header = container.createEl("div", { cls: "st-notice-header" });
    const chip = header.createEl("span", { cls: "st-notice-chip" });
    chip.textContent = created.supertag.tag;
    chip.setCssProps({ "--st-chip-bg": created.supertag.color });
    header.createEl("span", { text: `"${created.title}"${created.existed ? "（已有，已关联）" : ""}` });
    const btnRow = container.createEl("div", { cls: "st-notice-btn-row" });
    const viewBtn = btnRow.createEl("button", { text: "打开", cls: "st-notice-btn" });
    const notice = new import_obsidian2.Notice(fragment, 8e3);
    viewBtn.onclick = () => void (async () => {
      const file = vault.getAbstractFileByPath(created.path);
      if (file instanceof import_obsidian2.TFile) {
        const leaf = workspace.getLeaf("tab");
        await leaf.openFile(file);
      }
      notice.hide();
    })();
    if (!created.existed) {
      const undoBtn = btnRow.createEl("button", { text: "撤销", cls: "st-notice-btn" });
      undoBtn.onclick = () => void (async () => {
        notice.hide();
        await undoAction(action, vault, fileManager);
      })();
    }
  }
}
async function undoAction(action, vault, fileManager) {
  for (const created of action.created) {
    if (created.existed) continue;
    const file = vault.getAbstractFileByPath(created.path);
    if (file instanceof import_obsidian2.TFile) {
      await fileManager.trashFile(file);
    }
  }
  const sourceFile = vault.getAbstractFileByPath(action.filePath);
  if (sourceFile instanceof import_obsidian2.TFile) {
    await vault.modify(sourceFile, action.originalContent);
    if (action.fullPath) await bikeReload(action.fullPath);
  }
  new import_obsidian2.Notice("已撤销");
}
function cleanTitle(line, tagRegex) {
  return line
    .replace(PREFIX_RE, "")
    .replace(tagRegex, "")
    .replace(/\s\^[\w-]+\s*$/, "")
    .replace(FIELD_RE, "")
    .replace(/(?<![\w&])#[^\s#]+/g, "")
    .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2")
    .replace(/[\\/:*?"<>|#^\[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .trim();
}
function fieldsOfLine(line) {
  const f = {};
  for (const m of line.matchAll(FIELD_RE)) f[m[1].trim()] = m[2].trim();
  for (const m of line.matchAll(/(?<![\w&])#([^\s#\/]+)\/([^\s#]+)/g)) {
    const k = m[1] === "选题" ? "状态" : m[1];
    f[k] = m[2];
  }
  return f;
}
async function processFile(file, settings, app, attempt = 0) {
  var _a, _b;
  const { vault, workspace, fileManager, metadataCache } = app;
  let content;
  try {
    content = await vault.read(file);
  } catch (e) {
    return;
  }
  // 先粗查一遍，没有任何 supertag 就不去问 Bike
  const lines0 = content.split("\n");
  if (!lines0.some((l) => settings.supertags.some((st) => tagRe(st.tag).test(l)))) return;
  const fullPath = vault.adapter.getFullPath ? vault.adapter.getFullPath(file.path) : null;
  if (fullPath) {
    const st = await bikeState(fullPath);
    if (st === "modified") {
      if (attempt < 20) setTimeout(() => processFile(file, settings, app, attempt + 1), 3000);
      return;
    }
    content = await vault.read(file);   // 问 Bike 的这几百毫秒里文件可能又变了
  }
  const originalContent = content;
  const lines = content.split("\n");
  let modified = false;
  let i = 0;
  const created = [];
  let inCode = false;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) inCode = !inCode;
    const matchedTag = inCode ? null : settings.supertags.find((st) => tagRe(st.tag).test(line));
    if (!matchedTag) {
      i++;
      continue;
    }
    const tagRegex = tagRe(matchedTag.tag, "gi");
    const title = cleanTitle(line, tagRegex);
    if (!title) {
      i++;
      continue;
    }
    const fields = fieldsOfLine(line);
    const baseIndent = ((_a = line.match(/^(\s*)/)) != null ? _a : ["", ""])[1].length;
    const subLines = [];
    let lastSub = i;
    let j = i + 1;
    while (j < lines.length) {
      const sub = lines[j];
      if (sub.trim() === "") {
        j++;
        continue;
      }
      if (((_b = sub.match(/^(\s*)/)) != null ? _b : ["", ""])[1].length <= baseIndent)
        break;
      const fm = sub.match(CHILD_FIELD_RE);
      if (fm) fields[fm[1].trim()] = fm[2].trim();
      else subLines.push(sub.replace(/^[\s*+>-]+/, "").trim());
      lastSub = j;
      j++;
    }
    const notePath = matchedTag.folder + title + ".md";
    const existing = vault.getAbstractFileByPath(notePath) || metadataCache.getFirstLinkpathDest(title, file.path);
    let targetPath = notePath, existed = false;
    try {
      if (existing instanceof import_obsidian2.TFile) {
        existed = true;
        targetPath = existing.path;
        // 已有的页：模板里有值、页上还没有的属性补上（比如 #待读 的 清单 / 状态），显式写的字段覆盖
        let tpl = {};
        try { tpl = (0, import_obsidian2.parseYaml)(renderTemplate(fmTemplateOf(matchedTag), { title, source: file.basename, date: window.moment().format("YYYY-MM-DD") })) || {}; } catch (e) { tpl = {}; }
        await fileManager.processFrontMatter(existing, (fm) => {
          for (const [k, v] of Object.entries(tpl)) if (fm[k] == null && v != null && v !== "" && !(Array.isArray(v) && !v.length)) fm[k] = v;
          for (const [k, v] of Object.entries(fields)) fm[k] = /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
        });
        if (subLines.length) await vault.process(existing, (t) => t.replace(/\s*$/, "") + "\n" + subLines.map((l) => "- " + l).join("\n") + "\n");
      } else {
        if (!vault.getAbstractFileByPath(matchedTag.folder.replace(/\/$/, ""))) await vault.createFolder(matchedTag.folder.replace(/\/$/, "")).catch(() => {});
        await vault.create(notePath, buildNote(matchedTag, title, subLines, fields, file.basename));
      }
    } catch (e) {
      console.error("[supertags-local]", e);
      i++;
      continue;
    }
    created.push({ path: targetPath, supertag: matchedTag, title, existed });
    const prefix = (line.match(PREFIX_RE) || ["", ""])[1];
    const bid = (line.match(/\s\^[\w-]+\s*$/) || [""])[0];
    lines.splice(i, lastSub - i + 1, `${prefix}[[${existed ? targetPath.split("/").pop().replace(/\.md$/, "") : title}]]${bid}`);
    modified = true;
    i++;
  }
  if (!modified)
    return;
  await vault.modify(file, lines.join("\n"));
  if (fullPath) await bikeReload(fullPath);
  const action = { filePath: file.path, originalContent, created, fullPath };
  showUndoNotice(action, vault, workspace, fileManager);
}

// src/decorations.ts
var import_view = require("@codemirror/view");
var import_state = require("@codemirror/state");
var SupertagChip = class extends import_view.WidgetType {
  constructor(label, color) {
    super();
    this.label = label;
    this.color = color;
  }
  toDOM() {
    const chip = document.createElement("span");
    chip.className = "atom-creator-chip";
    chip.textContent = this.label;
    chip.setCssProps({ "--st-chip-bg": this.color });
    return chip;
  }
  eq(other) {
    return other.label === this.label && other.color === this.color;
  }
  ignoreEvent() {
    return true;
  }
};
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function buildSupertagPlugin(getSupertags) {
  return import_view.ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.decorations = this.build(view);
      }
      update(update) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
          this.decorations = this.build(update.view);
        }
      }
      build(view) {
        const supertags = getSupertags();
        if (!supertags.length)
          return import_view.Decoration.none;
        const builder = new import_state.RangeSetBuilder();
        const cursorLine = view.state.doc.lineAt(
          view.state.selection.main.head
        ).number;
        const matches = [];
        for (const { from, to } of view.visibleRanges) {
          let pos = from;
          while (pos <= to) {
            const line = view.state.doc.lineAt(pos);
            if (line.number !== cursorLine) {
              const lineText = line.text;
              for (const tag of supertags) {
                const re = new RegExp(`(?<![\\w#/&])${escapeRegex(tag.tag)}(?![\\w/\\-\\u3400-\\u9fff])`, "gi");
                let m;
                while ((m = re.exec(lineText)) !== null) {
                  matches.push({
                    from: line.from + m.index,
                    to: line.from + m.index + m[0].length,
                    tag
                  });
                }
              }
            }
            if (line.to >= to)
              break;
            pos = line.to + 1;
          }
        }
        matches.sort((a, b) => a.from - b.from);
        let lastTo = -1;
        for (const { from, to, tag } of matches) {
          if (from < lastTo)
            continue;
          builder.add(
            from,
            to,
            import_view.Decoration.replace({
              widget: new SupertagChip(tag.tag, tag.color)
            })
          );
          lastTo = to;
        }
        return builder.finish();
      }
    },
    { decorations: (v) => v.decorations }
  );
}

// src/main.ts
var AtomCreator = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    this.debounceMap = {};
    this.processing = /* @__PURE__ */ new Set();
    this.editorExtension = [];
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new AtomCreatorSettingTab(this.app, this));
    this.editorExtension = [buildSupertagPlugin(() => this.settings.supertags)];
    this.registerEditorExtension(this.editorExtension);
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (!(file instanceof import_obsidian3.TFile))
          return;
        if (!this.isWatched(file.path))
          return;
        if (this.processing.has(file.path))
          return;
        clearTimeout(this.debounceMap[file.path]);
        const run = async () => {
          this.processing.add(file.path);
          try {
            await processFile(file, this.settings, this.app);
          } finally {
            setTimeout(() => this.processing.delete(file.path), 1e3);
          }
        };
        this.debounceMap[file.path] = setTimeout(() => void run(), this.settings.debounceMs);
      })
    );
  }
  onunload() {
    Object.values(this.debounceMap).forEach(clearTimeout);
  }
  isWatched(path) {
    const folders = this.settings.watchFolders.split(",").map((f) => f.trim()).filter(Boolean);
    return folders.some((f) => path.startsWith(f));
  }
  // 给别的插件（日记整理）用：按名字找 supertag 的字段。名字可以是标签（#菜谱）、去掉 # 的标签（菜谱）或显示名
  fieldDefs(name) {
    const n = String(name || "").trim().toLowerCase();
    const st = this.settings.supertags.find((t) => t.fields && t.fields.trim() && [t.tag, t.tag.replace(/^#/, ""), t.name].some((x) => String(x).toLowerCase() === n));
    return st ? parseFieldDefs(st.fields) : [];
  }
  // Called from SettingTab when tag or color changes
  refreshDecorations() {
    this.app.workspace.updateOptions();
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (!Array.isArray(this.settings.supertags)) {
      this.settings.supertags = DEFAULT_SETTINGS.supertags;
    }
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};

/* nosourcemap */