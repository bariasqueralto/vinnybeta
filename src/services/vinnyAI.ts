import { GoogleGenerativeAI } from '@google/generative-ai';
import { Contact } from '@/data/mockData';
import type { ContactStoreData, ContactProfile } from './contactStore';

// ─── Configuration ──────────────────────────────────────────────────────────

const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
export const isLLMConfigured = !!genAI;

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

// ─── Simulated streaming (for legacy fallback) ──────────────────────────────

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

// ─── Contact matching helpers (used for context selection + legacy) ──────────

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
    const companyLower = (c.company || '').toLowerCase();
    if (!companyLower) return false;
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
      return contacts.filter((c) => (c.location || '').includes(city));
    }
  }
  return [];
}

function recencyDays(interaction: string): number {
  const n = parseInt(interaction) || 1;
  if (interaction.includes('day')) return n;
  if (interaction.includes('week')) return n * 7;
  if (interaction.includes('month')) return n * 30;
  return 999;
}

function hl(ids: string[]): string {
  if (ids.length === 0) return '';
  return `\n{"highlight":[${ids.map((id) => `"${id}"`).join(',')}]}`;
}

// ─── Legacy rule-based response (fallback when no LLM key) ──────────────────

function generateResponseLegacy(message: string, contacts: Contact[]): string {
  const lower = message.toLowerCase().trim();

  if (
    /^(hi|hey|hello|sup|yo|what'?s?\s*up|howdy|good\s*(morning|afternoon|evening))\b/i.test(lower) &&
    lower.length < 35
  ) {
    return "Hey! What do you want to know about your network? I can look up contacts by name, company, industry, or location.";
  }

  if (/^(thanks|thank\s*you|ty|thx|appreciate)/i.test(lower)) {
    return "Anytime! Let me know if you need anything else about your network.";
  }

  if (/\b(help|what\s+can\s+you|how\s+do\s+i|what\s+do\s+you)\b/i.test(lower)) {
    return "I can help you search through your contacts. Try asking about a specific person, company, industry like banking or tech, or a city. You can also ask things like \"who are my strongest connections?\" or \"who have I talked to recently?\"";
  }

  if (
    /\b(all|everyone|every\s*one|every\s+contact|full\s+network|whole\s+network|show\s+me\s+every)\b/i.test(lower) ||
    /\b(all\s+my\s+contacts?|all\s+contacts?|show\s+me\s+all\s+my\s+contacts?)\b/i.test(lower)
  ) {
    const names = contacts.map((c) => c.name).join(', ');
    const ids = contacts.map((c) => c.id);
    return `You have ${contacts.length} contacts in your network — ${names}. I've highlighted all of them on your map.${hl(ids)}`;
  }

  if (/\b(how\s+many|count|number\s+of|total)\b/i.test(lower) && /\b(contact|connection|people|person|network)\b/i.test(lower)) {
    const industries = [...new Set(contacts.map((c) => c.industry))];
    return `You have ${contacts.length} contacts across ${industries.length} industries: ${industries.join(', ')}.`;
  }

  if (
    /\b(strong|closest|best|top|important|key)\b/i.test(lower) &&
    /\b(connect|contact|relation|people|person|network)\b/i.test(lower)
  ) {
    const sorted = [...contacts].sort((a, b) => b.relationshipStrength - a.relationshipStrength);
    const top = sorted.slice(0, 3);
    const desc = top.map((c) => `${c.name} (${c.company}, strength ${c.relationshipStrength}/10)`).join(', ');
    return `Your strongest connections are ${desc}. These are the people you're tightest with in your network.${hl(top.map((c) => c.id))}`;
  }

  if (/\b(reconnect|reach\s+out|catch\s+up|re-?connect|haven'?t\s+(talk|spoke|connect))\b/i.test(lower)) {
    const sorted = [...contacts].sort((a, b) => recencyDays(b.lastInteraction) - recencyDays(a.lastInteraction));
    const stale = sorted.slice(0, 3);
    const desc = stale.map((c) => `${c.name} (last connected ${c.lastInteraction})`).join(', ');
    return `You might want to reconnect with ${desc}. It's been a while since you've been in touch.${hl(stale.map((c) => c.id))}`;
  }

  if (/\b(recent|lately|last\s+talk|last\s+spoke|recently)\b/i.test(lower)) {
    const sorted = [...contacts].sort((a, b) => recencyDays(a.lastInteraction) - recencyDays(b.lastInteraction));
    const top = sorted.slice(0, 3);
    const desc = top.map((c) => `${c.name} (${c.lastInteraction})`).join(', ');
    return `Your most recent interactions are with ${desc}. Want me to dig into any of them?${hl(top.map((c) => c.id))}`;
  }

  const industry = matchIndustry(lower);
  if (industry) {
    const matched = contacts.filter((c) => c.industry === industry);
    if (matched.length === 0) return `I don't see any ${industry} contacts in your network right now.`;
    const names = matched.map((c) => `${c.name} (${c.title} at ${c.company})`).join(', ');
    return `You have ${matched.length} ${industry} contact${matched.length !== 1 ? 's' : ''} — ${names}. I've highlighted them on your map.${hl(matched.map((c) => c.id))}`;
  }

  const nameMatches = matchByName(message, contacts);
  if (nameMatches.length === 1) {
    const c = nameMatches[0];
    if (/\b(how\s+(do\s+)?i\s+know|where\s+did\s+(i|we)\s+meet|how\s+did\s+(we|i))\b/i.test(lower)) {
      return `${c.howYouKnow} Your relationship strength is ${c.relationshipStrength}/10.${hl([c.id])}`;
    }
    if (/\b(email|contact\s*info|phone|number|reach)\b/i.test(lower)) {
      let info = `${c.name}'s email is ${c.email || 'not on file'}.`;
      if (c.phone) info += ` Phone: ${c.phone}.`;
      return `${info}${hl([c.id])}`;
    }
    return `${c.name} is a ${c.title} at ${c.company} in ${c.location}. ${c.howYouKnow} You last connected ${c.lastInteraction} and share ${c.sharedConnections} mutual connection${c.sharedConnections !== 1 ? 's' : ''}.${hl([c.id])}`;
  }
  if (nameMatches.length > 1) {
    const names = nameMatches.map((c) => `${c.name} (${c.company})`).join(', ');
    return `I found ${nameMatches.length} contacts matching that — ${names}. Want me to tell you more about any of them?${hl(nameMatches.map((c) => c.id))}`;
  }

  const companyMatches = matchByCompany(message, contacts);
  if (companyMatches.length === 1) {
    const c = companyMatches[0];
    return `Your contact at ${c.company} is ${c.name}, a ${c.title}. ${c.howYouKnow} You last connected ${c.lastInteraction}.${hl([c.id])}`;
  }
  if (companyMatches.length > 1) {
    const names = companyMatches.map((c) => `${c.name} (${c.title})`).join(', ');
    return `You know ${companyMatches.length} people at ${companyMatches[0].company} — ${names}.${hl(companyMatches.map((c) => c.id))}`;
  }

  const locationMatches = matchByLocation(message, contacts);
  if (locationMatches.length > 0) {
    const location = locationMatches[0].location || 'Unknown';
    const names = locationMatches.map((c) => `${c.name} (${c.company})`).join(', ');
    return `You have ${locationMatches.length} contact${locationMatches.length !== 1 ? 's' : ''} in ${location} — ${names}.${hl(locationMatches.map((c) => c.id))}`;
  }

  if (/\b(weather|recipe|code|math|news|joke|song|movie|game)\b/i.test(lower)) {
    return "I'm only here to help with your network — try asking me about your contacts or connections.";
  }

  const names = contacts.map((c) => c.name).join(', ');
  return `I couldn't find an exact match, but here are all your contacts: ${names}. I've highlighted them on your map.${hl(contacts.map((c) => c.id))}`;
}

// ─── LLM prompt building ────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Vinny, a concise and friendly network intelligence assistant. You help the user understand their professional network based on their email history.

Rules:
- Be conversational but concise (2-4 sentences typical, up to 5 for detailed questions)
- Base your answers on the email data provided — subjects and snippets reveal what topics were discussed
- When you mention specific contacts, ALWAYS end your response with a JSON highlight marker on its own line:
  {"highlight":["contact-id-1","contact-id-2"]}
- The highlight IDs are provided in the contact data as "id"
- If asked about someone not in the contacts, say so honestly
- Do not make up information that isn't supported by the email data
- Infer reasonable conclusions from email subjects and snippets (e.g., topics discussed, professional relationship)
- When asked "who is X?", give a profile based on what you can see: their company/domain, how many emails exchanged, what topics come up, and when you last interacted`;

function buildContactSummary(contacts: Contact[]): string {
  if (contacts.length === 0) return 'No contacts synced yet.';
  const lines = contacts.map((c) => {
    const parts = [`${c.name} (id: ${c.id})`];
    if (c.email) parts.push(`email: ${c.email}`);
    if (c.company) parts.push(`company: ${c.company}`);
    if (c.title) parts.push(`title: ${c.title}`);
    if (c.industry) parts.push(`industry: ${c.industry}`);
    if (c.location) parts.push(`location: ${c.location}`);
    parts.push(`strength: ${c.relationshipStrength}/10`);
    parts.push(`last: ${c.lastInteraction}`);
    if (c.howYouKnow) parts.push(`relationship: ${c.howYouKnow}`);
    return '- ' + parts.join(', ');
  });
  return `USER'S CONTACTS (${contacts.length} total):\n${lines.join('\n')}`;
}

function buildEmailHistory(profile: ContactProfile): string {
  const lines = profile.emails.map((e) => {
    const dateStr = new Date(e.date).toLocaleDateString();
    const dir = e.direction === 'sent' ? 'SENT' : e.direction === 'received' ? 'RECEIVED' : 'CC';
    const subj = e.subject || '(no subject)';
    const snip = e.snippet ? ` — "${e.snippet}"` : '';
    return `  [${dateStr}, ${dir}] ${subj}${snip}`;
  });
  return `EMAIL HISTORY WITH ${profile.contact.name} (${profile.contact.email || 'unknown'}, id: ${profile.contact.id}):\n${lines.join('\n')}`;
}

function buildPrompt(
  userMessage: string,
  contacts: Contact[],
  contactStore?: ContactStoreData | null
): string {
  const parts: string[] = [buildContactSummary(contacts)];

  if (contactStore) {
    // Try to find specific contacts the user is asking about
    const nameMatches = matchByName(userMessage, contacts);
    const companyMatches = nameMatches.length === 0 ? matchByCompany(userMessage, contacts) : [];
    const targeted = nameMatches.length > 0 ? nameMatches : companyMatches;

    if (targeted.length >= 1 && targeted.length <= 3) {
      // Include email histories for specifically matched contacts
      for (const c of targeted) {
        const email = c.email?.toLowerCase();
        if (email && contactStore.profiles[email]) {
          parts.push(buildEmailHistory(contactStore.profiles[email]));
        }
      }
    } else {
      // No exact match — include all email histories (capped) so the LLM
      // can fuzzy-match names (e.g., "Benjamin" → "Benjamín Arias")
      const allProfiles = Object.values(contactStore.profiles);
      for (const profile of allProfiles.slice(0, 10)) {
        if (profile.emails.length > 0) {
          parts.push(buildEmailHistory(profile));
        }
      }
    }
  }

  parts.push(`USER'S QUESTION: ${userMessage}`);
  return parts.join('\n\n');
}

// ─── Main entry point ───────────────────────────────────────────────────────

export async function askVinny(
  userMessage: string,
  contacts: Contact[],
  onToken: (partialText: string) => void,
  signal?: AbortSignal,
  contactStore?: ContactStoreData | null
): Promise<string[]> {
  if (signal?.aborted) return [];

  // Fallback to legacy rule-based system when no LLM key
  if (!genAI) {
    const fullResponse = generateResponseLegacy(userMessage, contacts);
    const displayText = stripHighlight(fullResponse);
    await streamText(displayText, onToken, signal);
    return parseHighlightIds(fullResponse);
  }

  // LLM path — use Gemini with email context
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });
    const prompt = buildPrompt(userMessage, contacts, contactStore);

    const result = await model.generateContentStream(prompt);

    let fullText = '';
    for await (const chunk of result.stream) {
      if (signal?.aborted) break;
      const text = chunk.text();
      if (text) {
        fullText += text;
        onToken(stripHighlight(fullText));
      }
    }

    return parseHighlightIds(fullText);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Gemini API error:', errMsg, err);
    // Fall back to rule-based response
    const fullResponse = generateResponseLegacy(userMessage, contacts);
    await streamText(stripHighlight(fullResponse), onToken, signal);
    return parseHighlightIds(fullResponse);
  }
}
