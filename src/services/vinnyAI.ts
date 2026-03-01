import { GoogleGenerativeAI } from '@google/generative-ai';
import { Contact } from '@/data/mockData';

// ─── System prompt ────────────────────────────────────────────────────────────
const buildSystemPrompt = (contacts: Contact[]) => `
You are Vinny, a warm, sharp, and genuinely helpful professional network assistant.
You know everything about the user's contacts and give personalized, specific answers.
You sound like a smart friend who happens to know their whole network — never robotic, never templated.

The user's contacts (all of them):
${JSON.stringify(contacts, null, 2)}

Guidelines:
- Keep responses concise: 2–4 sentences in natural prose. Expand only if the user asks for detail.
- Reference contacts by name and use the real details (company, how they met, relationship strength, etc.).
- Never use bullet points unless the user explicitly asks for a list.
- Never say "I'm an AI" or "As an AI assistant..." — just answer naturally.
- Avoid filler phrases like "Great question!" or "Certainly!".
- When your response is about specific contacts, end with a JSON marker on its own line — nothing after it:
  {"highlight":["id1","id2"]}
  Include only the IDs of contacts you actually named or discussed.
- If no contacts need to be highlighted, omit the marker entirely.
`.trim();

// ─── Strip highlight marker from displayed text ───────────────────────────────
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

// ─── Main streaming function ──────────────────────────────────────────────────
export async function askVinny(
  userMessage: string,
  contacts: Contact[],
  onToken: (partialText: string) => void,
  signal?: AbortSignal
): Promise<string[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: buildSystemPrompt(contacts),
  });

  const result = await model.generateContentStream(userMessage);

  let fullText = '';

  for await (const chunk of result.stream) {
    if (signal?.aborted) break;
    const token = chunk.text();
    fullText += token;
    onToken(stripHighlight(fullText));
  }

  return parseHighlightIds(fullText);
}
