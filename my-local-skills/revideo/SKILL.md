---
name: revideo
description: Programmatic video in TypeScript with Revideo (the Motion Canvas fork that renders headless) — concept → scenes → MP4 with no browser clicks. Use when asked to make a video from a concept/script with code (explainers, promos, reels, templated/batch videos with variables), or when Motion Canvas code must be rendered to MP4 from the command line. For animation concepts (generators, signals, tweening) read the motion-canvas skill — the scene API is the same, only the package names differ.
---

# Revideo — concept to MP4 with code

Revideo (github.com/midrender/revideo, MIT) is a fork of Motion Canvas. Scenes are written the same way
(`makeScene2D`, generator functions, `yield*`, refs, signals — see the `motion-canvas` skill and its references),
but Revideo adds what an agent needs: **`renderVideo()` renders an MP4 in a Node process with a headless browser**,
plus `<Video>`/`<Audio>` elements and project variables for templated videos. Rendering is free and local.

Package names: `@revideo/core`, `@revideo/2d`, `@revideo/renderer` (NOT `@motion-canvas/*`).

## 1. Start a project — use the official template

```bash
npm init @revideo@latest     # answers a few questions, creates the project
cd <project> && npm install
```

Keep the template's config files (vite, tsconfig, package.json scripts); change only `src/`.
The template has `src/project.ts`, `src/scenes/…`, and `src/render.ts` (`npm run render`).
Needs Node 18+ and ffmpeg (bundled by the renderer; pass `settings.ffmpeg.ffmpegPath` to use your own).

## 2. Scenes

```tsx
import {Audio, Img, Rect, Txt, Video, makeScene2D} from '@revideo/2d';
import {all, chain, createRef, waitFor, useScene} from '@revideo/core';

export default makeScene2D(function* (view) {
  const title = createRef<Txt>();
  const headline = useScene().variables.get('headline', 'Default headline'); // a signal — call headline()

  view.add(
    <>
      <Rect size={['100%', '100%']} fill={'#16322c'} />
      <Txt ref={title} text={headline()} fill={'#ffff3f'} fontSize={96} opacity={0} />
      <Audio src={'/voiceover.mp3'} play={true} />
    </>,
  );

  yield* all(title().opacity(1, 0.6), title().scale(1.1, 0.6));
  yield* waitFor(2);
});
```

- One scene per beat of the script; list them in order in `makeProject({scenes: [...]})`.
- Time the animation to the voice-over: `waitFor(seconds)` between beats; measure the audio length first (ffprobe).
- Local assets go in `public/` and are referenced as `/file.ext`.

## 3. Project + variables

```ts
// src/project.ts
import {makeProject} from '@revideo/core';
import intro from './scenes/intro?scene';

export default makeProject({
  scenes: [intro],
  variables: {headline: 'Default headline'},
});
```

## 4. Render headless

```ts
// src/render.ts
import {renderVideo} from '@revideo/renderer';

const file = await renderVideo({
  projectFile: './src/project.ts',
  variables: {headline: 'Your concept here'},          // overrides the project's variables
  settings: {outFile: 'video.mp4', outDir: './output', logProgress: true, workers: 1,
             dimensions: [1080, 1920]},                  // 9:16 reel; [1080,1350] = 4:5; [1920,1080] = 16:9
});
console.log(file);
```

`renderVideo` options worth knowing: `range: [startSec, endSec]` (render a slice to check a beat quickly),
`workers` (parallel), `puppeteer: {args: ['--no-sandbox']}` (servers/containers), `progressCallback`.

## Workflow for "concept → video"

1. Write the script (beats of 3–6 s each) and the on-screen text per beat.
2. Make the voice-over (ElevenLabs / edge-tts), put it in `public/`, read its length.
3. One scene per beat, timed to the audio; brand colours and fonts from the brand's tokens.
4. Render a 3-second `range` first to check the look, then the whole video.
5. Captions, music bed, joins: the `ffmpeg` skill.

## Pitfalls
- Import from `@revideo/*`, never `@motion-canvas/*`, in a Revideo project.
- Keep the `?scene` suffix on scene imports.
- `renderVideo` starts a Vite server per worker from `viteBasePort` (default 9000) — pick another port if it is busy.
- Remote media must be reachable by the headless browser (CORS); prefer files in `public/`.

Docs: https://docs.re.video · Repo: https://github.com/midrender/revideo
