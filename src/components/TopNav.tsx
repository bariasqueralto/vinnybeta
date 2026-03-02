import { Search, Bell, Waypoints } from 'lucide-react';

const TopNav = () => {
  return (
    <header className="h-14 flex items-center justify-between px-5 border-b border-border/50 bg-card/40 backdrop-blur-xl z-50">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Waypoints className="w-4.5 h-4.5 text-primary" />
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground">VINNY</span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search your network..."
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-secondary/60 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <button className="relative w-9 h-9 rounded-lg bg-secondary/60 flex items-center justify-center hover:bg-secondary transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
        </button>
        <div className="w-8 h-8 rounded-full bg-primary/30 border-2 border-primary/50 flex items-center justify-center text-xs font-semibold text-primary">
          BA
        </div>
      </div>
    </header>
  );
};

export default TopNav;
