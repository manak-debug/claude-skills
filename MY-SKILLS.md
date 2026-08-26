# My Claude Code skills — re-install checklist

Skills I have installed on my machine that must be re-installed on any new machine / fresh Claude Code setup.
Everything below lives in this repo too, but the install commands pull the latest version.

| Skill | What it does | Install |
|---|---|---|
| **archify** | Codebase / system description → interactive architecture, workflow, sequence, dataflow, lifecycle diagrams (self-contained HTML + PNG/SVG/WebM export). Source: [tt-a1i/archify](https://github.com/tt-a1i/archify) | `npx -y skills add tt-a1i/archify -g -y` |
| **garden-skills** (ConardLi) | 5 skills: `web-design-engineer` (25 style recipes, anti-cliché design), `web-video-presentation` (script → click-driven 16:9 web video w/ 23 themes + TTS), `gpt-image-2` (image prompt templates), `beautiful-article` (URL/PDF → single-file HTML article), `kb-retriever` (local knowledge-base Q&A). Source: [ConardLi/garden-skills](https://github.com/ConardLi/garden-skills). Backup in `garden-skills/` | `npx -y skills add ConardLi/garden-skills -g -y` (ignore the PromptScript errors — Claude Code symlinks are created) |
| remotion-best-practices | Official Remotion video-in-React guidance | copy `remotion-skills-external/` into `~/.claude/skills/` |
| awesome-claude-skills (rest of this repo) | Composio + document + design skills | copy the folder you need into `~/.claude/skills/<name>/` |


## Official Claude Code plugins (anthropics/claude-plugins-official)
Installed 2026-08-26. Backup copies live in `official-plugins/` (reference only — install via CLI, don't copy).

```
for p in railway supabase shopify-ai-toolkit context7 github code-review frontend-design; do
  claude plugin install "$p@claude-plugins-official"
done
```

| Plugin | Why |
|---|---|
| railway | All deploys are on Railway — CLI / env / logs |
| supabase | aido-agent uses Supabase |
| shopify-ai-toolkit | Amaltaas / TriNetra Shopify work |
| context7 | Up-to-date library docs (Next.js 16 etc.) |
| github | PRs / issues via gh |
| code-review | Anthropic's review workflow |
| frontend-design | Distinctive UI design guidance (was already installed) |

Browse the other ~280 plugins with `/plugin > Discover`.

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
