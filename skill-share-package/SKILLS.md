# Website Thumbnail Card Video Skill Pack

This package is for other agents to learn and reuse the `website-thumbnail-card-video` workflow.

## What This Skill Does

Given a live website plus:

- `url`
- `prompt`
- `title`

it generates a case-study asset set based on the HTML thumbnail card template:

- `<title>_raw.mp4`
- `<title>_hero.jpg`
- `<title>_thumbnail.jpg`
- `<title>_edit.mp4`

`subtitle` is always fixed to:

```text
Made with K2.6
```

## Core Rules

1. `raw.mp4` must use the same landscape aspect ratio as the HTML template hero area.
2. `hero.jpg` must use that same ratio and come from the top section of the original website.
3. The HTML template uses one image source only:
   - the hero block image
   - the blurred background image
4. `thumbnail.jpg` is rendered from the HTML template with:
   - `prompt`
   - `title`
   - fixed subtitle
5. `edit.mp4` is rendered from the same HTML template, but the hero area is replaced with `raw.mp4`.
6. Each input row must write its 4 deliverables into a dedicated folder named after that row's `title`.

## Public Links

- GitHub repo: [thumbnail-card-builder-page](https://github.com/shengyuanshi/thumbnail-card-builder-page)
- GitHub Pages: [thumbnail-card-builder-page site](https://shengyuanshi.github.io/thumbnail-card-builder-page/)

## Files In This Pack

### Learning / skill instructions

- [website-thumbnail-card-video/SKILL.md](./website-thumbnail-card-video/SKILL.md)

### Runtime files

- [website-thumbnail-card-video/index.html](./website-thumbnail-card-video/index.html)
- [website-thumbnail-card-video/scripts/run_thumbnail_video_workflow.js](./website-thumbnail-card-video/scripts/run_thumbnail_video_workflow.js)
- [website-thumbnail-card-video/assets](./website-thumbnail-card-video/assets)

### Example input

- [sample-input.csv](./sample-input.csv)

## Dependencies

The workflow expects:

- Node.js
- Playwright Chromium
- `ffmpeg`

Implementation details:

- The script first tries local/system Playwright
- It can also reuse the Playwright dependency from another local skill path if available
- `ffmpeg` can be system-installed or fall back to `/tmp/ffmpeg-static/ffmpeg`

## How To Run

### Single website

```bash
cd website-thumbnail-card-video
node scripts/run_thumbnail_video_workflow.js \
  --url "https://your-site.example" \
  --prompt "Your prompt here" \
  --title "Your Website Title" \
  --output /tmp/thumbnail-output
```

### Table input

```bash
cd website-thumbnail-card-video
node scripts/run_thumbnail_video_workflow.js \
  --table ../sample-input.csv \
  --output /tmp/thumbnail-output
```

## CSV Format

```csv
url,prompt,title
https://example.com,"Design a cinematic AI product launch page.","Example Website"
```

## Expected Deliverables

For each input row:

- `<title>/<title>_raw.mp4`
  Landscape scroll recording in the template hero ratio.

- `<title>/<title>_hero.jpg`
  Top-of-page landscape screenshot in the same ratio.

- `<title>/<title>_thumbnail.jpg`
  Final card cover rendered from `index.html`.

- `<title>/<title>_edit.mp4`
  Final edited card video rendered from the same template with the hero area swapped to `raw.mp4`.

## Important Implementation Notes

- Cookie / consent popups are dismissed when possible.
- The raw scroll video is trimmed so the exported result starts from the loaded page, not the browser’s initial blank loading phase.
- The template render path is `index.html?render=1`.
- The final thumbnail is exported as JPEG from a fixed `1080 × 1920` card canvas.
- The hero image and blurred background intentionally share the same source.

## If Another Agent Wants To Rebuild Or Extend It

Start from:

1. `website-thumbnail-card-video/SKILL.md`
2. `website-thumbnail-card-video/index.html`
3. `website-thumbnail-card-video/scripts/run_thumbnail_video_workflow.js`

Most layout changes belong in `index.html`.
Most automation / recording / naming changes belong in `run_thumbnail_video_workflow.js`.
