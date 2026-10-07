#!/usr/bin/env python3
# 把最新一次提交同步到 Linear「Obsidian-Plugins」项目。sync.sh 提交后自动调用，也可以单独跑。
#
#   提交信息里写了 MAT-xx：给这些 issue 挂上提交链接、补上改到的插件标签，再记一条评论
#   没写 MAT-xx：改到的每个插件各建一条 issue「[插件id] 提交信息」，状态 Done，带插件标签和提交链接
#   只改了 README / 脚本、没改插件：什么都不做
#
# API key：环境变量 LINEAR_API_KEY，或者钥匙串里服务名 linear-api-key 的那一项
#   （Linear → Settings → Security & access → Personal API keys 生成，然后：
#    security add-generic-password -a "$USER" -s linear-api-key -w '粘贴 key'）
# 用法：./linear-sync.py [提交，默认 HEAD] [--dry-run]
import json, os, re, subprocess, sys, urllib.request

TEAM_KEY = "MAT"
PROJECT = "Obsidian-Plugins"
LABEL_GROUP = "插件"
REPO_URL = "https://github.com/MatsuriMW/Obsidian-Plugins"
HERE = os.path.dirname(os.path.abspath(__file__))


def git(*args):
    return subprocess.run(["git", "-C", HERE, *args], capture_output=True, text=True, check=True).stdout.strip()


def api_key():
    k = os.environ.get("LINEAR_API_KEY")
    if k:
        return k
    r = subprocess.run(["security", "find-generic-password", "-s", "linear-api-key", "-w"], capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else None


def gql(key, query, variables=None):
    req = urllib.request.Request(
        "https://api.linear.app/graphql",
        data=json.dumps({"query": query, "variables": variables or {}}).encode(),
        headers={"Content-Type": "application/json", "Authorization": key},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        out = json.load(resp)
    if out.get("errors"):
        raise RuntimeError(out["errors"][0].get("message"))
    return out["data"]


def changed_plugins(rev):
    files = git("diff-tree", "--no-commit-id", "--name-only", "-r", rev).splitlines()
    dirs = sorted({f.split("/")[0] for f in files if "/" in f})
    return [d for d in dirs if os.path.isfile(os.path.join(HERE, d, "manifest.json"))]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    rev = args[0] if args else "HEAD"
    sha = git("rev-parse", rev)
    short = sha[:7]
    subject = git("log", "-1", "--format=%s", rev)
    body = git("log", "-1", "--format=%b", rev)
    plugins = changed_plugins(rev)
    refs = sorted(set(re.findall(r"\b%s-\d+\b" % TEAM_KEY, subject + "\n" + body)))
    url = f"{REPO_URL}/commit/{sha}"
    if not plugins:
        print("Linear：这次没改插件，跳过")
        return
    plan = ([("关联", r) for r in refs] if refs else [("新建", p) for p in plugins])
    if dry:
        print(f"Linear（演练）：{short} {subject}\n  改到的插件：{', '.join(plugins)}")
        for kind, x in plan:
            print(f"  {kind} {x}" + ("（挂提交链接、评论；补上标题里那个插件的标签）" if kind == "关联" else f"：「[{x}] {subject}」Done"))
        return
    key = api_key()
    if not key:
        print("Linear：没找到 API key（LINEAR_API_KEY 或钥匙串 linear-api-key），跳过。说明见 linear-sync.py 开头")
        return

    d = gql(key, """query($k:String!,$p:String!){
      teams(filter:{key:{eq:$k}}){nodes{id states{nodes{id name}}
        labels(first:250){nodes{id name isGroup parent{id}}}}}
      projects(filter:{name:{eq:$p}}){nodes{id}}}""", {"k": TEAM_KEY, "p": PROJECT})
    team = d["teams"]["nodes"][0]
    project_id = d["projects"]["nodes"][0]["id"]
    done_id = next(s["id"] for s in team["states"]["nodes"] if s["name"] == "Done")
    labels = team["labels"]["nodes"]
    group = next((l for l in labels if l["isGroup"] and l["name"] == LABEL_GROUP), None)
    by_name = {l["name"]: l["id"] for l in labels if not l["isGroup"]}

    def label_id(name):
        if name not in by_name:
            r = gql(key, """mutation($i:IssueLabelCreateInput!){issueLabelCreate(input:$i){issueLabel{id}}}""",
                    {"i": {"name": name, "teamId": team["id"], **({"parentId": group["id"]} if group else {})}})
            by_name[name] = r["issueLabelCreate"]["issueLabel"]["id"]
        return by_name[name]

    link = """mutation($id:String!,$u:String!,$t:String){attachmentLinkURL(issueId:$id,url:$u,title:$t){success}}"""
    if refs:
        for ref in refs:
            issue = gql(key, "query($id:String!){issue(id:$id){id identifier title}}", {"id": ref})["issue"]
            gql(key, link, {"id": issue["id"], "u": url, "t": f"{short} {subject}"})
            # 一次提交改了好几个插件时，每张卡只补它标题里那个插件的标签
            # 「插件」标签组一张卡只能挂一个标签：已经有了就会报错，跳过即可
            for p in [p for p in plugins if f"[{p}]" in issue["title"]]:
                try:
                    gql(key, "mutation($id:String!,$l:String!){issueAddLabel(id:$id,labelId:$l){success}}", {"id": issue["id"], "l": label_id(p)})
                except RuntimeError:
                    pass
            gql(key, "mutation($i:CommentCreateInput!){commentCreate(input:$i){success}}",
                {"i": {"issueId": issue["id"], "body": f"提交 [{short}]({url})：{subject}\n\n改到的插件：{'、'.join(f'`{p}`' for p in plugins)}"}})
            print(f"Linear：{ref} 已关联 {short}")
        return
    improvement = by_name.get("Improvement")
    for p in plugins:
        desc = (body + "\n\n" if body else "") + f"由 `sync.sh` 根据提交 [{short}]({url}) 自动建的。需要细节就在这里补。"
        r = gql(key, """mutation($i:IssueCreateInput!){issueCreate(input:$i){issue{id identifier url}}}""",
                {"i": {"teamId": team["id"], "projectId": project_id, "stateId": done_id, "title": f"[{p}] {subject}",
                       "description": desc, "labelIds": [x for x in (improvement, label_id(p)) if x]}})
        issue = r["issueCreate"]["issue"]
        gql(key, link, {"id": issue["id"], "u": url, "t": f"{short} {subject}"})
        print(f"Linear：新建 {issue['identifier']} [{p}]  {issue['url']}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:   # 同步 Linear 失败不影响提交和推送
        print(f"Linear：同步失败（{e}），提交本身不受影响")
