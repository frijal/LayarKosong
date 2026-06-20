#!/usr/bin/env bun

import { readdir, stat, readFile, writeFile, copyFile } from "node:fs/promises";
import { join, extname } from "node:path";

const args = process.argv.slice(2);

const ROOT_DIR = getArg("--root") ?? process.cwd();

const SHOULD_DELETE_LINE = args.includes("--delete-line");
const SHOULD_DELETE_TAG = args.includes("--delete-tag");
const SHOULD_BACKUP = !args.includes("--no-backup");

/**
 * Default hanya HTML.
 * Bisa diubah:
 * --ext=.html,.htm,.php
 */
const ALLOWED_EXT = new Set(
  (getArg("--ext") ?? ".html,.htm")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
);

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  ".nuxt",
  "dist",
  "build",
  ".cache",
  ".vercel",
  ".wrangler",
]);

function getArg(name: string): string | undefined {
  const found = args.find((arg) => arg.startsWith(`${name}=`));
  return found?.slice(name.length + 1);
}

/**
 * Ambil nilai atribut HTML.
 * Support:
 * href="..."
 * href='...'
 * href=https://...
 * rel=preload
 * as=image
 */
function getAttr(tag: string, attrName: string): string | null {
  const re = new RegExp(
    String.raw`\b${attrName}\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))`,
    "i"
  );

  const match = tag.match(re);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

/**
 * Untuk atribut seperti:
 * rel="preload"
 * rel='preload'
 * rel=preload
 * rel="preload something"
 */
function attrContains(tag: string, attrName: string, wanted: string): boolean {
  const value = getAttr(tag, attrName);
  if (!value) return false;

  return value
    .toLowerCase()
    .split(/\s+/)
    .includes(wanted.toLowerCase());
}

/**
 * Target utama:
 * Semua tag:
 *
 * <link ... rel=preload ... as=image ...>
 *
 * URL bebas.
 * Domain bebas.
 * Urutan atribut bebas.
 * Kutip atribut bebas.
 */
function isTargetPreloadImageTag(tag: string): boolean {
  if (!/^<link\b/i.test(tag)) return false;

  const href = getAttr(tag, "href");

  const hasHref = Boolean(href);
  const isPreload = attrContains(tag, "rel", "preload");
  const isImage = attrContains(tag, "as", "image");

  return hasHref && isPreload && isImage;
}

/**
 * Ambil semua tag <link ...> dalam satu baris.
 * Aman untuk file minify yang satu baris isinya banyak tag.
 */
function getLinkTags(line: string): string[] {
  return line.match(/<link\b[^>]*>/gi) ?? [];
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const info = await stat(fullPath);

    if (info.isDirectory()) {
      if (IGNORED_DIRS.has(entry)) continue;
      files.push(...(await walk(fullPath)));
      continue;
    }

    if (!info.isFile()) continue;

    const ext = extname(entry).toLowerCase();
    if (ALLOWED_EXT.has(ext)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  if (SHOULD_DELETE_LINE && SHOULD_DELETE_TAG) {
    console.error("Pilih salah satu saja: --delete-line atau --delete-tag");
    process.exit(1);
  }

  const files = await walk(ROOT_DIR);

  let totalFilesWithMatch = 0;
  let totalMatchedLines = 0;
  let totalMatchedTags = 0;
  let totalDeletedLines = 0;
  let totalDeletedTags = 0;

  for (const file of files) {
    const original = await readFile(file, "utf8");
    const lines = original.split(/\r?\n/);

    let fileHasMatch = false;
    let fileChanged = false;

    const newLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const linkTags = getLinkTags(line);
      const matchedTags = linkTags.filter(isTargetPreloadImageTag);

      if (matchedTags.length === 0) {
        newLines.push(line);
        continue;
      }

      fileHasMatch = true;
      totalMatchedLines++;
      totalMatchedTags += matchedTags.length;

      console.log(`MATCH: ${file}:${i + 1}`);
      console.log(line.trim());
      console.log("");

      /**
       * Mode hapus seluruh baris.
       * Cocok kalau satu baris memang hanya berisi tag preload image itu saja.
       */
      if (SHOULD_DELETE_LINE) {
        fileChanged = true;
        totalDeletedLines++;
        continue;
      }

      /**
       * Mode hapus tag saja.
       * Lebih aman untuk HTML minify atau satu baris berisi banyak tag.
       */
      if (SHOULD_DELETE_TAG) {
        let cleanedLine = line;

        for (const tag of matchedTags) {
          cleanedLine = cleanedLine.replace(tag, "");
          totalDeletedTags++;
        }

        fileChanged = true;

        if (cleanedLine.trim() !== "") {
          newLines.push(cleanedLine);
        }

        continue;
      }

      newLines.push(line);
    }

    if (fileHasMatch) {
      totalFilesWithMatch++;
    }

    if (fileChanged) {
      if (SHOULD_BACKUP) {
        await copyFile(file, `${file}.bak`);
      }

      await writeFile(file, newLines.join("\n"), "utf8");
    }
  }

  console.log("======================================");
  console.log(`Root              : ${ROOT_DIR}`);
  console.log(`Ekstensi          : ${[...ALLOWED_EXT].join(", ")}`);
  console.log(`File dicek        : ${files.length}`);
  console.log(`File ada match    : ${totalFilesWithMatch}`);
  console.log(`Baris match       : ${totalMatchedLines}`);
  console.log(`Tag match         : ${totalMatchedTags}`);

  if (SHOULD_DELETE_LINE) {
    console.log(`Baris dihapus     : ${totalDeletedLines}`);
    console.log(`Backup            : ${SHOULD_BACKUP ? "ya, .bak" : "tidak"}`);
  }

  if (SHOULD_DELETE_TAG) {
    console.log(`Tag dihapus       : ${totalDeletedTags}`);
    console.log(`Backup            : ${SHOULD_BACKUP ? "ya, .bak" : "tidak"}`);
  }

  if (!SHOULD_DELETE_LINE && !SHOULD_DELETE_TAG) {
    console.log("Mode              : scan saja, belum menghapus apa pun");
  }

  console.log("======================================");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
