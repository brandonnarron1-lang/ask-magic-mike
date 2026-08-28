#!/usr/bin/env node

import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = join(ROOT, "public/brand/black-diamond/hero-home-desktop.jpg");
const LOGO = join(ROOT, "public/brand/black-diamond/our-town-logo.png");
const OUTPUT = join(ROOT, "public/brand/black-diamond/og-card-1200x630.jpg");
const DISPLAY_FONT = "/System/Library/Fonts/Supplemental/Impact.ttf";
const SUPPORT_FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf";
const NARROW_FONT = "/System/Library/Fonts/Supplemental/Arial Narrow Bold.ttf";

async function magick(args) {
  await execFile("magick", args, { cwd: ROOT, maxBuffer: 2_000_000 });
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function main() {
  await Promise.all(
    [SOURCE, LOGO, DISPLAY_FONT, SUPPORT_FONT, NARROW_FONT].map((path) => access(path)),
  );

  const workDir = await mkdtemp(join(tmpdir(), "amm-social-card-"));
  const gradient = join(workDir, "left-gradient.png");
  try {
    await magick([
      "-size",
      "630x850",
      "gradient:#050505FF-#05050500",
      "-rotate",
      "-90",
      gradient,
    ]);

    await magick([
      SOURCE,
      "-resize",
      "1200x675^",
      "-gravity",
      "north",
      "-crop",
      "1200x630+0+0",
      "+repage",
      gradient,
      "-gravity",
      "northwest",
      "-geometry",
      "+0+0",
      "-compose",
      "over",
      "-composite",
      "(",
      LOGO,
      "-resize",
      "275x",
      ")",
      "-geometry",
      "+64+38",
      "-compose",
      "over",
      "-composite",
      "-fill",
      "#b91f2e",
      "-draw",
      "rectangle 64,184 488,187",
      "-font",
      DISPLAY_FONT,
      "-fill",
      "#f5f0e6",
      "-pointsize",
      "76",
      "-kerning",
      "1",
      "-annotate",
      "+64+208",
      "ASK MAGIC MIKE",
      "-font",
      NARROW_FONT,
      "-fill",
      "#d5aa36",
      "-pointsize",
      "25",
      "-kerning",
      "2",
      "-annotate",
      "+66+316",
      "WILSON, NC REAL ESTATE GUIDANCE",
      "-fill",
      "#b91f2e",
      "-draw",
      "rectangle 64,362 488,365",
      "-font",
      SUPPORT_FONT,
      "-fill",
      "#f5f0e6",
      "-pointsize",
      "18",
      "-kerning",
      "1",
      "-annotate",
      "+66+392",
      "LOCAL ANSWERS. BROKER-REVIEWED GUIDANCE.",
      "-fill",
      "#d5aa36",
      "-pointsize",
      "22",
      "-annotate",
      "+66+444",
      "askmagicmike.com",
      "-quality",
      "90",
      "-sampling-factor",
      "4:2:0",
      "-strip",
      OUTPUT,
    ]);

    const { stdout: dimensions } = await execFile(
      "magick",
      ["identify", "-format", "%wx%h", OUTPUT],
      { cwd: ROOT },
    );
    if (dimensions !== "1200x630") {
      throw new Error(`Unexpected social-card dimensions: ${dimensions}`);
    }

    const outputStat = await stat(OUTPUT);
    console.log(
      JSON.stringify(
        {
          output: OUTPUT,
          dimensions,
          bytes: outputStat.size,
          sha256: await sha256(OUTPUT),
          sourceSha256: await sha256(SOURCE),
          logoSha256: await sha256(LOGO),
          identityPreserved: true,
          aiGeneratedIdentityUsed: false,
        },
        null,
        2,
      ),
    );
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`social_og_card_generation_failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
