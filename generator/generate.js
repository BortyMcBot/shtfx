#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const profilePath = path.join(root, 'profile.json');
const researchDir = path.join(root, 'research');
const outputPath = path.join(root, 'handbook.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listResearchNotes(dirPath) {
  if (!fs.existsSync(dirPath)) return [];

  return fs
    .readdirSync(dirPath)
    .filter((name) => name.endsWith('.md') && name.toLowerCase() !== 'readme.md')
    .sort()
    .map((name) => ({
      name,
      content: fs.readFileSync(path.join(dirPath, name), 'utf8')
    }));
}

function renderJson(value) {
  return '```json\n' + JSON.stringify(value, null, 2) + '\n```';
}

function main() {
  if (!fs.existsSync(profilePath)) {
    console.error('Missing profile.json in project root.');
    process.exit(1);
  }

  const profile = readJson(profilePath);
  const notes = listResearchNotes(researchDir);

  const lines = [];
  lines.push('# SHTFx Handbook');
  lines.push('');
  lines.push('> Generated from structured household profile data and research notes.');
  lines.push('');
  lines.push('## Household Profile Data');
  lines.push('');
  lines.push(renderJson(profile));
  lines.push('');
  lines.push('## Research Notes Included');
  lines.push('');

  if (notes.length === 0) {
    lines.push('- No research notes found.');
  } else {
    for (const note of notes) {
      lines.push(`### ${note.name}`);
      lines.push('');
      lines.push(note.content.trim());
      lines.push('');
    }
  }

  lines.push('## Next Steps');
  lines.push('');
  lines.push('- Review handbook content for completeness and operational accuracy.');
  lines.push('- TODO (Phase 2): Render to HTML.');
  lines.push('- TODO (Phase 2): Render to PDF.');
  lines.push('');

  fs.writeFileSync(outputPath, lines.join('\n'));
  console.log(`Generated ${outputPath}`);
}

main();
