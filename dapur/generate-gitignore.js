const fs = require('fs')
const path = require('path')

const folders = fs
  .readdirSync('.', { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => dirent.name)

const ignoreList = []

const addBlock = (title, items) => {
  ignoreList.push(`# ┌─────────────────────────────┐`)
  ignoreList.push(`# │  ${title.padEnd(27)}│`)
  ignoreList.push(`# └─────────────────────────────┘`)
  ignoreList.push(...items, '')
}

// Core folders
if (folders.includes('node_modules'))
  addBlock('DEPENDENCIES & BUILD', ['node_modules/'])
if (folders.includes('dist')) addBlock('BUILD OUTPUT', ['dist/'])
if (folders.includes('build')) addBlock('BUILD OUTPUT', ['build/'])
if (folders.includes('out')) addBlock('BUILD OUTPUT', ['out/'])

// Metadata & fallback
if (folders.includes('fallback')) addBlock('FALLBACK & METADATA', ['fallback/'])
if (folders.includes('metadata')) addBlock('FALLBACK & METADATA', ['metadata/'])

// System artifacts
addBlock('SYSTEM & IDE ARTIFACTS', [
  '.DS_Store',
  'Thumbs.db',
  '.vscode/',
  '.idea/',
])

// Config & logs
addBlock('ENV & CONFIG FILES', ['.env', '*.log', '*.local.json', '*.config.js'])

// Ornamentation & HTML drafts
addBlock('SVG ORNAMENTATION', ['ornament-*.svg', 'pattern-*.svg', 'grid-*.svg'])
addBlock('INTERACTIVE HTML PAGES', [
  '*.bak.html',
  '*.draft.html',
  '*.preview.html',
  '*.snapshot.html',
])

// Write to file
fs.writeFileSync('.gitignore', ignoreList.join('\n'))
console.log('✅ .gitignore generated based on current folder structure.')
