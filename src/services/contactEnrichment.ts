import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ContactStoreData, ContactProfile } from './contactStore';
import { saveContactStore } from './contactStore';

const ENRICHMENT_PROMPT = `Analyze these emails and infer what you can about this contact. Return ONLY valid JSON with these fields (use empty string "" if you can't determine a field):

{
  "title": "their job title or role (e.g., 'VP of Engineering', 'Product Manager')",
  "company": "their company name",
  "industry": "one of: Banking, Tech, Real Estate, Healthcare, Legal, Consulting, Media, Education, or a short custom label",
  "location": "city and state/country if mentioned",
  "howYouKnow": "2-sentence summary of the relationship based on email topics and tone"
}

Only infer from the email data below. Do not guess wildly.`;

interface EnrichmentResult {
  title?: string;
  company?: string;
  industry?: string;
  location?: string;
  howYouKnow?: string;
}

function buildEnrichmentPrompt(profile: ContactProfile): string {
  const emailLines = profile.emails.slice(0, 30).map((e) => {
    const dateStr = new Date(e.date).toLocaleDateString();
    const dir = e.direction === 'sent' ? 'SENT' : e.direction === 'received' ? 'RECEIVED' : 'CC';
    return `[${dateStr}, ${dir}] Subject: ${e.subject || '(none)'} | Preview: ${e.snippet || '(none)'}`;
  });

  return `${ENRICHMENT_PROMPT}

Contact: ${profile.contact.name} (${profile.contact.email || 'unknown'})
Domain: ${profile.contact.email?.split('@')[1] || 'unknown'}
Emails exchanged: ${profile.emails.length}

${emailLines.join('\n')}`;
}

function parseEnrichmentJSON(text: string): EnrichmentResult | null {
  // Try to extract JSON from the response (may include markdown code fences)
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]) as EnrichmentResult;
  } catch {
    return null;
  }
}

/** Enrich a single contact profile using Gemini */
export async function enrichContactProfile(
  profile: ContactProfile,
  genAI: GoogleGenerativeAI
): Promise<ContactProfile> {
  if (profile.emails.length === 0) {
    return { ...profile, enriched: true, enrichedAt: new Date().toISOString() };
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = buildEnrichmentPrompt(profile);

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = parseEnrichmentJSON(text);

  if (!parsed) {
    return { ...profile, enriched: true, enrichedAt: new Date().toISOString() };
  }

  // Merge into contact — only fill empty fields
  const contact = { ...profile.contact };
  if (!contact.title && parsed.title) contact.title = parsed.title;
  if (!contact.company && parsed.company) contact.company = parsed.company;
  if (!contact.industry && parsed.industry) contact.industry = parsed.industry;
  if (!contact.location && parsed.location) contact.location = parsed.location;
  if (parsed.howYouKnow) contact.howYouKnow = parsed.howYouKnow; // Always update — LLM summary is better

  return {
    ...profile,
    contact,
    enriched: true,
    enrichedAt: new Date().toISOString(),
  };
}

/** Enrich all un-enriched contacts in the store. Runs sequentially with delays. */
export async function enrichAllContacts(
  store: ContactStoreData,
  onProgress?: (completed: number, total: number) => void
): Promise<ContactStoreData> {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
  if (!apiKey) return store;

  const genAI = new GoogleGenerativeAI(apiKey);
  const profiles = Object.entries(store.profiles);
  const toEnrich = profiles.filter(([, p]) => !p.enriched);

  if (toEnrich.length === 0) return store;

  let completed = 0;
  const updatedStore = { ...store, profiles: { ...store.profiles } };

  for (const [email, profile] of toEnrich) {
    try {
      const enriched = await enrichContactProfile(profile, genAI);
      updatedStore.profiles[email] = enriched;
      completed++;
      onProgress?.(completed, toEnrich.length);

      // Save after each enrichment so progress isn't lost
      saveContactStore(updatedStore);

      // Delay between requests to respect rate limits
      if (completed < toEnrich.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch (err) {
      console.warn(`Failed to enrich ${profile.contact.name}:`, err);
      // Mark as enriched to avoid retry loops
      updatedStore.profiles[email] = {
        ...profile,
        enriched: true,
        enrichedAt: new Date().toISOString(),
      };
      completed++;
      onProgress?.(completed, toEnrich.length);
    }
  }

  return updatedStore;
}
