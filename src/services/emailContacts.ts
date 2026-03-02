import { Contact } from '@/data/mockData';

/** Normalized email message format shared by Outlook and Gmail */
export interface EmailMessage {
  from?: { name: string; email: string };
  toRecipients: Array<{ name: string; email: string }>;
  ccRecipients: Array<{ name: string; email: string }>;
  date: Date;
}

export type EmailSource = 'outlook' | 'gmail';

const FREEMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com',
  'yahoo.com', 'yahoo.co.uk', 'aol.com', 'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me', 'mail.com', 'zoho.com', 'yandex.com',
  'gmx.com', 'gmx.net', 'fastmail.com',
]);

interface AggregatedContact {
  name: string;
  email: string;
  domain: string;
  emailCount: number;
  lastEmailDate: Date;
}

function companyFromDomain(domain: string): string {
  if (FREEMAIL_DOMAINS.has(domain)) return '';
  const name = domain.split('.')[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffWeeks === 1) return '1 week ago';
  if (diffWeeks < 5) return `${diffWeeks} weeks ago`;
  if (diffMonths === 1) return '1 month ago';
  return `${diffMonths} months ago`;
}

function emailCountToStrength(count: number, maxCount: number): number {
  if (maxCount <= 1) return 5;
  const normalized = Math.log(count + 1) / Math.log(maxCount + 1);
  return Math.max(1, Math.min(10, Math.round(normalized * 9) + 1));
}

/** Parse RFC 2822 header: "Name <email@x.com>" or "email@x.com" or "Name" <email@x.com> */
export function parseEmailHeaderString(value: string): Array<{ name: string; email: string }> {
  if (!value?.trim()) return [];
  const results: { name: string; email: string }[] = [];
  const parts = value.split(',').map((p) => p.trim());
  for (const part of parts) {
    const angleMatch = part.match(/^"?([^"<]*)"?\s*<([^>]+)>$/);
    if (angleMatch) {
      const name = angleMatch[1].replace(/^["']|["']$/g, '').trim() || angleMatch[2].split('@')[0];
      results.push({ name, email: angleMatch[2].toLowerCase() });
    } else {
      const emailRe = /[^\s<>]+@[^\s<>]+/;
      const m = part.match(emailRe);
      if (m) {
        const email = m[0].toLowerCase();
        const name = part.replace(m[0], '').replace(/^["'\s]+|["'\s]+$/g, '').trim() || email.split('@')[0];
        results.push({ name, email });
      }
    }
  }
  if (results.length > 0) return results;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.includes('@')) return [{ name: trimmed.split('@')[0], email: trimmed }];
  return [];
}

/** Convert emails (sent + received) into Contact bubbles for the network graph */
export function processEmailsToContacts(
  messages: EmailMessage[],
  userEmail: string,
  source: EmailSource
): Contact[] {
  const userAddr = userEmail.toLowerCase();
  const map = new Map<string, AggregatedContact>();

  for (const msg of messages) {
    const participants: Array<{ name: string; email: string }> = [];
    if (msg.from) participants.push(msg.from);
    participants.push(...msg.toRecipients, ...msg.ccRecipients);

    for (const p of participants) {
      const email = p.email.toLowerCase();
      if (email === userAddr) continue;

      const existing = map.get(email);
      if (existing) {
        existing.emailCount += 1;
        if (p.name.includes(' ') && !existing.name.includes(' ')) existing.name = p.name;
        if (msg.date > existing.lastEmailDate) existing.lastEmailDate = msg.date;
      } else {
        map.set(email, {
          name: p.name,
          email,
          domain: email.split('@')[1] || '',
          emailCount: 1,
          lastEmailDate: msg.date,
        });
      }
    }
  }

  const aggregated = Array.from(map.values());
  if (aggregated.length === 0) return [];

  const maxCount = Math.max(...aggregated.map((c) => c.emailCount));
  const topContacts = aggregated
    .sort((a, b) => b.emailCount - a.emailCount)
    .slice(0, 50);

  const idPrefix = source === 'gmail' ? 'gmail' : 'outlook';
  return topContacts.map((ac, index): Contact => ({
    id: `${idPrefix}-${index + 1}`,
    name: ac.name,
    title: '',
    company: companyFromDomain(ac.domain),
    avatar: '',
    source,
    industry: '',
    location: '',
    relationshipStrength: emailCountToStrength(ac.emailCount, maxCount),
    lastInteraction: formatTimeAgo(ac.lastEmailDate),
    howYouKnow: `You've exchanged ${ac.emailCount} email${ac.emailCount > 1 ? 's' : ''} recently.`,
    sharedConnections: 0,
    email: ac.email,
  }));
}
