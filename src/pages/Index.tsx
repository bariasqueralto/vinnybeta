import { useState, useCallback } from 'react';
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

const Index = () => {
  const [activeSources, setActiveSources] = useState<Record<DataSource, boolean>>({
    outlook: true,
  });

  const [messages, setMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const handleToggleSource = useCallback((source: DataSource) => {
    setActiveSources((prev) => ({ ...prev, [source]: !prev[source] }));
  }, []);

  const handleSelectContact = useCallback((contact: Contact) => {
    setSelectedContact(contact);
  }, []);

  const handleSendMessage = useCallback((text: string) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp,
    };

    setMessages((prev) => [...prev, userMsg]);

    setTimeout(() => {
      const lower = text.toLowerCase();
      let matched: Contact[] = [];
      let responseText = '';

      // Match by industry keyword
      for (const [keyword, industry] of INDUSTRY_KEYWORDS) {
        if (lower.includes(keyword)) {
          matched = mockContacts.filter((c) => c.industry === industry);
          const names = matched.map((c) => `**${c.name}**`).join(', ');
          responseText = `Found **${matched.length} contact${matched.length !== 1 ? 's' : ''}** in ${industry} — highlighting them on your map now. You know ${names}.`;
          break;
        }
      }

      // Fall back to name or company match
      if (matched.length === 0) {
        matched = mockContacts.filter(
          (c) =>
            lower.includes(c.name.toLowerCase()) ||
            lower.includes(c.company.toLowerCase())
        );
        if (matched.length === 1) {
          const c = matched[0];
          responseText = `**${c.name}** is a ${c.title} at **${c.company}** (${c.industry}). ${c.howYouKnow}`;
        } else if (matched.length > 1) {
          const names = matched.map((c) => `**${c.name}**`).join(', ');
          responseText = `Found ${matched.length} contacts matching that — highlighting ${names} on your map.`;
        }
      }

      const vinnyMsg: ChatMessage = {
        id: `v-${Date.now()}`,
        role: 'vinny',
        content:
          matched.length > 0
            ? responseText
            : "I searched your network but couldn't find a match. Try asking about **banking**, **tech**, or **real estate** contacts!",
        timestamp,
      };

      setMessages((prev) => [...prev, vinnyMsg]);
      setHighlightedIds(matched.map((c) => c.id));
    }, 600);
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
