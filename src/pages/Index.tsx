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

// ─── Fallback mock response (no API key) ─────────────────────────────────────
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

  matched = mockContacts.filter(
    (c) =>
      lower.includes(c.name.toLowerCase()) ||
      lower.includes(c.company.toLowerCase())
  );

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

  return {
    content: "I couldn't find a match in your network. Try asking about banking, tech, or real estate contacts.",
    ids: [],
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
