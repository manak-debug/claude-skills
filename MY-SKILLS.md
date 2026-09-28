# My Claude Code skills — re-install checklist

## New laptop — one command
1. Install Claude Code and log in (the claude.ai account brings its own synced skills and connectors).
2. Run:
   ```
   git clone https://github.com/manak-debug/claude-skills.git && cd claude-skills && bash install.sh
   ```
   This copies every skill in `skills-manifest.txt` (the exact set on the main laptop, ~1,419) into `~/.claude/skills/`
   and installs the 7 official plugins. Safe to run twice. Restart Claude Code afterwards.

## Keeping this repo up to date (main laptop)
After installing a new skill: `bash backup.sh`, check the new folder under `my-local-skills/` has no keys
(this repo is PUBLIC), then commit and push. `backup.sh` rewrites `skills-manifest.txt` to match the laptop.

Not covered here: `~/.claude/hooks` (scope-lock hooks), `~/.claude/settings.json`, memory and MCP connections.


Skills I have installed on my machine that must be re-installed on any new machine / fresh Claude Code setup.
Everything below lives in this repo too, but the install commands pull the latest version.

| Skill | What it does | Install |
|---|---|---|
| **archify** | Codebase / system description → interactive architecture, workflow, sequence, dataflow, lifecycle diagrams (self-contained HTML + PNG/SVG/WebM export). Source: [tt-a1i/archify](https://github.com/tt-a1i/archify) | `npx -y skills add tt-a1i/archify -g -y` |
| **garden-skills** (ConardLi) | 5 skills: `web-design-engineer` (25 style recipes, anti-cliché design), `web-video-presentation` (script → click-driven 16:9 web video w/ 23 themes + TTS), `gpt-image-2` (image prompt templates), `beautiful-article` (URL/PDF → single-file HTML article), `kb-retriever` (local knowledge-base Q&A). Source: [ConardLi/garden-skills](https://github.com/ConardLi/garden-skills). Backup in `garden-skills/` | `npx -y skills add ConardLi/garden-skills -g -y` (ignore the PromptScript errors — Claude Code symlinks are created) |
| remotion-best-practices | Official Remotion video-in-React guidance | copy `remotion-skills-external/` into `~/.claude/skills/` |
| **motion-canvas** | Motion Canvas (TypeScript, generator-based animation) setup + ESM workaround + references. Source: [davila7/claude-code-templates](https://github.com/davila7/claude-code-templates/tree/main/cli-tool/components/skills/video/motion-canvas) (docs only, no scripts) | in `my-local-skills/motion-canvas` (installed by `install.sh`) |
| **revideo** | Revideo (Motion Canvas fork) — concept → scenes → MP4 rendered headless with `renderVideo()`; written 2026-09-29 from the official docs | in `my-local-skills/revideo` (installed by `install.sh`) |
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


## Marketing / growth skill packs (picked from VoltAgent/awesome-agent-skills)
Installed 2026-08-26 — ~510 skills added to `~/.claude/skills/` (905 → 1,417). Source snapshots in `marketing-skills/`.

```
for r in nowork-studio/NotFair gooseworks-ai/goose-skills aaron-he-zhu/aaron-marketing-skills \
         coreyhaines31/marketingskills sergebulaev/linkedin-skills blader/humanizer \
         MohamedAbdallah-14/unslop CosmoBlk/email-marketing-bible gokapso/agent-skills Eronred/aso-skills; do
  npx -y skills add $r -g -y
done
```

| Repo | Skills | Why |
|---|---|---|
| nowork-studio/NotFair | 45 | SEO + GEO + Google Ads + Meta Ads audits/builders |
| gooseworks-ai/goose-skills | 257 | Growth/GTM: ads, content, funnels, prospecting, `render-*` video ads, fal/elevenlabs creation |
| aaron-he-zhu/aaron-marketing-skills | 120 | Narrative/positioning/launch/creator marketing |
| coreyhaines31/marketingskills | 50 | Copywriting, CRO, pricing, launch, cold-email, ads, ai-seo |
| sergebulaev/linkedin-skills | 1 | `linkedin-marketing` — viral hooks / posting |
| blader/humanizer | 1 | Strip AI-writing tells |
| MohamedAbdallah-14/unslop | 6 | `unslop*` — de-slop text, files, commits, reviews |
| CosmoBlk/email-marketing-bible | 1 | 55k-word email marketing guide |
| gokapso/agent-skills | 3 | `integrate/automate/observe-whatsapp` (Kapso) |
| Eronred/aso-skills | 39 | App Store / Play Store optimisation |

Reviewed and skipped: K-Dense scientific-agent-skills (pure science), rest of the awesome list (cloud/enterprise/langs).

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
