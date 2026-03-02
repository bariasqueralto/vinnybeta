import { msalInstance, loginRequest, isOutlookConfigured } from './msalConfig';
import { Contact } from '@/data/mockData';

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function loginWithOutlook(): Promise<void> {
  if (!isOutlookConfigured) {
    throw new Error('OUTLOOK_NOT_CONFIGURED');
  }
  await msalInstance.loginPopup(loginRequest);
}

export async function logoutFromOutlook(): Promise<void> {
  const account = msalInstance.getActiveAccount();
  if (account) {
    await msalInstance.logoutPopup({ account });
  }
}

export function isAuthenticated(): boolean {
  return msalInstance.getActiveAccount() !== null;
}

export function getActiveAccount() {
  return msalInstance.getActiveAccount();
}

async function getAccessToken(): Promise<string> {
  const account = msalInstance.getActiveAccount();
  if (!account) throw new Error('NOT_AUTHENTICATED');

  try {
    const response = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account,
    });
    return response.accessToken;
  } catch {
    const response = await msalInstance.acquireTokenPopup(loginRequest);
    return response.accessToken;
  }
}

// ─── Graph API ───────────────────────────────────────────────────────────────

interface GraphEmailAddress {
  emailAddress: {
    name: string;
    address: string;
  };
}

interface GraphMessage {
  id: string;
  subject: string;
  receivedDateTime: string;
  from: GraphEmailAddress;
  toRecipients: GraphEmailAddress[];
  ccRecipients: GraphEmailAddress[];
}

interface GraphResponse {
  value: GraphMessage[];
  '@odata.nextLink'?: string;
}

export async function fetchEmails(maxMessages: number = 200): Promise<GraphMessage[]> {
  const token = await getAccessToken();
  const allMessages: GraphMessage[] = [];
  const pageSize = 50;

  let url: string | null =
    `https://graph.microsoft.com/v1.0/me/messages?$top=${pageSize}&$select=id,subject,receivedDateTime,from,toRecipients,ccRecipients&$orderby=receivedDateTime desc`;

  while (url && allMessages.length < maxMessages) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    if (!response.ok) {
      throw new Error(`Graph API error: ${response.status} ${response.statusText}`);
    }

    const data: GraphResponse = await response.json();
    allMessages.push(...data.value);
    url = data['@odata.nextLink'] || null;
  }

  return allMessages.slice(0, maxMessages);
}

// ─── Email → Contact transformation ─────────────────────────────────────────

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

export function processEmailsToContacts(
  messages: GraphMessage[],
  userEmail: string
): Contact[] {
  const userAddr = userEmail.toLowerCase();
  const map = new Map<string, AggregatedContact>();

  // Aggregate all participants by email address
  for (const msg of messages) {
    const date = new Date(msg.receivedDateTime);
    const participants: Array<{ name: string; email: string }> = [];

    if (msg.from?.emailAddress) {
      participants.push({
        name: msg.from.emailAddress.name || msg.from.emailAddress.address.split('@')[0],
        email: msg.from.emailAddress.address.toLowerCase(),
      });
    }
    for (const recip of [...(msg.toRecipients || []), ...(msg.ccRecipients || [])]) {
      if (recip?.emailAddress) {
        participants.push({
          name: recip.emailAddress.name || recip.emailAddress.address.split('@')[0],
          email: recip.emailAddress.address.toLowerCase(),
        });
      }
    }

    for (const p of participants) {
      if (p.email === userAddr) continue;

      const existing = map.get(p.email);
      if (existing) {
        existing.emailCount += 1;
        if (p.name.includes(' ') && !existing.name.includes(' ')) {
          existing.name = p.name;
        }
        if (date > existing.lastEmailDate) {
          existing.lastEmailDate = date;
        }
      } else {
        map.set(p.email, {
          name: p.name,
          email: p.email,
          domain: p.email.split('@')[1],
          emailCount: 1,
          lastEmailDate: date,
        });
      }
    }
  }

  const aggregated = Array.from(map.values());
  if (aggregated.length === 0) return [];

  const maxCount = Math.max(...aggregated.map((c) => c.emailCount));

  // Top 50 by frequency
  const topContacts = aggregated
    .sort((a, b) => b.emailCount - a.emailCount)
    .slice(0, 50);

  return topContacts.map((ac, index): Contact => ({
    id: `outlook-${index + 1}`,
    name: ac.name,
    title: '',
    company: companyFromDomain(ac.domain),
    avatar: '',
    source: 'outlook',
    industry: '',
    location: '',
    relationshipStrength: emailCountToStrength(ac.emailCount, maxCount),
    lastInteraction: formatTimeAgo(ac.lastEmailDate),
    howYouKnow: `You've exchanged ${ac.emailCount} email${ac.emailCount > 1 ? 's' : ''} recently.`,
    sharedConnections: 0,
    email: ac.email,
  }));
}
