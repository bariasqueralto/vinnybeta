import { Contact } from '@/data/mockData';

// ─── Highlight marker utilities (shared with UI) ─────────────────────────────
const HIGHLIGHT_RE = /\n?\{"highlight":\[.*$/s;

export function stripHighlight(text: string): string {
  return text.replace(HIGHLIGHT_RE, '').trimEnd();
}

export function parseHighlightIds(fullText: string): string[] {
  const match = fullText.match(/\{"highlight":\[(.*?)\]\}/);
  if (!match) return [];
  try {
    return JSON.parse(`[${match[1]}]`);
  } catch {
    return [];
  }
}

// ─── Simulated streaming ─────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function streamText(
  text: string,
  onToken: (partial: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const words = text.split(/(\s+)/);
  let accumulated = '';
  for (const word of words) {
    if (signal?.aborted) break;
    accumulated += word;
    onToken(accumulated);
    await sleep(18 + Math.random() * 22);
  }
}

// ─── Industry keyword matching ───────────────────────────────────────────────
const INDUSTRY_PATTERNS: Array<[RegExp, string]> = [
  [/\b(banking|banker|bankers|bank)\b/i, 'Banking'],
  [/\b(financ\w*|wall\s*street|investment\s*bank)/i, 'Banking'],
  [/\b(tech|technology|software|engineer|developer|startup)\b/i, 'Tech'],
  [/\b(real\s*estate|property|realty|commercial\s*real\s*estate|cre|broker)\b/i, 'Real Estate'],
];

function matchIndustry(text: string): string | null {
  for (const [pattern, industry] of INDUSTRY_PATTERNS) {
    if (pattern.test(text)) return industry;
  }
  return null;
}

// ─── Contact matching helpers ────────────────────────────────────────────────
function matchByName(text: string, contacts: Contact[]): Contact[] {
  const lower = text.toLowerCase();
  return contacts.filter((c) => {
    const parts = c.name.toLowerCase().split(' ');
    return (
      lower.includes(c.name.toLowerCase()) ||
      parts.some((p) => p.length >= 3 && lower.includes(p))
    );
  });
}

function matchByCompany(text: string, contacts: Contact[]): Contact[] {
  const lower = text.toLowerCase();
  return contacts.filter((c) => {
    const companyLower = c.company.toLowerCase();
    if (lower.includes(companyLower)) return true;
    return companyLower
      .split(/\s+/)
      .some((word) => word.length >= 3 && lower.includes(word));
  });
}

const LOCATION_ALIASES: Record<string, string[]> = {
  'New York': ['new york', 'nyc', 'manhattan'],
  'San Francisco': ['san francisco', 'sf', 'bay area'],
  Seattle: ['seattle'],
  Chicago: ['chicago'],
};

function matchByLocation(text: string, contacts: Contact[]): Contact[] {
  const lower = text.toLowerCase();
  for (const [city, aliases] of Object.entries(LOCATION_ALIASES)) {
    if (aliases.some((a) => lower.includes(a))) {
      return contacts.filter((c) => c.location.includes(city));
    }
  }
  return [];
}

// ─── Recency parser (for sorting by last interaction) ────────────────────────
function recencyDays(interaction: string): number {
  const n = parseInt(interaction) || 1;
  if (interaction.includes('day')) return n;
  if (interaction.includes('week')) return n * 7;
  if (interaction.includes('month')) return n * 30;
  return 999;
}

// ─── Highlight JSON formatter ────────────────────────────────────────────────
function hl(ids: string[]): string {
  if (ids.length === 0) return '';
  return `\n{"highlight":[${ids.map((id) => `"${id}"`).join(',')}]}`;
}

// ─── Response generation ─────────────────────────────────────────────────────
function generateResponse(message: string, contacts: Contact[]): string {
  const lower = message.toLowerCase().trim();

  // ── Greetings ──────────────────────────────────────────────────────────────
  if (
    /^(hi|hey|hello|sup|yo|what'?s?\s*up|howdy|good\s*(morning|afternoon|evening))\b/i.test(lower) &&
    lower.length < 35
  ) {
    return "Hey! What do you want to know about your network? I can look up contacts by name, company, industry, or location.";
  }

  // ── Thank you ──────────────────────────────────────────────────────────────
  if (/^(thanks|thank\s*you|ty|thx|appreciate)/i.test(lower)) {
    return "Anytime! Let me know if you need anything else about your network.";
  }

  // ── Help / capabilities ────────────────────────────────────────────────────
  if (/\b(help|what\s+can\s+you|how\s+do\s+i|what\s+do\s+you)\b/i.test(lower)) {
    return "I can help you search through your contacts. Try asking about a specific person, company, industry like banking or tech, or a city. You can also ask things like \"who are my strongest connections?\" or \"who have I talked to recently?\"";
  }

  // ── All contacts / network overview ────────────────────────────────────────
  if (
    /\b(all|everyone|every\s*one|every\s+contact|full\s+network|whole\s+network|show\s+me\s+every)\b/i.test(lower)
  ) {
    const names = contacts.map((c) => c.name).join(', ');
    const ids = contacts.map((c) => c.id);
    return `You have ${contacts.length} contacts in your network — ${names}. I've highlighted all of them on your map.${hl(ids)}`;
  }

  // ── Network size ───────────────────────────────────────────────────────────
  if (/\b(how\s+many|count|number\s+of|total)\b/i.test(lower) && /\b(contact|connection|people|person|network)\b/i.test(lower)) {
    const industries = [...new Set(contacts.map((c) => c.industry))];
    return `You have ${contacts.length} contacts across ${industries.length} industries: ${industries.join(', ')}.`;
  }

  // ── Strongest connections ──────────────────────────────────────────────────
  if (
    /\b(strong|closest|best|top|important|key)\b/i.test(lower) &&
    /\b(connect|contact|relation|people|person|network)\b/i.test(lower)
  ) {
    const sorted = [...contacts].sort((a, b) => b.relationshipStrength - a.relationshipStrength);
    const top = sorted.slice(0, 3);
    const desc = top.map((c) => `${c.name} (${c.company}, strength ${c.relationshipStrength}/10)`).join(', ');
    return `Your strongest connections are ${desc}. These are the people you're tightest with in your network.${hl(top.map((c) => c.id))}`;
  }

  // ── Reconnection suggestions ───────────────────────────────────────────────
  if (/\b(reconnect|reach\s+out|catch\s+up|re-?connect|haven'?t\s+(talk|spoke|connect))\b/i.test(lower)) {
    const sorted = [...contacts].sort((a, b) => recencyDays(b.lastInteraction) - recencyDays(a.lastInteraction));
    const stale = sorted.slice(0, 3);
    const desc = stale.map((c) => `${c.name} (last connected ${c.lastInteraction})`).join(', ');
    return `You might want to reconnect with ${desc}. It's been a while since you've been in touch.${hl(stale.map((c) => c.id))}`;
  }

  // ── Recent interactions ────────────────────────────────────────────────────
  if (/\b(recent|lately|last\s+talk|last\s+spoke|recently)\b/i.test(lower)) {
    const sorted = [...contacts].sort((a, b) => recencyDays(a.lastInteraction) - recencyDays(b.lastInteraction));
    const top = sorted.slice(0, 3);
    const desc = top.map((c) => `${c.name} (${c.lastInteraction})`).join(', ');
    return `Your most recent interactions are with ${desc}. Want me to dig into any of them?${hl(top.map((c) => c.id))}`;
  }

  // ── Industry search ────────────────────────────────────────────────────────
  const industry = matchIndustry(lower);
  if (industry) {
    const matched = contacts.filter((c) => c.industry === industry);
    if (matched.length === 0) {
      return `I don't see any ${industry} contacts in your network right now.`;
    }
    const names = matched.map((c) => `${c.name} (${c.title} at ${c.company})`).join(', ');
    return `You have ${matched.length} ${industry} contact${matched.length !== 1 ? 's' : ''} — ${names}. I've highlighted them on your map.${hl(matched.map((c) => c.id))}`;
  }

  // ── Contact name lookup ────────────────────────────────────────────────────
  const nameMatches = matchByName(message, contacts);
  if (nameMatches.length === 1) {
    const c = nameMatches[0];
    // Tailor response if asking "how do I know…"
    if (/\b(how\s+(do\s+)?i\s+know|where\s+did\s+(i|we)\s+meet|how\s+did\s+(we|i))\b/i.test(lower)) {
      return `${c.howYouKnow} Your relationship strength is ${c.relationshipStrength}/10.${hl([c.id])}`;
    }
    // Tailor response if asking for contact info
    if (/\b(email|contact\s*info|phone|number|reach)\b/i.test(lower)) {
      let info = `${c.name}'s email is ${c.email || 'not on file'}.`;
      if (c.phone) info += ` Phone: ${c.phone}.`;
      return `${info}${hl([c.id])}`;
    }
    // Default: full profile
    return `${c.name} is a ${c.title} at ${c.company} in ${c.location}. ${c.howYouKnow} You last connected ${c.lastInteraction} and share ${c.sharedConnections} mutual connection${c.sharedConnections !== 1 ? 's' : ''}.${hl([c.id])}`;
  }
  if (nameMatches.length > 1) {
    const names = nameMatches.map((c) => `${c.name} (${c.company})`).join(', ');
    return `I found ${nameMatches.length} contacts matching that — ${names}. Want me to tell you more about any of them?${hl(nameMatches.map((c) => c.id))}`;
  }

  // ── Company search ─────────────────────────────────────────────────────────
  const companyMatches = matchByCompany(message, contacts);
  if (companyMatches.length === 1) {
    const c = companyMatches[0];
    return `Your contact at ${c.company} is ${c.name}, a ${c.title}. ${c.howYouKnow} You last connected ${c.lastInteraction}.${hl([c.id])}`;
  }
  if (companyMatches.length > 1) {
    const names = companyMatches.map((c) => `${c.name} (${c.title})`).join(', ');
    return `You know ${companyMatches.length} people at ${companyMatches[0].company} — ${names}.${hl(companyMatches.map((c) => c.id))}`;
  }

  // ── Location search ────────────────────────────────────────────────────────
  const locationMatches = matchByLocation(message, contacts);
  if (locationMatches.length > 0) {
    const location = locationMatches[0].location;
    const names = locationMatches.map((c) => `${c.name} (${c.company})`).join(', ');
    return `You have ${locationMatches.length} contact${locationMatches.length !== 1 ? 's' : ''} in ${location} — ${names}.${hl(locationMatches.map((c) => c.id))}`;
  }

  // ── Off-topic / unrelated ──────────────────────────────────────────────────
  if (/\b(weather|recipe|code|math|news|joke|song|movie|game)\b/i.test(lower)) {
    return "I'm only here to help with your network — try asking me about your contacts or connections.";
  }

  // ── Fallback ───────────────────────────────────────────────────────────────
  return "I couldn't find a match in your network. Try asking about a contact by name, company, or industry like banking, tech, or real estate.";
}

// ─── Main entry point ────────────────────────────────────────────────────────
export async function askVinny(
  userMessage: string,
  contacts: Contact[],
  onToken: (partialText: string) => void,
  signal?: AbortSignal
): Promise<string[]> {
  if (signal?.aborted) return [];

  const fullResponse = generateResponse(userMessage, contacts);
  const displayText = stripHighlight(fullResponse);

  await streamText(displayText, onToken, signal);

  return parseHighlightIds(fullResponse);
}
