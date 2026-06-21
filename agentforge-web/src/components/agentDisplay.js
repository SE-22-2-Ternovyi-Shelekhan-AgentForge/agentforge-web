// Helpers for presenting agents/roles consistently across the chat UI.

const PALETTE = [
  'linear-gradient(135deg, #7c5cff, #4d9fff)',
  'linear-gradient(135deg, #ff7eb3, #ff5c7a)',
  'linear-gradient(135deg, #2dd4bf, #3b82f6)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #a78bfa, #ec4899)',
  'linear-gradient(135deg, #34d399, #10b981)',
  'linear-gradient(135deg, #60a5fa, #818cf8)',
];

// Known role → emoji glyph. Falls back to initials.
const ROLE_GLYPHS = {
  developer: '⌨',
  coder: '⌨',
  critic: '🔍',
  reviewer: '✓',
  researcher: '📚',
  planner: '🗺',
  tester: '🧪',
  writer: '✎',
  designer: '🎨',
  analyst: '📊',
  summary: '🧩',
  synthesizer: '🧩',
};

// Roles with a fixed display label (others are just capitalized).
const ROLE_LABELS = {
  summary: 'Підсумок команди',
  synthesizer: 'Підсумок команди',
};

// True for the synthesized team summary (vs an individual agent).
export function isSummaryRole(key) {
  const k = (key || '').toLowerCase().trim();
  return k === 'summary' || k === 'synthesizer';
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Stable gradient for a given agent name/role.
export function agentGradient(key) {
  const k = (key || 'agent').toLowerCase();
  return PALETTE[hashString(k) % PALETTE.length];
}

// Short label shown inside the round avatar.
export function agentGlyph(key) {
  const k = (key || '').toLowerCase().trim();
  if (ROLE_GLYPHS[k]) return ROLE_GLYPHS[k];
  const initials = k
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return initials || '🤖';
}

// Human-friendly display name (capitalize role-ish strings).
export function prettyName(name) {
  if (!name) return 'Агент';
  const k = String(name).toLowerCase().trim();
  if (ROLE_LABELS[k]) return ROLE_LABELS[k];
  const s = String(name).trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Agent outputs are tagged as "[role]: <content>"; strip that prefix so the
// chat shows clean prose instead of a leading "[developer]:" marker.
export function stripRolePrefix(content, role) {
  if (!content) return '';
  let text = String(content);
  if (role) {
    const prefix = `[${role}]: `;
    if (text.startsWith(prefix)) return text.slice(prefix.length);
  }
  // Generic fallback: a leading "[something]: " tag.
  return text.replace(/^\[[^\]]{1,40}\]:\s*/, '');
}

// Pull the role out of a "[role]: ..." tagged trace output, if present.
export function roleFromTagged(content, fallback) {
  const m = /^\[([^\]]{1,40})\]:/.exec(String(content || ''));
  return m ? m[1] : fallback;
}
