import type { Contact } from '@/data/mockData';
import type { EmailMessage, EmailSource } from './emailContacts';
import { processEmailsToContacts } from './emailContacts';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ContactEmail {
  subject: string;
  snippet: string;
  date: string;        // ISO string for serialization
  direction: 'sent' | 'received' | 'cc';
}

export interface ContactProfile {
  contact: Contact;
  emails: ContactEmail[];
  enriched: boolean;
  enrichedAt?: string;  // ISO timestamp
}

export interface ContactStoreData {
  version: number;
  userEmail: string;
  lastSyncAt: string;
  profiles: Record<string, ContactProfile>;  // keyed by contact email
}

const STORE_VERSION = 1;
const MAX_EMAILS_PER_CONTACT = 50;
const STORAGE_KEY_PREFIX = 'vinny_contacts_';
const USER_EMAIL_KEY = 'vinny_user_email';

// ─── localStorage helpers ───────────────────────────────────────────────────

export function saveContactStore(data: ContactStoreData): void {
  try {
    const key = STORAGE_KEY_PREFIX + data.userEmail.toLowerCase();
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(USER_EMAIL_KEY, data.userEmail.toLowerCase());
  } catch (e) {
    console.warn('Failed to save contact store:', e);
  }
}

export function loadContactStore(userEmail: string): ContactStoreData | null {
  try {
    const key = STORAGE_KEY_PREFIX + userEmail.toLowerCase();
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as ContactStoreData;
    if (data.version !== STORE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function getSavedUserEmail(): string | null {
  return localStorage.getItem(USER_EMAIL_KEY);
}

export function clearContactStore(userEmail: string): void {
  const key = STORAGE_KEY_PREFIX + userEmail.toLowerCase();
  localStorage.removeItem(key);
}

// ─── Build profiles from raw messages ───────────────────────────────────────

export function buildContactProfiles(
  messages: EmailMessage[],
  userEmail: string,
  source: EmailSource
): ContactStoreData {
  const userAddr = userEmail.toLowerCase();

  // Group emails by contact email address
  const emailsByContact = new Map<string, { name: string; emails: ContactEmail[] }>();

  for (const msg of messages) {
    const fromEmail = msg.from?.email?.toLowerCase() || '';
    const isSent = fromEmail === userAddr;

    // Collect all participants except the user
    const participants: Array<{ email: string; name: string; dir: ContactEmail['direction'] }> = [];

    if (msg.from && msg.from.email.toLowerCase() !== userAddr) {
      participants.push({ email: msg.from.email.toLowerCase(), name: msg.from.name, dir: 'received' });
    }
    for (const r of msg.toRecipients) {
      if (r.email.toLowerCase() !== userAddr) {
        participants.push({ email: r.email.toLowerCase(), name: r.name, dir: isSent ? 'sent' : 'cc' });
      }
    }
    for (const r of msg.ccRecipients) {
      if (r.email.toLowerCase() !== userAddr) {
        participants.push({ email: r.email.toLowerCase(), name: r.name, dir: 'cc' });
      }
    }

    const emailRecord: ContactEmail = {
      subject: msg.subject || '',
      snippet: msg.snippet || '',
      date: msg.date.toISOString(),
      direction: isSent ? 'sent' : 'received',
    };

    for (const p of participants) {
      const existing = emailsByContact.get(p.email);
      if (existing) {
        // Update name if fuller version found
        if (p.name.includes(' ') && !existing.name.includes(' ')) {
          existing.name = p.name;
        }
        if (existing.emails.length < MAX_EMAILS_PER_CONTACT) {
          existing.emails.push({ ...emailRecord, direction: p.dir });
        }
      } else {
        emailsByContact.set(p.email, {
          name: p.name,
          emails: [{ ...emailRecord, direction: p.dir }],
        });
      }
    }
  }

  // Also generate the standard Contact[] for the network graph
  const contacts = processEmailsToContacts(messages, userEmail, source);
  const contactByEmail = new Map(contacts.map((c) => [c.email?.toLowerCase() || '', c]));

  // Build profiles
  const profiles: Record<string, ContactProfile> = {};
  for (const [email, data] of emailsByContact) {
    // Use the processed contact if available, otherwise skip (filtered out by processEmailsToContacts)
    const contact = contactByEmail.get(email);
    if (!contact) continue;

    // Sort emails by date descending (most recent first)
    data.emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    profiles[email] = {
      contact,
      emails: data.emails.slice(0, MAX_EMAILS_PER_CONTACT),
      enriched: false,
    };
  }

  return {
    version: STORE_VERSION,
    userEmail: userAddr,
    lastSyncAt: new Date().toISOString(),
    profiles,
  };
}

// ─── Lookup helpers ─────────────────────────────────────────────────────────

export function getContactByEmail(
  store: ContactStoreData,
  email: string
): ContactProfile | null {
  return store.profiles[email.toLowerCase()] || null;
}

export function getContactByName(
  store: ContactStoreData,
  name: string
): ContactProfile[] {
  const lower = name.toLowerCase();
  return Object.values(store.profiles).filter((p) => {
    const contactName = p.contact.name.toLowerCase();
    const parts = contactName.split(' ');
    return (
      contactName.includes(lower) ||
      lower.includes(contactName) ||
      parts.some((part) => part.length >= 3 && lower.includes(part))
    );
  });
}

export function getAllProfiles(store: ContactStoreData): ContactProfile[] {
  return Object.values(store.profiles);
}

export function getContactsFromStore(store: ContactStoreData): Contact[] {
  return Object.values(store.profiles).map((p) => p.contact);
}
