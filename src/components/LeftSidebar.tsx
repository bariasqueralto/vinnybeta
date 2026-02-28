import { useState } from 'react';
import { Waypoints, ChevronDown } from 'lucide-react';
import { DataSource, SOURCE_LABELS } from '@/data/mockData';

const SOURCE_DOT_COLORS: Record<DataSource, string> = {
  linkedin: 'bg-node-linkedin',
  outlook: 'bg-node-outlook',
  calendar: 'bg-node-calendar',
  phone: 'bg-node-phone',
  teams: 'bg-node-teams',
  university: 'bg-node-university',
};

const SOURCES: DataSource[] = ['linkedin', 'outlook', 'phone', 'calendar', 'teams', 'university'];

const FILTERS = ['Industry', 'Company', 'Location', 'Relationship Strength', 'Last Interaction'];

interface LeftSidebarProps {
  activeSources: Record<DataSource, boolean>;
  onToggleSource: (source: DataSource) => void;
}

const LeftSidebar = ({ activeSources, onToggleSource }: LeftSidebarProps) => {
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null);

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

      {/* Data Sources */}
      <div className="px-4 mb-4">
        <div className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-3">Data Sources</div>
        <div className="space-y-1">
          {SOURCES.map((source) => (
            <button
              key={source}
              onClick={() => onToggleSource(source)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${SOURCE_DOT_COLORS[source]} ${activeSources[source] ? 'opacity-100' : 'opacity-30'} transition-opacity`} />
                <span className={`text-sm ${activeSources[source] ? 'text-foreground' : 'text-muted-foreground'} transition-colors`}>
                  {SOURCE_LABELS[source]}
                </span>
              </div>
              {/* Toggle pill */}
              <div className={`w-8 h-[18px] rounded-full transition-colors relative ${activeSources[source] ? 'bg-primary/30' : 'bg-secondary'}`}>
                <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full transition-all ${activeSources[source] ? 'left-[15px] bg-primary' : 'left-[2px] bg-muted-foreground/50'}`} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 flex-1">
        <div className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-3">Filters</div>
        <div className="space-y-0.5">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setExpandedFilter(expandedFilter === filter ? null : filter)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors text-sm text-muted-foreground hover:text-foreground"
            >
              {filter}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedFilter === filter ? 'rotate-180' : ''}`} />
            </button>
          ))}
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/30 border-2 border-primary/40 flex items-center justify-center text-xs font-semibold text-primary">
            AJ
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">Alex Johnson</div>
            <div className="text-[11px] text-muted-foreground">17 sources connected</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default LeftSidebar;
