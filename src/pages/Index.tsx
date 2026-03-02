import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import VinnyBackground from '@/components/VinnyBackground';
import TopNav from '@/components/TopNav';
import LeftSidebar from '@/components/LeftSidebar';
import NetworkGraph from '@/components/NetworkGraph';
import {
  DataSource,
  Contact,
  ChatMessage,
  mockContacts,
  initialChatMessages,
} from '@/data/mockData';
import { askVinny } from '@/services/vinnyAI';
import { fetchGmailMessages, isGmailConfigured, gmailScope } from '@/services/gmailService';
import { initializeMsal, msalInstance, isOutlookConfigured } from '@/services/msalConfig';
import {
  loginWithOutlook,
  logoutFromOutlook,
  getActiveAccount,
  fetchEmails,
  processEmailsToContacts,
} from '@/services/outlookService';

/** Merge contacts from multiple sources, deduping by email (keep higher strength) */
function mergeContacts(bySource: Record<string, Contact[]>): Contact[] {
  const byEmail = new Map<string, Contact>();
  for (const list of Object.values(bySource)) {
    for (const c of list) {
      const key = (c.email || c.id).toLowerCase();
      const existing = byEmail.get(key);
      if (!existing || (c.relationshipStrength > existing.relationshipStrength)) {
        byEmail.set(key, c);
      }
    }
  }
  return Array.from(byEmail.values());
}

// ─── Component ────────────────────────────────────────────────────────────────
const Index = () => {
  const [activeSources, setActiveSources] = useState<Record<DataSource, boolean>>({
    outlook: true,
    gmail: true,
  });

  const [outlookContacts, setOutlookContacts] = useState<Contact[]>([]);
  const [gmailContacts, setGmailContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isOutlookConnected, setIsOutlookConnected] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [isSyncingOutlook, setIsSyncingOutlook] = useState(false);
  const [isSyncingGmail, setIsSyncingGmail] = useState(false);
  const [outlookError, setOutlookError] = useState<string | null>(null);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [msalReady, setMsalReady] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const contacts = useMemo(() => {
    if (isOutlookConnected || isGmailConnected) {
      const bySource: Record<string, Contact[]> = {};
      if (isOutlookConnected && outlookContacts.length) bySource.outlook = outlookContacts;
      if (isGmailConnected && gmailContacts.length) bySource.gmail = gmailContacts;
      const merged = mergeContacts(bySource);
      return merged.length > 0 ? merged : mockContacts;
    }
    return mockContacts;
  }, [isOutlookConnected, isGmailConnected, outlookContacts, gmailContacts]);

  const syncOutlookContacts = useCallback(async () => {
    setIsSyncingOutlook(true);
    setOutlookError(null);
    try {
      const account = getActiveAccount();
      if (!account) throw new Error('No active account');
      const msgs = await fetchEmails(200);
      const next = processEmailsToContacts(msgs, account.username);
      setOutlookContacts(next);
    } catch (err) {
      console.error('Outlook sync failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      const anyErr = err as { errorCode?: string; errorMessage?: string };
      if (msg === 'TOKEN_REFRESH_REDIRECT') return;
      let userMsg = anyErr?.errorMessage || msg || 'Sync failed.';
      if (String(msg).includes('403') || String(msg).includes('Forbidden')) userMsg = 'Mail.Read permission not granted.';
      setOutlookError(userMsg);
      setOutlookContacts([]);
    } finally {
      setIsSyncingOutlook(false);
    }
  }, []);

  useEffect(() => {
    if (!isOutlookConfigured) {
      setMsalReady(true);
      return;
    }
    initializeMsal().then((hadRedirect) => {
      setMsalReady(true);
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0]);
        setIsOutlookConnected(true);
        syncOutlookContacts();
      }
      if (hadRedirect && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      if (hadRedirect && window.opener) window.close();
    });
  }, [syncOutlookContacts]);

  const handleOutlookConnect = useCallback(async () => {
    if (!msalReady) return;
    if (isOutlookConnected) {
      await logoutFromOutlook();
      setIsOutlookConnected(false);
      setOutlookContacts([]);
      return;
    }
    setOutlookError(null);
    try {
      await loginWithOutlook();
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) msalInstance.setActiveAccount(accounts[0]);
      setIsOutlookConnected(true);
      await syncOutlookContacts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const anyErr = err as { errorCode?: string; errorMessage?: string };
      if (msg === 'OUTLOOK_NOT_CONFIGURED') setOutlookError('Add VITE_AZURE_CLIENT_ID to .env.local');
      else if (String(msg).toLowerCase().includes('redirect') || String(msg).includes('AADSTS50011')) {
        setOutlookError(`Redirect URI: add SPA platform in Azure with ${window.location.origin}`);
      } else setOutlookError(anyErr?.errorMessage || msg || 'Login failed.');
    }
  }, [msalReady, isOutlookConnected, syncOutlookContacts]);

  const login = useGoogleLogin({
    scope: gmailScope,
    onSuccess: async (tokenResponse) => {
      setIsSyncingGmail(true);
      setGmailError(null);
      try {
        const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const profile = profileRes.ok ? await profileRes.json() : { email: '' };
        const userEmail = profile.email || '';
        const next = await fetchGmailMessages(tokenResponse.access_token, userEmail);
        setGmailContacts(next);
        setIsGmailConnected(true);
      } catch (err) {
        console.error('Gmail sync failed:', err);
        setGmailError(err instanceof Error ? err.message : 'Sync failed. Try again.');
        setGmailContacts([]);
      } finally {
        setIsSyncingGmail(false);
      }
    },
    onError: () => setGmailError('Google sign-in failed. Try again.'),
  });

  const handleGmailConnect = useCallback(() => {
    if (!isGmailConfigured) {
      setGmailError('Add VITE_GOOGLE_CLIENT_ID to .env.local — see README.');
      return;
    }
    if (isGmailConnected) {
      setIsGmailConnected(false);
      setGmailContacts([]);
      return;
    }
    login();
  }, [isGmailConfigured, isGmailConnected, login]);

  const handleToggleSource = useCallback((source: DataSource) => {
    setActiveSources((prev) => ({ ...prev, [source]: !prev[source] }));
  }, []);

  const handleSelectContact = useCallback((contact: Contact) => {
    setSelectedContact(contact);
  }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    // Add user message
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Show typing indicator
    setIsTyping(true);

    const vinnyMsgId = `v-${Date.now()}`;

    try {
      // Seed an empty streaming message (invisible until first token arrives)
      let seeded = false;

      const highlightIds = await askVinny(
        text,
        contacts,
        (partialText) => {
          if (!seeded) {
            // First token — replace typing indicator with real message
            seeded = true;
            setIsTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                id: vinnyMsgId,
                role: 'vinny',
                content: partialText,
                timestamp,
                isStreaming: true,
              },
            ]);
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === vinnyMsgId ? { ...m, content: partialText } : m
              )
            );
          }
        },
        controller.signal
      );

      // Finalize — remove streaming flag
      setMessages((prev) =>
        prev.map((m) =>
          m.id === vinnyMsgId ? { ...m, isStreaming: false } : m
        )
      );
      setHighlightedIds(highlightIds);
    } catch {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: vinnyMsgId,
          role: 'vinny',
          content: "Something went wrong — try asking me again.",
          timestamp,
        },
      ]);
    }
  }, [contacts]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <VinnyBackground />
      <TopNav />
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar
          activeSources={activeSources}
          onToggleSource={handleToggleSource}
          messages={messages}
          onSendMessage={handleSendMessage}
          isTyping={isTyping}
          isOutlookConnected={isOutlookConnected}
          isSyncingOutlook={isSyncingOutlook}
          onOutlookConnect={handleOutlookConnect}
          outlookError={outlookError}
          isGmailConnected={isGmailConnected}
          isSyncingGmail={isSyncingGmail}
          onGmailConnect={handleGmailConnect}
          gmailError={gmailError}
        />
        <NetworkGraph
          contacts={contacts}
          activeSources={activeSources}
          highlightedIds={highlightedIds}
          selectedContactId={selectedContact?.id ?? null}
          onSelectContact={handleSelectContact}
        />
      </div>
    </div>
  );
};

export default Index;
