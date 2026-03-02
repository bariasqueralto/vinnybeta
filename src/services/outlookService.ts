import { msalInstance, loginRequest, isOutlookConfigured } from './msalConfig';
import { processEmailsToContacts as processToContacts } from './emailContacts';
import type { EmailMessage } from './emailContacts';

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function loginWithOutlook(): Promise<void> {
  if (!isOutlookConfigured) {
    throw new Error('OUTLOOK_NOT_CONFIGURED');
  }
  // Use redirect instead of popup: main window goes to Microsoft and back.
  // More reliable than popup (no blockers), and user clearly sees the auth flow.
  await msalInstance.loginRedirect(loginRequest);
}

export async function logoutFromOutlook(): Promise<void> {
  const account = msalInstance.getActiveAccount();
  if (account) {
    await msalInstance.logoutRedirect({ account });
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
    // Use redirect (not popup) to avoid timed_out; page will reload with fresh token
    await msalInstance.acquireTokenRedirect(loginRequest);
    throw new Error('TOKEN_REFRESH_REDIRECT'); // never returns; page navigates away
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

    if (response.status === 401) {
      // Token invalid or missing Mail.Read consent — force fresh login
      await msalInstance.acquireTokenRedirect(loginRequest);
      throw new Error('TOKEN_REFRESH_REDIRECT');
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

/** Convert Graph API messages to shared format and extract contacts */
export function processEmailsToContacts(
  messages: GraphMessage[],
  userEmail: string
) {
  const normalized: EmailMessage[] = messages.map((msg) => {
    const from = msg.from?.emailAddress
      ? { name: msg.from.emailAddress.name || msg.from.emailAddress.address.split('@')[0], email: msg.from.emailAddress.address.toLowerCase() }
      : undefined;
    const toRecipients = (msg.toRecipients || [])
      .filter((r) => r?.emailAddress)
      .map((r) => ({ name: r!.emailAddress!.name || r!.emailAddress!.address!.split('@')[0], email: r!.emailAddress!.address!.toLowerCase() }));
    const ccRecipients = (msg.ccRecipients || [])
      .filter((r) => r?.emailAddress)
      .map((r) => ({ name: r!.emailAddress!.name || r!.emailAddress!.address!.split('@')[0], email: r!.emailAddress!.address!.toLowerCase() }));
    return { from, toRecipients, ccRecipients, date: new Date(msg.receivedDateTime) };
  });
  return processToContacts(normalized, userEmail, 'outlook');
}
