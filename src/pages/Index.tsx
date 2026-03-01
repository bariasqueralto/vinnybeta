import { useState, useCallback, useRef } from 'react';
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

// ─── Fallback mock response (local contact intelligence) ─────────────────────
const INDUSTRY_KEYWORDS: Array<[string, string]> = [
  ['real estate', 'Real Estate'],
  ['property', 'Real Estate'],
  ['realty', 'Real Estate'],
  ['banking', 'Banking'],
  ['finance', 'Banking'],
  ['bank', 'Banking'],
  ['tech', 'Tech'],
  ['technology', 'Tech'],
  ['software', 'Tech'],
];

function generateMockResponse(text: string): { content: string; ids: string[] } {
  const lower = text.toLowerCase();
  let matched: Contact[] = [];

  // 1) Explicit "all contacts" style queries
  if (
    lower.includes('all my contacts') ||
    lower.includes('all contacts') ||
    lower.includes('everyone i know') ||
    lower.includes('entire network') ||
    lower.includes('my whole network')
  ) {
    matched = mockContacts;
    const names = matched.map((c) => c.name).join(', ');
    return {
      content: `You have ${matched.length} contacts in your network — ${names}. I've highlighted them all on your map.`,
      ids: matched.map((c) => c.id),
    };
  }

  // 2) Industry keywords (banking / tech / real estate)
  for (const [keyword, industry] of INDUSTRY_KEYWORDS) {
    if (lower.includes(keyword)) {
      matched = mockContacts.filter((c) => c.industry === industry);
      const names = matched.map((c) => c.name).join(', ');
      return {
        content: `You have ${matched.length} ${industry} contact${matched.length !== 1 ? 's' : ''} — ${names}. I've highlighted them on your map.`,
        ids: matched.map((c) => c.id),
      };
    }
  }

  // 3) Smart name/company matching (handles "who is Olivia?", "Stripe", etc.)
  matched = mockContacts.filter((c) => {
    const nameLower = c.name.toLowerCase(); // e.g. "olivia huang"
    const companyLower = c.company.toLowerCase(); // e.g. "blackstone"
    const nameTokens = nameLower.split(/\s+/); // ["olivia", "huang"]

    return (
      lower.includes(companyLower) ||
      lower.includes(nameLower) ||
      nameTokens.some((token) => token.length > 2 && lower.includes(token))
    );
  });

  if (matched.length === 1) {
    const c = matched[0];
    return {
      content: `${c.name} is a ${c.title} at ${c.company}. ${c.howYouKnow}`,
      ids: [c.id],
    };
  } else if (matched.length > 1) {
    const names = matched.map((c) => c.name).join(', ');
    return {
      content: `Found ${matched.length} contacts matching that — ${names}.`,
      ids: matched.map((c) => c.id),
    };
  }

  // 4) Generic "contacts" queries — show everyone instead of an error
  if (lower.includes('contact')) {
    matched = mockContacts;
    const names = matched.map((c) => c.name).join(', ');
    return {
      content: `Here are all your contacts: ${names}. I've highlighted them all on your map.`,
      ids: matched.map((c) => c.id),
    };
  }

  // 5) Final fallback — friendly message (no hard error)
  const allNames = mockContacts.map((c) => c.name).join(', ');
  return {
    content: `I couldn't find an exact match for that, but here are all your contacts: ${allNames}. I've highlighted them all on your map.`,
    ids: mockContacts.map((c) => c.id),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
const Index = () => {
  const [activeSources, setActiveSources] = useState<Record<DataSource, boolean>>({
    outlook: true,
  });

  const [messages, setMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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
        mockContacts,
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
    } catch (err: unknown) {
      setIsTyping(false);

      const errMsg = err instanceof Error ? err.message : String(err);
      const isNoKey = errMsg === 'NO_API_KEY';
      const isRateLimit = errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('rate');

      if (isNoKey) {
        setMessages((prev) => [
          ...prev,
          {
            id: vinnyMsgId,
            role: 'vinny',
            content:
              'To unlock real AI answers, add your Gemini API key to `.env.local` as `VITE_GEMINI_API_KEY=your-key-here`, then restart the dev server.',
            timestamp,
          },
        ]);
      } else if (isRateLimit) {
        setMessages((prev) => [
          ...prev,
          {
            id: vinnyMsgId,
            role: 'vinny',
            content: "I'm getting a lot of messages — give me a moment and try again.",
            timestamp,
          },
        ]);
      } else {
        // Other network/API error — fall back to keyword mock
        const { content, ids } = generateMockResponse(text);
        setMessages((prev) => [
          ...prev,
          { id: vinnyMsgId, role: 'vinny', content, timestamp },
        ]);
        setHighlightedIds(ids);
      }
    }
  }, []);

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
        />
        <NetworkGraph
          contacts={mockContacts}
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
