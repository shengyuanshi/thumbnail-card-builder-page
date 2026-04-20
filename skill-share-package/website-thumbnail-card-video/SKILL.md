---
name: website-thumbnail-card-video
description: |
  Generate a website scroll video, landscape hero screenshot, thumbnail image, and edited card video from a URL, prompt, and title using the HTML thumbnail card template. Use when the user wants a repeatable website case-study workflow that outputs `<title>_raw.mp4`, `<title>_hero.jpg`, `<title>_thumbnail.jpg`, and `<title>_edit.mp4`. Triggers on phrases like "网站封面视频 workflow", "thumbnail card video", "网站录屏封面", "url + prompt + title 生成视频", "用 html 模板剪网站视频".
---

# Website Thumbnail Card Video

Use this skill when the user wants to turn a live website into a reusable case-study package based on the HTML thumbnail card template.

## Inputs

Each row needs:

- `url` or `link`
- `prompt`
- `title`

`subtitle` stays fixed as `Made with K2.6`.

## Deliverables

For each row, generate:

- `<title>/<title>_raw.mp4`
- `<title>/<title>_hero.jpg`
- `<title>/<title>_thumbnail.jpg`
- `<title>/<title>_edit.mp4`

Rules:

- `raw.mp4` uses the same landscape aspect ratio as the HTML template hero area
- `hero.jpg` uses that same ratio and is captured from the top of the original website
- `thumbnail.jpg` uses the same hero image for both the hero block and blurred background
- `edit.mp4` uses the HTML template with the hero area replaced by `raw.mp4`
- each input row must be exported into its own folder named after `title`

## Bundled Files

- [index.html](/Users/yuanyuanshi/.codex/skills/website-thumbnail-card-video/index.html) — editable HTML card template
- [scripts/run_thumbnail_video_workflow.js](/Users/yuanyuanshi/.codex/skills/website-thumbnail-card-video/scripts/run_thumbnail_video_workflow.js) — end-to-end workflow runner
- [assets](/Users/yuanyuanshi/.codex/skills/website-thumbnail-card-video/assets) — template assets

## Public Reference

- GitHub repo: [thumbnail-card-builder-page](https://github.com/shengyuanshi/thumbnail-card-builder-page)
- GitHub Pages: [thumbnail-card-builder-page site](https://shengyuanshi.github.io/thumbnail-card-builder-page/)

## Run

Single row:

```bash
cd /Users/yuanyuanshi/.codex/skills/website-thumbnail-card-video
node scripts/run_thumbnail_video_workflow.js \
  --url "https://your-site.example" \
  --prompt "Your prompt here" \
  --title "Your Website Title" \
  --output /tmp/thumbnail-output
```

Table input:

```bash
cd /Users/yuanyuanshi/.codex/skills/website-thumbnail-card-video
node scripts/run_thumbnail_video_workflow.js \
  --table /absolute/path/to/input.csv \
  --output /tmp/thumbnail-output
```

Excel table input:

```bash
cd /Users/yuanyuanshi/.codex/skills/website-thumbnail-card-video
node scripts/run_thumbnail_video_workflow.js \
  --table /absolute/path/to/vb.xlsx \
  --output /tmp/thumbnail-output
```

CSV columns:

```csv
url,prompt,title
https://example.com,"Design a cinematic AI product launch page.","Example Website"
```

## Workflow Contract

1. Record the live website into `<title>_raw.mp4`
2. Capture a top-of-page landscape hero screenshot into `<title>_hero.jpg`
3. Render the HTML template with:
   - `prompt`
   - `title`
   - fixed subtitle `Made with K2.6`
4. Export `<title>_thumbnail.jpg`
5. Render the same template again with the hero area replaced by `raw.mp4`
6. Export `<title>_edit.mp4`
7. Place all four outputs inside a folder named `<title>/`

## Notes

- The skill expects Playwright Chromium to be available
- The script can use system `ffmpeg` or fall back to `/tmp/ffmpeg-static/ffmpeg`
- If the site shows cookie or consent popups, the script attempts to dismiss them automatically
- If the user wants only the public HTML builder, send them the GitHub Pages URL above
