import { useState, useCallback, useRef, useEffect } from 'react';
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
import { initializeMsal, msalInstance, isOutlookConfigured } from '@/services/msalConfig';
import {
  loginWithOutlook,
  logoutFromOutlook,
  getActiveAccount,
  fetchEmails,
  processEmailsToContacts,
} from '@/services/outlookService';

// ─── Component ────────────────────────────────────────────────────────────────
const Index = () => {
  const [activeSources, setActiveSources] = useState<Record<DataSource, boolean>>({
    outlook: true,
  });

  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [messages, setMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isOutlookConnected, setIsOutlookConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [msalReady, setMsalReady] = useState(false);
  const [outlookError, setOutlookError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Sync emails and update contacts
  const syncOutlookContacts = useCallback(async () => {
    setIsSyncing(true);
    try {
      const account = getActiveAccount();
      if (!account) throw new Error('No active account');

      const messages = await fetchEmails(200);
      const outlookContacts = processEmailsToContacts(messages, account.username);

      if (outlookContacts.length > 0) {
        setContacts(outlookContacts);
      }
    } catch (err) {
      console.error('Outlook sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Initialize MSAL on mount and restore previous session (only when configured)
  useEffect(() => {
    if (!isOutlookConfigured) {
      setMsalReady(true);
      return;
    }
    initializeMsal().then(() => {
      setMsalReady(true);
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0]);
        setIsOutlookConnected(true);
        syncOutlookContacts();
      }
    });
  }, [syncOutlookContacts]);

  const handleOutlookConnect = useCallback(async () => {
    if (!msalReady) return;

    if (isOutlookConnected) {
      await logoutFromOutlook();
      setIsOutlookConnected(false);
      setContacts(mockContacts);
      return;
    }

    setOutlookError(null);
    try {
      await loginWithOutlook();
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0]);
      }
      setIsOutlookConnected(true);
      await syncOutlookContacts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'OUTLOOK_NOT_CONFIGURED') {
        setOutlookError('Add VITE_AZURE_CLIENT_ID to .env.local — see README for setup.');
      } else {
        console.error('Outlook login failed:', err);
        setOutlookError('Login failed. Try again or check the console.');
      }
    }
  }, [msalReady, isOutlookConnected, syncOutlookContacts]);

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
      <TopNav />
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar
          activeSources={activeSources}
          onToggleSource={handleToggleSource}
          messages={messages}
          onSendMessage={handleSendMessage}
          isTyping={isTyping}
          isOutlookConnected={isOutlookConnected}
          isSyncing={isSyncing}
          onOutlookConnect={handleOutlookConnect}
          outlookError={outlookError}
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
