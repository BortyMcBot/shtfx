#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const { generateHandbook } = require('../generator/generate.js');

const REPO_ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = process.env.SHTFX_DATA_DIR
  ? path.resolve(process.env.SHTFX_DATA_DIR)
  : (() => { throw new Error('SHTFX_DATA_DIR env var is required — point it at a profile/data directory.'); })();
const PORT = Number(process.env.PORT) || 4173;

const SCHEMA_PATH = path.join(REPO_ROOT, 'schema', 'handbook-schema.json');
const QUESTIONS_PATH = path.join(REPO_ROOT, 'questions', 'question-bank.json');
const PROFILE_PATH = path.join(DATA_DIR, 'profile.json');
const HANDBOOK_PATH = path.join(DATA_DIR, 'handbook.md');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 5_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function priorityRank(priority) {
  if (priority === 'high') return 3;
  if (priority === 'low') return 1;
  return 2;
}

function rankToLabel(rank) {
  if (rank >= 3) return 'high';
  if (rank <= 1) return 'low';
  return 'medium';
}

function humanize(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isMissing(value, fieldSchema) {
  if (value === undefined || value === null) return true;
  const type = fieldSchema.type;
  if (type === 'array') return !Array.isArray(value) || value.length === 0;
  if (type === 'string') return typeof value !== 'string' || value.trim() === '';
  if (type === 'number') return typeof value !== 'number';
  if (type === 'object') return typeof value !== 'object' || Object.keys(value).length === 0;
  return false;
}

function computeGaps(schema, profile, questions) {
  const sectionPriorityRank = {};
  for (const q of questions) {
    const rank = priorityRank(q.priority);
    if (!(q.section in sectionPriorityRank) || rank > sectionPriorityRank[q.section]) {
      sectionPriorityRank[q.section] = rank;
    }
  }

  const gaps = [];
  for (const section of schema.required || []) {
    const sectionSchema = schema.properties[section];
    if (!sectionSchema) continue;
    const priority = rankToLabel(sectionPriorityRank[section] ?? priorityRank('medium'));

    if (sectionSchema.type === 'array') {
      const value = profile[section];
      if (!Array.isArray(value) || value.length === 0) {
        gaps.push({ section, field: null, label: humanize(section), priority });
      }
      continue;
    }

    const requiredFields = sectionSchema.required || [];
    const sectionValue = profile[section] || {};
    for (const field of requiredFields) {
      const fieldSchema = (sectionSchema.properties || {})[field] || {};
      if (isMissing(sectionValue[field], fieldSchema)) {
        gaps.push({
          section,
          field,
          label: `${humanize(section)} — ${humanize(field)}`,
          priority
        });
      }
    }
  }

  const order = { high: 0, medium: 1, low: 2 };
  gaps.sort((a, b) => order[a.priority] - order[b.priority]);
  return gaps;
}

function serveStatic(req, res, pathname) {
  const relative = pathname === '/' ? '/index.html' : pathname;
  const resolved = path.normalize(path.join(PUBLIC_DIR, relative));
  if (!resolved.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(resolved, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(resolved);
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/schema' && req.method === 'GET') {
    return sendJson(res, 200, readJson(SCHEMA_PATH));
  }

  if (pathname === '/api/questions' && req.method === 'GET') {
    return sendJson(res, 200, readJson(QUESTIONS_PATH));
  }

  if (pathname === '/api/profile' && req.method === 'GET') {
    if (!fs.existsSync(PROFILE_PATH)) return sendJson(res, 200, {});
    return sendJson(res, 200, readJson(PROFILE_PATH));
  }

  if (pathname === '/api/profile' && req.method === 'PUT') {
    const body = await readBody(req);
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (err) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return sendJson(res, 400, { error: 'Profile must be a JSON object' });
    }
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(PROFILE_PATH, JSON.stringify(parsed, null, 2));
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/gaps' && req.method === 'GET') {
    const schema = readJson(SCHEMA_PATH);
    const questions = readJson(QUESTIONS_PATH);
    const profile = fs.existsSync(PROFILE_PATH) ? readJson(PROFILE_PATH) : {};
    return sendJson(res, 200, computeGaps(schema, profile, questions));
  }

  if (pathname === '/api/generate' && req.method === 'POST') {
    try {
      generateHandbook(DATA_DIR);
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  if (pathname === '/api/handbook' && req.method === 'GET') {
    if (!fs.existsSync(HANDBOOK_PATH)) return sendJson(res, 404, { error: 'No handbook generated yet' });
    res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8' });
    return res.end(fs.readFileSync(HANDBOOK_PATH, 'utf8'));
  }

  sendJson(res, 404, { error: 'Not found' });
}

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  if (pathname.startsWith('/api/')) {
    handleApi(req, res, pathname).catch((err) => {
      sendJson(res, 500, { error: err.message });
    });
    return;
  }
  if (req.method === 'GET') {
    serveStatic(req, res, pathname);
    return;
  }
  res.writeHead(405);
  res.end('Method not allowed');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`SHTFx app listening on :${PORT}, data dir: ${DATA_DIR}`);
});
