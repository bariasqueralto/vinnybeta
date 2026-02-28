import { Waypoints } from 'lucide-react';
import { DataSource } from '@/data/mockData';

interface LeftSidebarProps {
  activeSources: Record<DataSource, boolean>;
  onToggleSource: (source: DataSource) => void;
}

const LeftSidebar = ({ activeSources, onToggleSource }: LeftSidebarProps) => {
  return (
    <aside className="w-[240px] min-w-[240px] h-full border-r border-border/50 bg-card/40 backdrop-blur-xl flex flex-col">
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

      {/* Outlook Sync */}
      <div className="px-4 mb-4">
        <div className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-3">Data Source</div>
        <button
          onClick={() => onToggleSource('outlook')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full bg-node-outlook ${activeSources.outlook ? 'opacity-100' : 'opacity-30'} transition-opacity`} />
            <span className={`text-sm ${activeSources.outlook ? 'text-foreground' : 'text-muted-foreground'} transition-colors`}>
              Outlook Sync
            </span>
          </div>
          <div className={`w-8 h-[18px] rounded-full transition-colors relative ${activeSources.outlook ? 'bg-primary/30' : 'bg-secondary'}`}>
            <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full transition-all ${activeSources.outlook ? 'left-[15px] bg-primary' : 'left-[2px] bg-muted-foreground/50'}`} />
          </div>
        </button>
      </div>

      <div className="flex-1" />

      {/* User Profile */}
      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/30 border-2 border-primary/40 flex items-center justify-center text-xs font-semibold text-primary">
            AJ
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">Alex Johnson</div>
            <div className="text-[11px] text-muted-foreground">1 source connected</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default LeftSidebar;
