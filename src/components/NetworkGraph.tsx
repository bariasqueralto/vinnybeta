import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Contact, DataSource, STROKE_COLORS } from '@/data/mockData';

interface NetworkGraphProps {
  contacts: Contact[];
  activeSources: Record<DataSource, boolean>;
  highlightedIds: string[];
  selectedContactId: string | null;
  onSelectContact: (contact: Contact) => void;
}

interface NodePosition {
  x: number;
  y: number;
  contact: Contact;
}

const NetworkGraph = ({ contacts, activeSources, highlightedIds, selectedContactId, onSelectContact }: NetworkGraphProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filteredContacts = useMemo(
    () => contacts.filter((c) => activeSources[c.source]),
    [contacts, activeSources]
  );

  const nodePositions = useMemo((): NodePosition[] => {
    const cx = 500;
    const cy = 350;
    return filteredContacts.map((contact, i) => {
      const strength = contact.relationshipStrength;
      const radius = 280 - strength * 22;
      const angle = (i / filteredContacts.length) * Math.PI * 2 - Math.PI / 2;
      // Add slight variation
      const jitter = ((i * 7) % 5) * 8 - 20;
      return {
        x: cx + Math.cos(angle) * (radius + jitter),
        y: cy + Math.sin(angle) * (radius + jitter),
        contact,
      };
    });
  }, [filteredContacts]);

  const getInitials = useCallback((name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  }, []);

  const isHighlighted = (id: string) => highlightedIds.length === 0 || highlightedIds.includes(id);

  return (
    <div className="flex-1 relative overflow-hidden bg-background">
      {/* Ambient glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[100px]" />
        <div className="absolute top-1/4 right-1/4 w-[200px] h-[200px] rounded-full bg-node-calendar/[0.04] blur-[80px]" />
        <div className="absolute bottom-1/3 left-1/3 w-[250px] h-[250px] rounded-full bg-node-outlook/[0.04] blur-[80px]" />
      </div>

      <svg className="w-full h-full" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet">
        {/* Grid pattern */}
        <defs>
          <pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="0.5" fill="hsl(222, 20%, 20%)" opacity="0.5" />
          </pattern>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(210, 100%, 60%)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="hsl(210, 100%, 60%)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1000" height="700" fill="url(#grid)" />
        <circle cx="500" cy="350" r="250" fill="url(#centerGlow)" />

        {/* Connection lines */}
        {nodePositions.map(({ x, y, contact }) => (
          <line
            key={`line-${contact.id}`}
            x1={500} y1={350} x2={x} y2={y}
            stroke={STROKE_COLORS[contact.source]}
            strokeOpacity={isHighlighted(contact.id) ? 0.15 : 0.04}
            strokeWidth={1}
            strokeDasharray={contact.relationshipStrength > 7 ? 'none' : '4 4'}
          />
        ))}

        {/* Orbit rings */}
        {[100, 180, 250].map((r) => (
          <circle key={r} cx={500} cy={350} r={r} fill="none" stroke="hsl(222, 20%, 16%)" strokeWidth={0.5} strokeDasharray="2 6" />
        ))}

        {/* Center node (user) */}
        <g>
          <circle cx={500} cy={350} r={32} fill="hsl(222, 41%, 14%)" stroke="hsl(210, 100%, 56%)" strokeWidth={2} />
          <circle cx={500} cy={350} r={36} fill="none" stroke="hsl(210, 100%, 56%)" strokeWidth={0.5} strokeOpacity={0.3} />
          <text x={500} y={355} textAnchor="middle" fill="hsl(210, 100%, 60%)" fontSize="14" fontWeight="700" fontFamily="Inter">AJ</text>
        </g>

        {/* Contact nodes */}
        <AnimatePresence>
          {nodePositions.map(({ x, y, contact }) => {
            const highlighted = isHighlighted(contact.id);
            const hovered = hoveredId === contact.id;
            const selected = selectedContactId === contact.id;
            const nodeColor = STROKE_COLORS[contact.source];

            return (
              <motion.g
                key={contact.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: highlighted ? 1 : 0.25,
                  scale: 1,
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.5, delay: Math.random() * 0.3 }}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredId(contact.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelectContact(contact)}
              >
                {/* Glow */}
                {(highlighted && highlightedIds.length > 0) && (
                  <motion.circle
                    cx={x} cy={y} r={28}
                    fill="none"
                    stroke={nodeColor}
                    strokeWidth={2}
                    strokeOpacity={0.4}
                    animate={{ r: [28, 34, 28], strokeOpacity: [0.4, 0.1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}

                {/* Node bg */}
                <circle
                  cx={x} cy={y} r={22}
                  fill="hsl(222, 41%, 11%)"
                  stroke={selected ? nodeColor : (hovered ? nodeColor : 'hsl(222, 20%, 22%)')}
                  strokeWidth={selected ? 2.5 : (hovered ? 2 : 1)}
                />

                {/* Initials */}
                <text
                  x={x} y={y + 1}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={nodeColor}
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="Inter"
                >
                  {getInitials(contact.name)}
                </text>

                {/* Name label */}
                <text
                  x={x} y={y + 36}
                  textAnchor="middle"
                  fill="hsl(214, 32%, 75%)"
                  fontSize="9"
                  fontWeight="500"
                  fontFamily="Inter"
                  opacity={hovered || selected ? 1 : 0.7}
                >
                  {contact.name.split(' ')[0]}
                </text>

                {/* Hover tooltip */}
                {hovered && (
                  <foreignObject x={x - 90} y={y - 85} width={180} height={60}>
                    <div className="glass-panel px-3 py-2 text-center">
                      <div className="text-[11px] font-medium text-foreground">{contact.name}</div>
                      <div className="text-[10px] text-muted-foreground">{contact.title}, {contact.company}</div>
                      <div className="text-[9px] text-primary mt-0.5">{contact.lastInteraction}</div>
                    </div>
                  </foreignObject>
                )}
              </motion.g>
            );
          })}
        </AnimatePresence>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 glass-panel px-4 py-3 flex items-center gap-4">
        {Object.entries(STROKE_COLORS).map(([source, color]) => (
          <div key={source} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-muted-foreground capitalize">{source}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NetworkGraph;
