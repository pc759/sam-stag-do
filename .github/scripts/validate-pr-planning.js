#!/usr/bin/env node

const prBody = (process.env.PR_BODY || '').replace(/\r\n/g, '\n');

const requiredHeadings = [
  'Summary',
  'Guardrail checks',
  'Planning trigger',
  'Exemption rationale',
  'Objective',
  'Scope',
  'Discovery summary',
  'Conflict check',
  'Implementation approach',
  'Verification plan',
  'Rollback plan',
  'Notes for reviewer',
];

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasHeading(markdown, heading) {
  const pattern = new RegExp(`^##\\s+${escapeRegex(heading)}\\s*$`, 'mi');
  return pattern.test(markdown);
}

function getSectionBody(markdown, heading) {
  const headingRegex = new RegExp(`^##\\s+${escapeRegex(heading)}\\s*$`, 'mi');
  const match = headingRegex.exec(markdown);
  if (!match) return '';

  const sectionStart = match.index + match[0].length;
  const rest = markdown.slice(sectionStart);
  const nextHeadingMatch = /^##\s+/m.exec(rest);
  const sectionEnd = nextHeadingMatch ? sectionStart + nextHeadingMatch.index : markdown.length;

  return markdown.slice(sectionStart, sectionEnd).trim();
}

function stripMarkdownNoise(value) {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/[-*]\s+\[[ xX]\]\s+/g, ' ')
    .replace(/[-*]\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isMeaningful(value) {
  if (!value || !value.trim()) return false;

  const plain = stripMarkdownNoise(value);
  if (!plain) return false;

  const normalized = plain.toLowerCase();
  if (['n/a', 'na', 'none', 'tbd'].includes(normalized)) return false;

  return plain.replace(/\s/g, '').length >= 8;
}

function runValidation(markdown) {
  const errors = [];

  if (!markdown.trim()) {
    errors.push('PR body is empty. Complete the PR template including Planning Gate sections.');
    return errors;
  }

  const missingHeadings = requiredHeadings.filter((heading) => !hasHeading(markdown, heading));
  if (missingHeadings.length > 0) {
    errors.push(`Missing required section heading(s): ${missingHeadings.join(', ')}`);
  }

  const requiredChecked = /-\s*\[[xX]\]\s*Planning Gate Required\b/.test(markdown);
  const exemptChecked = /-\s*\[[xX]\]\s*Planning Gate Exempt\b/.test(markdown);

  if ((requiredChecked && exemptChecked) || (!requiredChecked && !exemptChecked)) {
    errors.push('Planning trigger must have exactly one checked option: Planning Gate Required OR Planning Gate Exempt.');
  }

  if (requiredChecked) {
    const requiredSections = [
      'Objective',
      'Scope',
      'Discovery summary',
      'Conflict check',
      'Implementation approach',
      'Verification plan',
      'Rollback plan',
    ];

    const invalid = requiredSections.filter((section) => !isMeaningful(getSectionBody(markdown, section)));
    if (invalid.length > 0) {
      errors.push(`Planning Gate Required selected, but these sections are missing meaningful content: ${invalid.join(', ')}`);
    }
  }

  if (exemptChecked) {
    const rationale = getSectionBody(markdown, 'Exemption rationale');
    if (!isMeaningful(rationale)) {
      errors.push('Planning Gate Exempt selected, but Exemption rationale is missing meaningful content.');
    }
  }

  return errors;
}

const errors = runValidation(prBody);

if (errors.length > 0) {
  console.error('❌ PR planning gate validation failed:\n');
  errors.forEach((error, index) => {
    console.error(`${index + 1}. ${error}`);
  });
  process.exit(1);
}

console.log('✅ PR planning gate validation passed.');
