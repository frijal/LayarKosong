// =========================================================
// SCRIPT: ext/generate-ai-api.js
// CI STRICT + AUTO KEY ROTATION + FAIL FAST
// =========================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- PATH SETUP ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const INPUT_METADATA_FILE = path.join(ROOT, 'artikel.json');
const INPUT_ARTICLES_DIR = path.join(ROOT, 'artikel');
const INPUT_LLMS_FILE = path.join(ROOT, 'llms.txt');
const OUTPUT_API_DIR = path.join(ROOT, 'api', 'v1');
const DOMAIN_BASE_URL = 'https://dalam.web.id';

// --- API KEYS ---
const apiKeys = [
  process.env.GEMINI_API_KEY,
...Array.from({ length: 20 }, (_, i) => process.env[`GEMINI_API_KEY${i + 1}`])
].filter(Boolean);

let currentKeyIndex = 0;

function getAI() {
  if (!apiKeys.length) {
    throw new Error('TIDAK ADA GEMINI_API_KEY TERSEDIA');
  }
  if (currentKeyIndex >= apiKeys.length) {
    throw new Error('SEMUA GEMINI_API_KEY TELAH HABIS');
  }
  return new GoogleGenerativeAI(apiKeys[currentKeyIndex]);
}

// --- PROMPT GENERATOR (ROTASI + STRICT) ---
async function generatePromptHint(content, title, summary) {
  const prompt = `
  Buat 3–5 pertanyaan alami (pisahkan dengan ;) yang jawabannya ADA di konten ini.

  Judul: ${title}
  Ringkasan: ${summary}
  Konten:
  ${content.slice(0, 1500)}
  `;

  while (currentKeyIndex < apiKeys.length) {
    const ai = getAI();

    try {
      const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err) {
      const status = err.status || err?.cause?.status;
      const message = err.message || String(err);

      console.error('❌ GEMINI ERROR');
      console.error(`   Key     : ${currentKeyIndex + 1}/${apiKeys.length}`);
      console.error(`   Status  : ${status ?? 'unknown'}`);
      console.error(`   Message : ${message}`);

      // 🔁 ROTASI KEY HANYA UNTUK ERROR RETRYABLE
      const isRetryable =
      status === 429 ||
      /quota|exhausted/i.test(message);

      if (isRetryable) {
        console.warn('🔁 Quota hit, rotasi ke key berikutnya...');
        currentKeyIndex++;
        continue;
      }

      // 🚫 ERROR LAIN (503, overload, dll) = FATAL
      throw err;
    }
  }

  // Jika loop habis
  throw new Error('SEMUA GEMINI_API_KEY GAGAL DIGUNAKAN');
}

// --- METADATA FLATTEN ---
function flatten(metadata) {
  const posts = [];

  for (const category in metadata) {
    for (const item of metadata[category]) {
      const [title, slug, img, date, summary, manualHint] = item;

      const post = {
        id: slug.replace('.html', ''),
        title,
        slug,
        url: `${DOMAIN_BASE_URL}/artikel/${slug}`,
        datePublished: date,
        summary,
        category,
        imageUrl: img,
        promptHint: manualHint || null,
        isManual: Boolean(manualHint),
        priority: 0
      };

      const days = (Date.now() - new Date(date)) / 86400000;
      if (days < 30) post.priority += 10;
      if (!post.isManual) post.priority += 5;
      if (/ai|teknologi/i.test(category)) post.priority += 3;

      posts.push(post);
    }
  }

  return posts.sort((a, b) => b.priority - a.priority);
}

// --- CLEAN HTML ---
function extractContent(slug) {
  const file = path.join(INPUT_ARTICLES_DIR, slug);
  if (!fs.existsSync(file)) return null;

  const $ = load(fs.readFileSync(file, 'utf8'));
  $('script,style,footer').remove();

  return $('.container').text().replace(/\s+/g, ' ').trim();
}

// --- LLMS WHITELIST ---
function getWhitelist() {
  if (!fs.existsSync(INPUT_LLMS_FILE)) return new Set();

  const text = fs.readFileSync(INPUT_LLMS_FILE, 'utf8');
  return new Set(
    [...text.matchAll(/\/artikel\/(.*?)\.html/g)].map(m => m[1])
  );
}

// --- MAIN ---
async function run() {
  fs.mkdirSync(path.join(OUTPUT_API_DIR, 'post'), { recursive: true });

  const meta = JSON.parse(fs.readFileSync(INPUT_METADATA_FILE));
  const posts = flatten(meta);
  const whitelist = getWhitelist();

  const index = [];

  for (const post of posts) {
    if (!whitelist.has(post.id)) continue;

    const out = path.join(OUTPUT_API_DIR, 'post', `${post.id}.json`);

    if (fs.existsSync(out)) {
      index.push(JSON.parse(fs.readFileSync(out)));
      continue;
    }

    const content = extractContent(post.slug);
    if (!content) continue;

    if (!post.isManual) {
      post.promptHint = await generatePromptHint(
        content,
        post.title,
        post.summary
      );
    }

    const data = { ...post, content_plain: content };
    delete data.priority;
    delete data.isManual;

    fs.writeFileSync(out, JSON.stringify(data, null, 2));
    index.push(data);
  }

  fs.writeFileSync(
    path.join(OUTPUT_API_DIR, 'index.json'),
                   JSON.stringify(index, null, 2)
  );

  console.log(`✔ Generated ${index.length} API entries`);
}

// --- FAIL FAST ENTRYPOINT ---
run().catch(err => {
  console.error('❌ FATAL PIPELINE ERROR');
  console.error(err);
  process.exit(1);
});
