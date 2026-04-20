# Thumbnail Video Workflow

Input table columns:

- `url`
- `prompt`
- `title`

`subtitle` is fixed to `Made with K2.6`.

Example:

```csv
url,prompt,title
https://example.com,"Design a cinematic launch page for an AI product.","Example Website"
```

Run:

```bash
cd /Users/yuanyuanshi/Desktop/xiaoshi/内容跟进小助手/生产视频
node scripts/run_thumbnail_video_workflow.js --table sample-input.csv --output ./output
```

Single row:

```bash
node scripts/run_thumbnail_video_workflow.js \
  --url "https://your-site.example" \
  --prompt "Your prompt here" \
  --title "Your Website Title" \
  --output ./output
```

Outputs per row:

- `<title>_raw.mp4`
- `<title>_hero.jpg`
- `<title>_thumbnail.jpg`
- `<title>_edit.mp4`

Notes:

- The uploaded/rendered card uses one image source only: the hero image is also reused as the blurred background.
- `<title>_raw.mp4` and `<title>_hero.jpg` both use the same landscape aspect ratio as the HTML template hero area.
- `<title>_hero.jpg` is captured directly from the original website as a top-of-page screenshot in that same ratio.
- The raw website recording is automatically trimmed so the deliverable starts from the loaded page instead of the initial navigation blank screen.
- If system `ffmpeg` / `ffprobe` are unavailable, the script can fall back to `/tmp/ffmpeg-static/ffmpeg`.
