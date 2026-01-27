#!/bin/bash
echo '🧹 Memulai pembersihan repository...'
rm "ext/dsgdsgdsg.js"
npm uninstall @google/genai @octokit/core @xmldom/xmldom axios cheerio express glob node-fetch puppeteer rss-parser sharp tumblr.js
echo '✅ Pembersihan selesai!'
