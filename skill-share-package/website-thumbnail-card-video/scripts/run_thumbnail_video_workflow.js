#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { pathToFileURL } = require("url");

function loadPlaywright() {
  const candidates = [
    "playwright",
    "/Users/yuanyuanshi/.codex/skills/website-thumbnail-generator/node_modules/playwright"
  ];

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (error) {}
  }

  throw new Error("Playwright not found. Install it locally or reuse the skill dependency.");
}

const { chromium } = loadPlaywright();
const HERO_RATIO_WIDTH = 996;
const HERO_RATIO_HEIGHT = 578;
const HERO_CAPTURE_WIDTH = 1440;
const HERO_CAPTURE_HEIGHT = Math.round(HERO_CAPTURE_WIDTH * HERO_RATIO_HEIGHT / HERO_RATIO_WIDTH);

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    table: "",
    url: "",
    prompt: "",
    title: "",
    subtitle: "Made with K2.6",
    output: path.join(process.cwd(), "output"),
    duration: 18,
    frameTime: 0.2
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case "--table":
        options.table = args[++i];
        break;
      case "--url":
        options.url = args[++i];
        break;
      case "--prompt":
        options.prompt = args[++i];
        break;
      case "--title":
        options.title = args[++i];
        break;
      case "--subtitle":
        options.subtitle = args[++i];
        break;
      case "--output":
        options.output = args[++i];
        break;
      case "--duration":
        options.duration = Number(args[++i]);
        break;
      case "--frame-time":
        options.frameTime = Number(args[++i]);
        break;
      default:
        break;
    }
  }

  if (!options.table && (!options.url || !options.prompt || !options.title)) {
    throw new Error("Provide either --table or --url --prompt --title");
  }

  return options;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeName(value) {
  return String(value || "untitled")
    .trim()
    .replace(/[\/\\?%*:|"<>]/g, "_");
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim());
  if (!firstLine) return ",";
  return firstLine.includes("\t") ? "\t" : ",";
}

function parseDelimited(text) {
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((part) => String(part).trim() !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((part) => String(part).trim() !== "")) rows.push(row);

  const [header, ...body] = rows;
  return body.map((columns) => {
    const entry = {};
    header.forEach((key, index) => {
      entry[String(key || "").trim()] = String(columns[index] || "").trim();
    });
    return entry;
  });
}

function loadEntries(options) {
  if (!options.table) {
    return [
      {
        url: options.url,
        prompt: options.prompt,
        title: options.title
      }
    ];
  }

  const tablePath = path.resolve(options.table);
  const text = fs.readFileSync(tablePath, "utf8");
  if (tablePath.endsWith(".json")) {
    return JSON.parse(text);
  }
  return parseDelimited(text);
}

function findBinary(name) {
  const candidates = name === "ffmpeg"
    ? ["ffmpeg", "/tmp/ffmpeg-static/ffmpeg", "/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"]
    : ["ffprobe", "/tmp/ffmpeg-static/ffprobe", "/opt/homebrew/bin/ffprobe", "/usr/local/bin/ffprobe"];

  for (const candidate of candidates) {
    try {
      const resolved = execFileSync("bash", ["-lc", `command -v ${candidate}`], { encoding: "utf8" }).trim();
      if (resolved) return resolved;
    } catch (error) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  throw new Error(`${name} not found. Install ffmpeg/ffprobe before running this workflow.`);
}

const ffmpegBin = findBinary("ffmpeg");
let ffprobeBin = "";

try {
  ffprobeBin = findBinary("ffprobe");
} catch (error) {}

function dismissPopupSelectors() {
  return [
    "button",
    "[role='button']",
    "[aria-label]",
    ".modal-close",
    ".popup-close",
    "[class*='cookie' i] button",
    "[class*='consent' i] button"
  ];
}

async function dismissPopups(page) {
  const textSnippets = [
    "accept", "agree", "allow", "ok", "got it", "continue", "close",
    "accept all", "i agree", "understand"
  ];

  for (const selector of dismissPopupSelectors()) {
    const elements = await page.$$(selector).catch(() => []);
    for (const element of elements) {
      const visible = await element.isVisible().catch(() => false);
      if (!visible) continue;
      const label = ((await element.innerText().catch(() => "")) || "").toLowerCase();
      if (textSnippets.some((snippet) => label.includes(snippet))) {
        await element.click({ force: true }).catch(() => {});
        await page.waitForTimeout(200);
      }
    }
  }
}

async function smoothScroll(page, durationMs) {
  await page.evaluate(async (scrollDuration) => {
    const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const maxScroll = Math.max(0, document.body.scrollHeight - window.innerHeight);
    const startTime = performance.now();

    await new Promise((resolve) => {
      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / scrollDuration, 1);
        const currentY = maxScroll * easeInOutCubic(progress);
        window.scrollTo(0, currentY);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }, durationMs);
}

function latestRecordedVideo(videoDir) {
  const files = fs.readdirSync(videoDir).filter((name) => name.endsWith(".webm"));
  if (!files.length) {
    throw new Error(`No recorded webm found in ${videoDir}`);
  }
  return files
    .map((name) => ({ name, mtime: fs.statSync(path.join(videoDir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0].name;
}

function transcodeToMp4(inputPath, outputPath, options = {}) {
  const args = ["-y"];
  if (typeof options.trimStartSec === "number" && options.trimStartSec > 0) {
    args.push("-ss", String(options.trimStartSec));
  }
  args.push("-i", inputPath);
  if (typeof options.durationSec === "number" && options.durationSec > 0) {
    args.push("-t", String(options.durationSec));
  }
  args.push(
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    outputPath
  );
  execFileSync(ffmpegBin, args, { stdio: "inherit" });
}

function getDurationSeconds(inputPath) {
  if (!ffprobeBin) {
    let stderr = "";
    try {
      execFileSync(ffmpegBin, [
        "-i", inputPath
      ], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      });
    } catch (error) {
      stderr = String(error.stderr || "");
    }
    const match = stderr.match(/Duration:\s+(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (!match) {
      throw new Error(`Could not determine duration for ${inputPath}`);
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);
    return hours * 3600 + minutes * 60 + seconds;
  }

  const output = execFileSync(ffprobeBin, [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    inputPath
  ], { encoding: "utf8" }).trim();
  return Number(output);
}

async function recordWebsiteRaw(url, outputPath, durationSec) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "website-raw-"));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: HERO_CAPTURE_WIDTH, height: HERO_CAPTURE_HEIGHT },
    recordVideo: {
      dir: tempDir,
      size: { width: HERO_CAPTURE_WIDTH, height: HERO_CAPTURE_HEIGHT }
    }
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(2000);
    await dismissPopups(page);
    await page.waitForTimeout(600);
    await smoothScroll(page, durationSec * 1000);
    await page.waitForTimeout(500);
  } finally {
    await context.close();
    await browser.close();
  }

  const webm = path.join(tempDir, latestRecordedVideo(tempDir));
  const totalDurationSec = getDurationSeconds(webm);
  const keepDurationSec = durationSec + 0.8;
  const trimStartSec = Math.max(0, totalDurationSec - keepDurationSec);
  transcodeToMp4(webm, outputPath, {
    trimStartSec,
    durationSec: keepDurationSec
  });
}

async function captureHeroScreenshot(url, outputPath) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: HERO_CAPTURE_WIDTH, height: HERO_CAPTURE_HEIGHT },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(1800);
    await dismissPopups(page);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: outputPath,
      type: "jpeg",
      quality: 92
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

async function renderThumbnail(templatePath, heroImagePath, prompt, title, subtitle, outputPath) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });

  try {
    await page.goto(`${pathToFileURL(templatePath).href}?render=1`, { waitUntil: "load" });
    await page.waitForFunction(() => Boolean(window.cardBuilder));
    await page.evaluate(async ({ heroSrc, promptText, titleText, subtitleText }) => {
      await window.cardBuilder.setState({
        heroSrc,
        heroMode: "image",
        prompt: promptText,
        title: titleText,
        subtitle: subtitleText
      });
    }, {
      heroSrc: pathToFileURL(heroImagePath).href,
      promptText: prompt,
      titleText: title,
      subtitleText: subtitle
    });
    await page.waitForSelector("body[data-ready='1']");
    await page.locator("#previewCard").screenshot({ path: outputPath, type: "jpeg", quality: 92 });
  } finally {
    await browser.close();
  }
}

async function renderEditedVideo(templatePath, heroImagePath, rawVideoPath, prompt, title, subtitle, outputPath) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "template-video-"));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    recordVideo: {
      dir: tempDir,
      size: { width: 1080, height: 1920 }
    }
  });
  const page = await context.newPage();
  const durationSec = getDurationSeconds(rawVideoPath);

  try {
    await page.goto(`${pathToFileURL(templatePath).href}?render=1`, { waitUntil: "load" });
    await page.waitForFunction(() => Boolean(window.cardBuilder));
    await page.evaluate(async ({ heroSrc, heroVideoSrc, promptText, titleText, subtitleText }) => {
      await window.cardBuilder.setState({
        heroSrc,
        heroVideoSrc,
        heroMode: "video",
        prompt: promptText,
        title: titleText,
        subtitle: subtitleText
      });
    }, {
      heroSrc: pathToFileURL(heroImagePath).href,
      heroVideoSrc: pathToFileURL(rawVideoPath).href,
      promptText: prompt,
      titleText: title,
      subtitleText: subtitle
    });
    await page.waitForSelector("body[data-ready='1']");
    await page.waitForTimeout(200);
    await page.evaluate(() => window.cardBuilder.playHeroVideo());
    await page.waitForTimeout(Math.ceil(durationSec * 1000) + 400);
  } finally {
    await context.close();
    await browser.close();
  }

  const webm = path.join(tempDir, latestRecordedVideo(tempDir));
  transcodeToMp4(webm, outputPath);
}

async function runEntry(entry, options, templatePath) {
  const title = entry.title;
  const prompt = entry.prompt;
  const url = entry.url;
  const baseName = safeName(title);
  const outputDir = path.resolve(options.output);
  ensureDir(outputDir);

  const rawVideo = path.join(outputDir, `${baseName}_raw.mp4`);
  const heroImage = path.join(outputDir, `${baseName}_hero.jpg`);
  const thumbnail = path.join(outputDir, `${baseName}_thumbnail.jpg`);
  const editVideo = path.join(outputDir, `${baseName}_edit.mp4`);

  console.log(`\n=== ${title} ===`);
  console.log(`1/ Recording raw scroll video -> ${rawVideo}`);
  await recordWebsiteRaw(url, rawVideo, options.duration);

  console.log(`2/ Capturing 16:9 hero screenshot -> ${heroImage}`);
  await captureHeroScreenshot(url, heroImage);

  console.log(`3-4/ Rendering thumbnail -> ${thumbnail}`);
  await renderThumbnail(templatePath, heroImage, prompt, title, options.subtitle, thumbnail);

  console.log(`5/ Rendering edited card video -> ${editVideo}`);
  await renderEditedVideo(templatePath, heroImage, rawVideo, prompt, title, options.subtitle, editVideo);

  return { rawVideo, heroImage, thumbnail, editVideo };
}

async function main() {
  const options = parseArgs();
  const entries = loadEntries(options);
  const templatePath = path.resolve(process.cwd(), "index.html");

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found at ${templatePath}`);
  }

  for (const entry of entries) {
    if (!entry.url || !entry.prompt || !entry.title) {
      throw new Error("Each row must include url, prompt, and title");
    }
    await runEntry(entry, options, templatePath);
  }

  console.log("\nDone.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
