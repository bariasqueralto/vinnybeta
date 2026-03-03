import { processEmailsToContacts, parseEmailHeaderString, type EmailMessage } from './emailContacts';
import type { Contact } from '@/data/mockData';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const EMAIL_SCOPE = 'https://www.googleapis.com/auth/userinfo.email';
const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

export const isGmailConfigured = clientId.length > 0;
export const gmailScope = `${GMAIL_SCOPE} ${EMAIL_SCOPE}`;

interface GmailMessageListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
}

interface GmailMessagePayload {
  headers?: Array<{ name: string; value: string }>;
  internalDate?: string;
}

interface GmailMessageResponse {
  id: string;
  snippet?: string;
  payload?: GmailMessagePayload;
}

function getHeader(headers: Array<{ name: string; value: string }> | undefined, name: string): string {
  if (!headers) return '';
  const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value || '';
}

/** Fetch a single message's metadata + snippet */
async function fetchOneMessage(
  id: string,
  accessToken: string
): Promise<EmailMessage | null> {
  const msgUrl = `https://www.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Date&metadataHeaders=Subject`;
  const msgRes = await fetch(msgUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!msgRes.ok) return null;

  const msgData: GmailMessageResponse = await msgRes.json();
  const headers = msgData.payload?.headers || [];

  const fromVal = getHeader(headers, 'From');
  const toVal = getHeader(headers, 'To');
  const ccVal = getHeader(headers, 'Cc');
  const dateVal = getHeader(headers, 'Date') || msgData.payload?.internalDate;

  const fromParsed = parseEmailHeaderString(fromVal);
  const toParsed = parseEmailHeaderString(toVal);
  const ccParsed = parseEmailHeaderString(ccVal);

  return {
    from: fromParsed[0],
    toRecipients: toParsed,
    ccRecipients: ccParsed,
    date: dateVal ? new Date(dateVal) : new Date(),
    subject: getHeader(headers, 'Subject'),
    snippet: msgData.snippet || '',
  };
}

/** Fetch Gmail messages (sent + received) and return contacts + raw messages */
export async function fetchGmailMessages(
  accessToken: string,
  userEmail: string,
  maxMessages: number = 200
): Promise<{ contacts: Contact[]; messages: EmailMessage[] }> {
  const allMessages: EmailMessage[] = [];
  let pageToken: string | undefined;
  const BATCH_SIZE = 10;

  do {
    const listUrl = new URL('https://www.googleapis.com/gmail/v1/users/me/messages');
    listUrl.searchParams.set('maxResults', '100');
    listUrl.searchParams.set('q', 'in:inbox OR in:sent');
    if (pageToken) listUrl.searchParams.set('pageToken', pageToken);

    const listRes = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listRes.ok) {
      const err = await listRes.text();
      throw new Error(`Gmail API error: ${listRes.status} ${listRes.statusText}. ${err}`);
    }

    const listData: GmailMessageListResponse = await listRes.json();
    const messageIds = (listData.messages?.map((m) => m.id) || [])
      .slice(0, maxMessages - allMessages.length);

    // Fetch in concurrent batches of BATCH_SIZE
    for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
      const batch = messageIds.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((id) => fetchOneMessage(id, accessToken))
      );
      for (const msg of results) {
        if (msg) allMessages.push(msg);
      }
    }

    pageToken = listData.nextPageToken;
  } while (pageToken && allMessages.length < maxMessages);

  const contacts = processEmailsToContacts(allMessages, userEmail, 'gmail');
  return { contacts, messages: allMessages };
}
