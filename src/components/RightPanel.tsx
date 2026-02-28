import { Contact, ChatMessage } from '@/data/mockData';
import ChatInterface from './ChatInterface';
import ContactCard from './ContactCard';

interface RightPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  selectedContact: Contact | null;
}

const RightPanel = ({ messages, onSendMessage, selectedContact }: RightPanelProps) => {
  return (
    <aside className="w-[360px] min-w-[360px] h-full border-l border-border/50 bg-card/40 backdrop-blur-xl flex flex-col">
      {/* Chat — top half */}
      <div className="h-1/2 border-b border-border/50 flex flex-col">
        <ChatInterface messages={messages} onSendMessage={onSendMessage} />
      </div>

      {/* Contact Detail — bottom half */}
      <div className="h-1/2 flex flex-col">
        <div className="px-4 py-3 border-b border-border/50">
          <span className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">Contact Details</span>
        </div>
        <ContactCard contact={selectedContact} />
      </div>
    </aside>
  );
};

export default RightPanel;
