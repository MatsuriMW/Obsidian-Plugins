// 稿件台纯文本处理的断言：node draft-desk/test.js [main.js 路径]（默认同目录的 main.js）
const Module = require("module"); const orig = Module._load;
Module._load = function (r, ...a) { if (r === "obsidian") return new Proxy({}, { get: () => class {} }); return orig.call(this, r, ...a); };
const assert = require("assert");
const T = require(process.argv[2] || require("path").join(__dirname, "main.js"))._test;
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
// 规范排版
const tidy = (s) => { const p = T.protect(s); return p.restore(T.applyTidyRules(p.text)); };
ok(tidy("用GPT写了3篇稿子,然后看[[A股]]走势") === "用 GPT 写了 3 篇稿子，然后看[[A股]]走势", tidy("用GPT写了3篇稿子,然后看[[A股]]走势"));
ok(tidy("见 https://example.com/a,b?x=1 吧") === "见 https://example.com/a,b?x=1 吧", "url");
ok(tidy("代码 `a,b` 和 [链接](http://x.com/中文) 不动") === "代码 `a,b` 和 [链接](http://x.com/中文) 不动", tidy("代码 `a,b` 和 [链接](http://x.com/中文) 不动"));
ok(tidy("真的吗?好!时间:下午") === "真的吗？好！时间：下午", tidy("真的吗?好!时间:下午"));
ok(tidy("这个(括号里是中文)和(english)") === "这个（括号里是中文）和(english)", tidy("这个(括号里是中文)和(english)"));
ok(tidy("a  \n\n\n\nb") === "a\n\nb", JSON.stringify(tidy("a  \n\n\n\nb")));
ok(tidy("![[图片.png]]下面\n```\nx,中\n```") === "![[图片.png]]下面\n```\nx,中\n```", "embed/code");
ok(tidy("增长50%的人") === "增长 50% 的人", tidy("增长50%的人"));
ok(tidy("Hello, 世界") === "Hello，世界", tidy("Hello, 世界"));
// 坑
const doc = "# 标题\n\n第一段说印度【坑：这里要一个印度的例子】。\n第一段第二行\n\n- 列表项【坑：数据来源】\n\t- 子项\n- 下一项\n\n## 二\n\n段落【坑:半角冒号】\n结尾";
ok(JSON.stringify(T.findPits(doc)) === JSON.stringify(["这里要一个印度的例子", "数据来源", "半角冒号"]), T.findPits(doc));
const call = (p) => T.formatSupplement(p, { web: [{ text: "事实\n一", title: "源", url: "https://a.com" }], notes: [{ text: "记录", path: "日记/2026_10_08.md" }] }, "2026-10-09", "马自立");
let d2 = T.insertSupplement(doc, "这里要一个印度的例子", call("这里要一个印度的例子"));
ok(d2.includes("第一段第二行\n\n> [!补料]- 坑：这里要一个印度的例子（2026-10-09）\n> - 事实 一 —— [源](https://a.com)\n> - 记录 —— [2026_10_08](obsidian://open?vault=%E9%A9%AC%E8%87%AA%E7%AB%8B&file=%E6%97%A5%E8%AE%B0%2F2026_10_08)\n\n- 列表项"), d2);
d2 = T.insertSupplement(d2, "数据来源", T.formatSupplement("数据来源", { web: [], notes: [] }, "2026-10-09", "马自立"));
ok(d2.includes("\t- 子项\n\t> [!补料]- 坑：数据来源（2026-10-09）\n\t> - 没查到可靠来源\n- 下一项"), d2);
ok(T.hasSupplement(d2, "数据来源") && !T.hasSupplement(d2, "半角冒号"), "has");
d2 = T.insertSupplement(d2, "半角冒号", T.formatSupplement("半角冒号", { error: "超时" }, "2026-10-09", "马自立"));
ok(d2.endsWith("段落【坑:半角冒号】\n结尾\n\n> [!补料]- 坑：半角冒号（2026-10-09）\n> - 查证失败：超时"), d2);
ok(T.pitContext(doc, "数据来源") === "# 标题\n- 列表项【坑：数据来源】\n\t- 子项", T.pitContext(doc, "数据来源"));
ok(T.insertSupplement(doc, "不存在", []) === null, "missing");
// 空格缩进的列表
ok(T.insertSupplement("- a【坑：x】\n    - b", "x", ["> c"]) === "- a【坑：x】\n    - b\n    > c", "spaces");
// 版本号
ok(T.nextVersionName("稿子", ["稿子", "稿子 v2"]) === "稿子 v3", "v3");
ok(T.nextVersionName("稿子", ["稿子"]) === "稿子 v2", "v2");
ok(T.nextVersionName("稿子 v3", ["稿子 v3", "稿子 v2"]) === "稿子 v4", "v4");
// JSON
ok(T.parseJsonLoose("好的：\n```json\n{\"web\":[]}\n```").web.length === 0, "json");
ok(T.structureDiff("# a\n【坑：x】", "# a").join() === "【坑】 1→0", "diff");
// 属性
ok(T.splitFrontmatter("---\na: 1\n---\n正文").body === "正文", "fm");
ok(JSON.stringify(T.parseAliases("---\naliases:\n  - 甲\n  - \"乙\"\ntags: x\n---")) === '["甲","乙"]', "aliases list");
ok(JSON.stringify(T.parseAliases("aliases: [甲, 乙]")) === '["甲","乙"]', "aliases inline");
// 提及
const note = "---\naliases: [x]\n---\n- 讲到 ML 了\n\t- 子\n- 不相关\n\n网址 x.html 里的不算\n\n段落提到ML。";
const mb = T.mentionBlocks(note, ["ML"]);
ok(mb.length === 2 && mb[0].text === "- 讲到 ML 了\n\t- 子" && mb[1].text === "段落提到ML。", JSON.stringify(mb));
// 真实稿子跑一遍规范排版：链接 / 嵌入数量不变
const fs = require("fs"), path = require("path");
const V = "/Users/chenchen/Documents/Obsidian Vault";
if (fs.existsSync(V)) for (const f of ["黄金的分母深度稿.md", "道德是流动的-口播稿.md", "穿搭与反优绩主义_口播稿.md"]) {
  const t = fs.readFileSync(path.join(V, f), "utf8"), b = T.splitFrontmatter(t).body, r = tidy(b);
  const links = (s) => (s.match(/\[\[[^\]]*\]\]|\]\([^)]*\)|https?:\/\/\S+/g) || []).join("|");
  ok(links(b) === links(r), f + " links changed");
  console.log(f, "改动行数", b.split("\n").filter((l, i) => l !== r.split("\n")[i]).length, "/", b.split("\n").length);
}
console.log("全部通过", n, "条断言");
ok(tidy("写一篇.我觉得\n结尾.\n版本1.5和3.14") === "写一篇。我觉得\n结尾。\n版本 1.5 和 3.14", tidy("写一篇.我觉得\n结尾.\n版本1.5和3.14"));
console.log("句号规则通过");
ok(T.formatSupplement("x", { web: [], notes: [{ text: "记录", path: "日记/2026_10_08.md" }] }, "2026-10-09", "马自立", true)[1] === "> - 记录 —— [[日记/2026_10_08|2026_10_08]]", "同库用双链");
console.log("同库补料链接通过");
