import { useState, useCallback } from 'react';
import TopNav from '@/components/TopNav';
import LeftSidebar from '@/components/LeftSidebar';
import NetworkGraph from '@/components/NetworkGraph';
import RightPanel from '@/components/RightPanel';
import {
  DataSource,
  Contact,
  ChatMessage,
  mockContacts,
  initialChatMessages,
  vinnyResponses,
} from '@/data/mockData';

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

    // Simple keyword matching for demo
    setTimeout(() => {
      const lower = text.toLowerCase();
      let matched = false;

      for (const [keyword, data] of Object.entries(vinnyResponses)) {
        if (lower.includes(keyword)) {
          const vinnyMsg: ChatMessage = {
            id: `v-${Date.now()}`,
            role: 'vinny',
            content: data.response,
            timestamp,
          };
          setMessages((prev) => [...prev, vinnyMsg]);
          setHighlightedIds(data.highlightIds);
          matched = true;
          break;
        }
      }

      if (!matched) {
        const vinnyMsg: ChatMessage = {
          id: `v-${Date.now()}`,
          role: 'vinny',
          content: "I searched your network but couldn't find a strong match. Try asking about **banking**, **fintech**, or **construction** contacts!",
          timestamp,
        };
        setMessages((prev) => [...prev, vinnyMsg]);
        setHighlightedIds([]);
      }
    }, 600);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <TopNav />
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar activeSources={activeSources} onToggleSource={handleToggleSource} />
        <NetworkGraph
          contacts={mockContacts}
          activeSources={activeSources}
          highlightedIds={highlightedIds}
          selectedContactId={selectedContact?.id ?? null}
          onSelectContact={handleSelectContact}
        />
        <RightPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          selectedContact={selectedContact}
        />
      </div>
    </div>
  );
};

export default Index;
