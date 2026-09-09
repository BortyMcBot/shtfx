#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
      content: fs.readFileSync(path.join(dirPath, name), 'utf8').trim()
    }));
}

function bulletList(items, fallback = '- Not documented yet.') {
  if (!Array.isArray(items) || items.length === 0) return [fallback];
  return items.map((item) => `- ${item}`);
}

function valueLine(label, value, fallback = 'Not documented yet.') {
  return `- **${label}:** ${value ?? fallback}`;
}

function renderMembers(members = []) {
  if (!members.length) return ['- No household members recorded yet.'];
  return members.map((member) => {
    const extras = [];
    if (member.role) extras.push(member.role);
    if (Array.isArray(member.medical_needs) && member.medical_needs.length) {
      extras.push(`medical: ${member.medical_needs.join(', ')}`);
    }
    const suffix = extras.length ? ` — ${extras.join(' | ')}` : '';
    return `- ${member.name} (${member.age})${suffix}`;
  });
}

function renderPets(pets = []) {
  if (!pets.length) return ['- No pets documented.'];
  return pets.map((pet) => {
    const parts = [pet.type, pet.name].filter(Boolean).join(': ');
    return pet.special_needs ? `- ${parts} — ${pet.special_needs}` : `- ${parts}`;
  });
}

function renderDestinations(destinations = []) {
  if (!destinations.length) return ['- No bug-out destinations documented yet.'];
  return destinations.map((dest) => {
    const parts = [];
    if (dest.priority) parts.push(dest.priority);
    if (dest.name) parts.push(dest.name);
    if (dest.location) parts.push(dest.location);
    if (dest.distance_miles != null) parts.push(`${dest.distance_miles} miles`);
    let line = `- ${parts.join(' — ')}`;
    if (dest.notes) line += ` (${dest.notes})`;
    return line;
  });
}

function addSection(lines, title, bodyLines) {
  lines.push(`## ${title}`);
  lines.push('');
  lines.push(...bodyLines);
  lines.push('');
}

function generateHandbook(profileDir) {
  const profilePath = path.join(profileDir, 'profile.json');
  const researchDir = path.join(profileDir, 'research');
  const outputPath = path.join(profileDir, 'handbook.md');

  if (!fs.existsSync(profilePath)) {
    throw new Error(`Missing profile.json in ${profileDir}`);
  }

  const profile = readJson(profilePath);
  const notes = listResearchNotes(researchDir);

  const lines = [];
  lines.push('# SHTFx Handbook');
  lines.push('');
  lines.push('> Generated from structured household profile data and research notes.');
  lines.push('');

  addSection(lines, 'Household', [
    '### Members',
    '',
    ...renderMembers(profile.household_profile?.members),
    '',
    '### Pets',
    '',
    ...renderPets(profile.household_profile?.pets),
    '',
    valueLine('Notes', profile.household_profile?.notes),
    valueLine(
      'Existing prep',
      Array.isArray(profile.household_profile?.existing_prep) && profile.household_profile.existing_prep.length
        ? profile.household_profile.existing_prep.join(', ')
        : null
    )
  ]);

  addSection(lines, 'Location and Movement', [
    valueLine('Home area', profile.location?.home_area),
    valueLine('Region', profile.location?.region),
    valueLine(
      'Regional hazards',
      Array.isArray(profile.location?.regional_hazards) && profile.location.regional_hazards.length
        ? profile.location.regional_hazards.join(', ')
        : null
    ),
    '',
    '### Bug-out destinations',
    '',
    ...renderDestinations(profile.location?.bug_out_destinations),
    '',
    valueLine('Primary route', profile.evacuation?.primary_route),
    valueLine('Secondary route', profile.evacuation?.secondary_route)
  ]);

  addSection(lines, 'Threats', Array.isArray(profile.threats) && profile.threats.length
    ? profile.threats
        .slice()
        .sort((a, b) => (a.likelihood_rank ?? 999) - (b.likelihood_rank ?? 999))
        .map((threat) => {
          const parts = [`${threat.name} (#${threat.likelihood_rank ?? '?'})`];
          if (threat.impact) parts.push(threat.impact);
          if (threat.notes) parts.push(threat.notes);
          return `- ${parts.join(' — ')}`;
        })
    : ['- Threat ranking not documented yet.']);

  addSection(lines, 'Supplies and Utilities', [
    valueLine('Food storage days', profile.supplies?.food_storage_days),
    valueLine('Water storage gallons', profile.supplies?.water_storage_gallons),
    valueLine('72-hour kit contents', Array.isArray(profile.supplies?.kit_72hr) && profile.supplies.kit_72hr.length ? profile.supplies.kit_72hr.join(', ') : null),
    valueLine('Generator', profile.supplies?.generator?.type ? `${profile.supplies.generator.type}${profile.supplies.generator.rated_wattage ? `, ${profile.supplies.generator.rated_wattage}W` : ''}` : null),
    valueLine('Generator notes', profile.supplies?.generator?.notes),
    valueLine('Solar backup', profile.supplies?.solar?.capacity_watts ? `${profile.supplies.solar.capacity_watts}W` : null),
    valueLine('Solar notes', profile.supplies?.solar?.notes),
    valueLine('Shelter-in-place water plan', profile.shelter_in_place?.water_storage_plan),
    valueLine('Power backup plan', profile.shelter_in_place?.power_backup),
    valueLine('Shelter-in-place strategy', profile.shelter_in_place?.strategy)
  ]);

  addSection(lines, 'Communications', [
    valueLine('Out-of-area contact', profile.communications?.out_of_area_contact?.name),
    valueLine('Contact location', profile.communications?.out_of_area_contact?.location),
    valueLine('Communications plan', profile.communications?.comms_plan),
    '',
    '### Rally points',
    '',
    ...bulletList(profile.communications?.rally_points)
  ]);

  addSection(lines, 'Medical and Skills', [
    valueLine('First aid capability', profile.medical?.first_aid_capability),
    valueLine('Medications', Array.isArray(profile.medical?.medications) && profile.medical.medications.length ? profile.medical.medications.join(', ') : null),
    valueLine('Special needs', Array.isArray(profile.medical?.special_needs) && profile.medical.special_needs.length ? profile.medical.special_needs.join(', ') : null),
    valueLine('Medical notes', profile.medical?.notes),
    valueLine('First aid certifications', Array.isArray(profile.skills?.first_aid_certs) && profile.skills.first_aid_certs.length ? profile.skills.first_aid_certs.join(', ') : null),
    valueLine('Fire response', profile.skills?.fire),
    valueLine('Navigation', profile.skills?.navigation),
    valueLine('Food production', profile.skills?.food_production),
    valueLine('Self-defense', profile.skills?.self_defense)
  ]);

  addSection(lines, 'Finances and Community', [
    valueLine('Emergency cash on hand', profile.finances?.cash_on_hand),
    valueLine('Document backups', Array.isArray(profile.finances?.document_copies) && profile.finances.document_copies.length ? profile.finances.document_copies.join(', ') : null),
    valueLine('Insurance', Array.isArray(profile.finances?.insurance) && profile.finances.insurance.length ? profile.finances.insurance.join(', ') : null),
    valueLine('Mutual aid', profile.community?.mutual_aid),
    '',
    '### Neighbors / support network',
    '',
    ...bulletList(profile.community?.neighbors),
    '',
    '### Local resources',
    '',
    ...bulletList(profile.community?.local_resources)
  ]);

  addSection(lines, 'Research Notes Included', notes.length === 0
    ? ['- No research notes found.']
    : notes.flatMap((note) => [`### ${note.name}`, '', note.content, '']));

  addSection(lines, 'Next Steps', [
    '- Fill remaining unknown fields, especially routes, communications, and supplies.',
    '- Review research notes against current local conditions and seasonal changes.',
    '- TODO (Phase 2): Render to HTML.',
    '- TODO (Phase 2): Render to PDF.'
  ]);

  fs.writeFileSync(outputPath, lines.join('\n'));
  return outputPath;
}

function main() {
  try {
    const outputPath = generateHandbook(process.cwd());
    console.log(`Generated ${outputPath}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateHandbook };
