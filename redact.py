#!/usr/bin/env python3
"""上传前打码：sync.sh 复制完插件、提交之前调用。

1. redact.txt（不进仓库）每行「原文<TAB>替换成」，在仓库里所有文本文件里统一替换；# 开头是注释
2. 再查一遍常见的密钥格式（Telegram bot token、OpenAI / GitHub / Linear key、私钥），查到就退出码 1，sync.sh 会停下来不提交

用法：redact.py <仓库目录>        打码并检查
      redact.py <仓库目录> --check  只检查，不改文件
"""
import os, re, sys

TEXT_EXT = {".js", ".json", ".css", ".md", ".tsv", ".txt", ".py", ".sh", ".mjs", ".ts"}
SKIP = {"redact.txt", "redact.py", "sync.sh", "data.json"}
SECRETS = [
    ("Telegram bot token", r"\b\d{8,10}:AA[A-Za-z0-9_-]{30,}"),
    ("OpenAI key", r"\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}"),
    ("Anthropic key", r"\bsk-ant-[A-Za-z0-9_-]{20,}"),
    ("GitHub token", r"\bgh[pousr]_[A-Za-z0-9]{30,}"),
    ("Linear key", r"\blin_api_[A-Za-z0-9]{20,}"),
    ("私钥", r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
]


def files(root):
    for d, dirs, fs in os.walk(root):
        dirs[:] = [x for x in dirs if not x.startswith(".")]
        for f in fs:
            if f in SKIP or os.path.splitext(f)[1] not in TEXT_EXT:
                continue
            yield os.path.join(d, f)


def main():
    root = sys.argv[1]
    check_only = "--check" in sys.argv
    pairs = []
    rp = os.path.join(root, "redact.txt")
    if os.path.exists(rp):
        for line in open(rp, encoding="utf-8"):
            line = line.rstrip("\n")
            if not line or line.startswith("#") or "\t" not in line:
                continue
            a, b = line.split("\t", 1)
            if a:
                pairs.append((a, b))
    changed, leaks = [], []
    for p in files(root):
        try:
            t = open(p, encoding="utf-8").read()
        except UnicodeDecodeError:
            continue
        rel = os.path.relpath(p, root)
        hits = [a for a, _ in pairs if a in t]
        if hits:
            changed.append(f"{rel}（{len(hits)} 种）")
            if not check_only:
                for a, b in pairs:
                    t = t.replace(a, b)
                open(p, "w", encoding="utf-8").write(t)
        for name, pat in SECRETS:
            if re.search(pat, t):
                leaks.append(f"{rel}：疑似 {name}")
    if changed:
        print(("要打码的文件：" if check_only else "已打码：") + "、".join(changed))
    if leaks:
        print("⛔ 发现疑似密钥，不提交：\n  " + "\n  ".join(leaks), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
