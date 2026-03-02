import { Waypoints, Loader2 } from 'lucide-react';
import { DataSource, ChatMessage } from '@/data/mockData';
import ChatInterface from './ChatInterface';

interface LeftSidebarProps {
  activeSources: Record<DataSource, boolean>;
  onToggleSource: (source: DataSource) => void;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isTyping?: boolean;
  isOutlookConnected: boolean;
  isSyncing: boolean;
  onOutlookConnect: () => void;
}

const LeftSidebar = ({ activeSources, onToggleSource, messages, onSendMessage, isTyping, isOutlookConnected, isSyncing, onOutlookConnect }: LeftSidebarProps) => {
  return (
    <aside className="w-[300px] min-w-[300px] h-full border-r border-border/50 bg-card/40 backdrop-blur-xl flex flex-col">
      {/* Logo */}
      <div className="p-5 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
          <Waypoints className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight text-foreground">VINNY</div>
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Network AI</div>
        </div>
      </div>

      {/* Outlook Connection */}
      <div className="px-4 mb-3">
        <button
          onClick={onOutlookConnect}
          disabled={isSyncing}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors disabled:opacity-50"
        >
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isOutlookConnected ? 'bg-node-outlook' : 'bg-muted-foreground/30'} transition-opacity`} />
            <span className={`text-sm ${isOutlookConnected ? 'text-foreground' : 'text-muted-foreground'} transition-colors`}>
              {isSyncing ? 'Syncing...' : isOutlookConnected ? 'Outlook Connected' : 'Connect Outlook'}
            </span>
          </div>
          {isSyncing ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <div className={`w-8 h-[18px] rounded-full transition-colors relative ${isOutlookConnected ? 'bg-primary/30' : 'bg-secondary'}`}>
              <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full transition-all ${isOutlookConnected ? 'left-[15px] bg-primary' : 'left-[2px] bg-muted-foreground/50'}`} />
            </div>
          )}
        </button>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col overflow-hidden border-t border-border/50">
        <ChatInterface messages={messages} onSendMessage={onSendMessage} isTyping={isTyping} />
      </div>
    </aside>
  );
};

export default LeftSidebar;
