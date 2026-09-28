#!/usr/bin/env bash
# On the MAIN laptop, after installing or updating skills:  bash backup.sh && git add -A && git commit -m "skills backup" && git push
# Every skill in ~/.claude/skills whose SKILL.md is not already somewhere in this repo is copied into my-local-skills/<name>
# (symlinks followed; node_modules, .venv, __pycache__ left out), and skills-manifest.txt is rewritten to match this laptop.
# "synced" is skipped — those skills come from the claude.ai account by themselves.
set -euo pipefail
cd "$(dirname "$0")"
python3 - <<'PY'
import collections, hashlib, os, shutil
REPO = os.getcwd(); LOCAL = os.path.expanduser("~/.claude/skills")
SKIP_DIRS = {".git", "node_modules", ".venv", "__pycache__"}
def sha(p):
    with open(p, "rb") as f: return hashlib.sha256(f.read()).hexdigest()
in_repo = collections.defaultdict(list)
for root, dirs, files in os.walk(REPO):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    if "SKILL.md" in files: in_repo[sha(os.path.join(root, "SKILL.md"))].append(os.path.relpath(root, REPO))
manifest, copied = {}, []
for name in sorted(os.listdir(LOCAL)):
    if name == "synced" or name.startswith("."): continue
    src = os.path.join(LOCAL, name)
    if not os.path.isfile(os.path.join(src, "SKILL.md")): continue
    hits = in_repo.get(sha(os.path.join(src, "SKILL.md")), [])
    same = sorted([h for h in hits if os.path.basename(h) == name] or hits, key=len)
    if same:
        manifest[name] = same[0]; continue
    dst = os.path.join(REPO, "my-local-skills", name)
    if os.path.exists(dst): shutil.rmtree(dst)
    shutil.copytree(src, dst, symlinks=False, ignore=shutil.ignore_patterns(*SKIP_DIRS, ".DS_Store"))
    manifest[name] = f"my-local-skills/{name}"; copied.append(name)
with open(os.path.join(REPO, "skills-manifest.txt"), "w") as f:
    f.write("# name<TAB>folder in this repo — exactly the skills installed on the main laptop (made by backup.sh)\n")
    for n in sorted(manifest): f.write(f"{n}\t{manifest[n]}\n")
print(f"{len(manifest)} skills in the manifest; copied or updated: {', '.join(copied) or 'none'}")
PY
echo "Check before pushing (this repo is PUBLIC): no API keys or personal data in my-local-skills/."
