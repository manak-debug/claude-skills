# My Claude Code skills — re-install checklist

Skills I have installed on my machine that must be re-installed on any new machine / fresh Claude Code setup.
Everything below lives in this repo too, but the install commands pull the latest version.

| Skill | What it does | Install |
|---|---|---|
| **archify** | Codebase / system description → interactive architecture, workflow, sequence, dataflow, lifecycle diagrams (self-contained HTML + PNG/SVG/WebM export). Source: [tt-a1i/archify](https://github.com/tt-a1i/archify) | `npx -y skills add tt-a1i/archify -g -y` |
| remotion-best-practices | Official Remotion video-in-React guidance | copy `remotion-skills-external/` into `~/.claude/skills/` |
| awesome-claude-skills (rest of this repo) | Composio + document + design skills | copy the folder you need into `~/.claude/skills/<name>/` |

## After installing
- Restart Claude Code (or open a new session) so `/archify` shows up under `/skills`.
- Verify: `node ~/.claude/skills/archify/bin/archify.mjs doctor`

## archify usage
```
/archify architecture diagram of the <repo-name> repo
```
Output goes to the scratchpad; ask Claude to copy the `.html` into `~/Downloads`.
Notes learnt 2026-08-26:
- Private repos: drop `sources` on components (evidence needs a public GitHub URL + pinned commit).
- Built-in brand badges exist for claude, sqlite, railway, github, etc. — not linkedin (use `archify brands capture <url>`).
- Example delivered: `linkedin-agent` architecture, 12 nodes, showcase profile, 9/9 checks.
