const express = require('express');
const Parser = require('rss-parser');
const cors = require('cors');
const fetch = require('node-fetch');
const { URL } = require('url');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const CACHE_DIR = path.join(__dirname, 'cache');
// ensure cache dir exists
try { fs.mkdirSync(CACHE_DIR, { recursive: true }); } catch (e) { /* ignore */ }

const app = express();
const parser = new Parser();
const PORT = process.env.PORT || 3001;

app.use(cors());

const THAIHEALTH_RSS = 'https://www.thaihealth.or.th/category/%E0%B8%82%E0%B9%88%E0%B8%B2%E0%B8%A7%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%E0%B8%AA%E0%B8%B8%E0%B8%82/%E0%B8%82%E0%B9%88%E0%B8%B2%E0%B8%A7%E0%B8%AA%E0%B8%B8%E0%B8%82%E0%B8%A0%E0%B8%B2%E0%B8%9E/feed/';

// keywords to filter articles about e-cigarettes / บุหรี่ไฟฟ้า
const KEYWORDS = [
  'บุหรี่ไฟฟ้า', 'บุหรี่อิเล็กทรอนิกส์', 'ไอระเหย', 'e-cig', 'e-cigarette', 'vape', 'vaping',
  'อีซิก', 'อีซี', 'พ็อด', 'pod', 'นิโคติน', 'nicotine', 'น้ำยาบุหรี่ไฟฟ้า'
];

// keywords to try with WP REST API search as a fallback when RSS filtering returns nothing
const SEARCH_KEYWORDS = [
  'บุหรี่ไฟฟ้า', 'บุหรี่อิเล็กทรอนิกส์', 'ไอระเหย', 'vape', 'e-cigarette', 'พ็อด', 'น้ำยาบุหรี่ไฟฟ้า'
];

const WP_POSTS_API = 'https://www.thaihealth.or.th/wp-json/wp/v2/posts';

// Extra RSS sources to query when thaihealth + wp fallback return nothing
const EXTRA_RSS_SOURCES = [
  // Google News (Thai) search for บุหรี่ไฟฟ้า
  'https://news.google.com/rss/search?q=%E0%B8%9A%E0%B8%B8%E0%B8%AB%E0%B8%A3%E0%B9%88%E0%B8%B2%E0%B8%84%E0%B8%B7%E0%B8%9A%E0%B9%84%E0%B8%9F%E0%B8%B2&hl=th&gl=TH&ceid=TH:th',
];

async function fetchAndFilterExtraRss(keywords, limit = 20) {
  const seen = new Map();
  const out = [];
  for (const src of EXTRA_RSS_SOURCES) {
    try {
      const feed = await parser.parseURL(src);
      const srcItems = (feed.items || []).map(item => ({
        title: item.title,
        link: item.link || item.guid || null,
        pubDate: item.pubDate || item.isoDate || null,
        content: item.content || item.contentSnippet || item['content:encoded'] || '',
        thumbnail: item.enclosure?.url || item['media:content']?.url || extractImageFromHtml(item['content:encoded'] || item.content || '') || null,
      }));

      for (const it of srcItems) {
        if (!it.link) continue;
        if (seen.has(it.link)) continue;
        // only keep items that match keywords in title or content
        if (matchesKeywords(it.title) || matchesKeywords(it.content)) {
          seen.set(it.link, true);
          out.push(it);
          if (out.length >= limit) break;
        }
      }
      if (out.length >= limit) break;
    } catch (e) {
      console.warn('Failed to fetch extra RSS', src, e && e.message);
      continue;
    }
  }
  // sort by date (newest first)
  out.sort((a,b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
  return out;
}

async function fetchWithRetry(url, options = {}, attempts = 2) {
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (e) {
      lastErr = e;
      // small backoff
      await new Promise(r => setTimeout(r, 300 * (i+1)));
    }
  }
  throw lastErr;
}

function cacheFilenameForUrl(url, contentType) {
  const hash = crypto.createHash('sha1').update(url).digest('hex');
  let ext = '';
  try {
    const p = new URL(url).pathname;
    ext = path.extname(p).split('?')[0];
  } catch (e) {
    ext = '';
  }
  if (!ext && contentType) {
    if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = '.jpg';
    else if (contentType.includes('png')) ext = '.png';
    else if (contentType.includes('gif')) ext = '.gif';
    else if (contentType.includes('webp')) ext = '.webp';
    else ext = '.img';
  }
  if (!ext) ext = '.img';
  return `${hash}${ext}`;
}

async function fetchAndCacheImage(url) {
  const key = crypto.createHash('sha1').update(url).digest('hex');
  // find any file starting with key
  const files = await fsp.readdir(CACHE_DIR);
  const existing = files.find(f => f.startsWith(key));
  if (existing) return path.join(CACHE_DIR, existing);

  try {
    const res = await fetchWithRetry(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0 (Node)' } }, 2);
    if (!res.ok) throw new Error('bad upstream');
    const buf = await res.arrayBuffer();
    const buffer = Buffer.from(buf);
    const contentType = res.headers.get('content-type') || '';
    const filename = cacheFilenameForUrl(url, contentType);
    const filepath = path.join(CACHE_DIR, filename.startsWith(key) ? filename : `${key}${path.extname(filename)}`);
    await fsp.writeFile(filepath, buffer);
    return filepath;
  } catch (e) {
    // failed to fetch/cache
    return null;
  }
}

function matchesKeywords(text) {
  if (!text) return false;
  const lc = text.toString().toLowerCase();
  return KEYWORDS.some(k => lc.includes(k.toLowerCase()));
}

function resolveAbsoluteUrl(base, src) {
  if (!src) return null;
  try {
    // If src already absolute, URL will work and return origin
    return new URL(src, base).toString();
  } catch (e) {
    return src;
  }
}

function extractImageFromHtml(html, base) {
  if (!html) return null;
  try {
    // try og:image
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    if (og && og[1]) return resolveAbsoluteUrl(base, og[1]);
    // try twitter image
    const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    if (tw && tw[1]) return resolveAbsoluteUrl(base, tw[1]);
    // try link rel=image_src
    const ln = html.match(/<link[^>]+rel=["']image_src["'][^>]*href=["']([^"']+)["'][^>]*>/i);
    if (ln && ln[1]) return resolveAbsoluteUrl(base, ln[1]);
    // try img with src, data-src, or srcset
    const imgSrcRegex = /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/i;
    const m = html.match(imgSrcRegex);
    if (m && m[1]) return resolveAbsoluteUrl(base, m[1]);
    // try srcset (take first URL)
    const srcset = html.match(/<img[^>]+srcset=["']([^"']+)["'][^>]*>/i);
    if (srcset && srcset[1]) {
      const first = srcset[1].split(',')[0].trim().split(' ')[0];
      if (first) return resolveAbsoluteUrl(base, first);
    }
    return null;
  } catch (e) {
    return null;
  }
}

app.get('/news/thaihealth', async (req, res) => {
  try {
    const feed = await parser.parseURL(THAIHEALTH_RSS);
    const items = (feed.items || []).map(item => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      content: item.content || item.contentSnippet || item['content:encoded'] || '',
      // try several common fields for thumbnails, fall back to extracting <img> from HTML
      thumbnail: (item.enclosure && item.enclosure.url) || item['media:content']?.url || item['media:thumbnail']?.url || extractImageFromHtml(item['content:encoded'] || item.content || '', item.link || THAIHEALTH_RSS) || null,
    }));

    // For items without thumbnail, try fetching the article page and extract og:image / first img as a fallback
    for (const it of items) {
      if (it.thumbnail) continue;
      if (!it.link) continue;
      try {
        const r = await fetchWithRetry(it.link, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0 (Node)' } }, 2);
        if (!r.ok) continue;
        const html = await r.text();
        const found = extractImageFromHtml(html, it.link);
        if (found) it.thumbnail = found;
      } catch (e) {
        // ignore per-item fetch errors
      }
    }

    // filter for keywords in title or content
    const filtered = items.filter(it => matchesKeywords(it.title) || matchesKeywords(it.content));

    // Return recent items first for filtered list
    filtered.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate));

    // statistics for diagnostics
    const stats = {
      feedTotal: items.length,
      filteredCount: filtered.length,
      wpFallbackCount: 0
    };

    // If no filtered items were found, try WP REST API search as a fallback
    let resultItems = [];
    if (filtered.length > 0) {
      resultItems = filtered;
    } else {
      try {
        const seen = new Map();
        for (const kw of SEARCH_KEYWORDS) {
          // request embedded media to get featured image without extra fetches
          const url = `${WP_POSTS_API}?search=${encodeURIComponent(kw)}&per_page=10&_embed`;
          const r = await fetchWithRetry(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0 (Node)' } }, 2);
          if (!r.ok) continue;
          const posts = await r.json();
          for (const p of posts) {
            const link = p.link || (p._links && p._links.self && p._links.self[0] && p._links.self[0].href) || null;
            if (!link) continue;
            if (seen.has(link)) continue;
            seen.set(link, true);
            let thumb = null;
            // prefer _embedded featured media when available
            try {
              if (p._embedded && p._embedded['wp:featuredmedia'] && p._embedded['wp:featuredmedia'][0]) {
                thumb = p._embedded['wp:featuredmedia'][0].source_url || null;
              }
            } catch (merr) {
              // ignore
            }

            // fallback: try to extract image from excerpt/content
            if (!thumb) {
              const htmlSource = (p.excerpt && p.excerpt.rendered) ? p.excerpt.rendered : (p.content && p.content.rendered) ? p.content.rendered : '';
              thumb = extractImageFromHtml(htmlSource) || null;
            }

            resultItems.push({
              title: (p.title && p.title.rendered) ? p.title.rendered : p.title || 'No title',
              link: link,
              pubDate: p.date || p.modified || null,
              content: (p.excerpt && p.excerpt.rendered) ? p.excerpt.rendered : (p.content && p.content.rendered) ? p.content.rendered : '',
              thumbnail: thumb,
            });
          }
        }
        // sort by date if available
        resultItems.sort((a,b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
        stats.wpFallbackCount = resultItems.length;
      } catch (wpErr) {
        console.warn('WP fallback search failed', wpErr && wpErr.message);
      }
    }

    // If WP fallback returned nothing, try extra RSS sources (Google News etc.)
    if ((!resultItems || resultItems.length === 0)) {
      try {
        const extra = await fetchAndFilterExtraRss(KEYWORDS, 30);
        if (extra && extra.length > 0) {
          resultItems = extra;
          stats.wpFallbackCount = resultItems.length;
        }
      } catch (exErr) {
        console.warn('Extra RSS fetch failed', exErr && exErr.message);
      }
    }

  // decide which source was used
  const used = resultItems.length > 0 ? (filtered.length > 0 ? 'rss' : (stats.wpFallbackCount > 0 ? 'wp' : 'extra')) : 'none';

  // Log thumbnail sample for debugging (up to 5)
  console.log('Thumbnail samples:', resultItems.slice(0,5).map(i => ({ title: i.title, thumbnail: i.thumbnail }))); 

    // Log diagnostic info
    console.log(`ThaiHealth proxy: feedTotal=${stats.feedTotal} filtered=${stats.filteredCount} wpFallback=${stats.wpFallbackCount} used=${used}`);

    // Return diagnostics and items (items empty if none found)
    res.set('Cache-Control', 'public, max-age=600'); // 10 minutes
    res.json({ source: 'thaihealth', used, stats, items: resultItems });
  } catch (err) {
    console.error('Error fetching ThaiHealth RSS', err && err.message);
    res.status(500).json({ error: err.message || 'fetch_error' });
  }
});


// Serve frontend static files if a build folder exists at repository root.
// Check common build dirs like `web-build` or `dist` so the same Render service
// can host both the API and the built web app regardless of your build output.
const FRONTEND_CANDIDATES = [path.join(__dirname, '..', 'web-build'), path.join(__dirname, '..', 'dist')];
let FRONTEND_DIR = null;
for (const p of FRONTEND_CANDIDATES) {
  if (fs.existsSync(p)) { FRONTEND_DIR = p; break; }
}
if (FRONTEND_DIR) {
  console.log('Serving frontend from', FRONTEND_DIR);
  app.use(express.static(FRONTEND_DIR));
  // Serve index.html for SPA routes
  app.get('/', (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'index.html')));
  app.get('*', (req, res, next) => {
    // allow API routes to pass through
    if (req.path.startsWith('/news') || req.path.startsWith('/thumb')) return next();
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  });
}

app.listen(PORT, () => console.log(`ThaiHealth news proxy listening on http://localhost:${PORT}/news/thaihealth`));

// Simple thumbnail proxy to avoid CORS / remote blocking and ensure images are accessible to the app
// Usage: /thumb?url=<encoded-image-url>
app.get('/thumb', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).json({ error: 'missing url' });
  try {
    // Basic validation: only allow http(s)
    if (!/^https?:\/\//i.test(imageUrl)) return res.status(400).json({ error: 'invalid url' });
    // Try to serve from disk cache first
    const key = crypto.createHash('sha1').update(imageUrl).digest('hex');
    const files = await fsp.readdir(CACHE_DIR);
    const existing = files.find(f => f.startsWith(key));
    if (existing) {
      const fp = path.join(CACHE_DIR, existing);
      const stat = await fsp.stat(fp);
      const ext = path.extname(fp).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.webp') contentType = 'image/webp';
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=86400');
      res.set('Content-Length', stat.size);
      return fs.createReadStream(fp).pipe(res);
    }

    // Not cached: fetch and store
    const proxied = await fetchWithRetry(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Node)' }, timeout: 10000 }, 2);
    if (!proxied.ok) return res.status(502).json({ error: 'bad_upstream', status: proxied.status });
    const contentType = proxied.headers.get('content-type') || 'application/octet-stream';
    const filename = cacheFilenameForUrl(imageUrl, contentType);
    const filepath = path.join(CACHE_DIR, `${crypto.createHash('sha1').update(imageUrl).digest('hex')}${path.extname(filename)}`);
    const arrayBuf = await proxied.arrayBuffer();
    await fsp.writeFile(filepath, Buffer.from(arrayBuf));
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    return fs.createReadStream(filepath).pipe(res);
  } catch (e) {
    console.warn('Thumbnail proxy error for', imageUrl, e && e.message);
    res.status(500).json({ error: 'proxy_failed' });
  }
});
