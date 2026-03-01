import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Contact, DataSource, STROKE_COLORS } from '@/data/mockData';
import FloatingContactCard from './FloatingContactCard';

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

const DEFAULT_ZOOM = 1;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 4;
const SVG_W = 1000;
const SVG_H = 800;
const SVG_CX = 500;
const SVG_CY = 400;

const NetworkGraph = ({ contacts, activeSources, highlightedIds, selectedContactId, onSelectContact }: NetworkGraphProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [floatingContact, setFloatingContact] = useState<{ contact: Contact; position: { x: number; y: number } } | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Non-passive wheel listener so we can preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1 / 0.92;
      setZoom(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev * factor)));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const viewBox = useMemo(() => {
    const vbW = SVG_W / zoom;
    const vbH = SVG_H / zoom;
    const vbX = SVG_CX - vbW / 2;
    const vbY = SVG_CY - vbH / 2;
    return `${vbX} ${vbY} ${vbW} ${vbH}`;
  }, [zoom]);

  const filteredContacts = useMemo(
    () => contacts.filter((c) => activeSources[c.source]),
    [contacts, activeSources]
  );

  const nodePositions = useMemo((): NodePosition[] => {
    const cx = 500;
    const cy = 400;
    const MIN_NODE_DIST = 68; // 28 + 28 + 12px gap
    const MIN_CENTER_DIST = 76; // 36 (center node) + 28 + 12px gap

    const positions = filteredContacts.map((contact, i) => {
      const strength = contact.relationshipStrength;
      const radius = 220 - strength * 18;
      const angle = (i / filteredContacts.length) * Math.PI * 2 - Math.PI / 2;
      const jitter = ((i * 7) % 5) * 6 - 15;
      return {
        x: cx + Math.cos(angle) * (radius + jitter),
        y: cy + Math.sin(angle) * (radius + jitter),
        contact,
      };
    });

    // Iterative collision resolution
    for (let iter = 0; iter < 60; iter++) {
      for (let i = 0; i < positions.length; i++) {
        // Push away from center node
        const dcx = positions[i].x - cx;
        const dcy = positions[i].y - cy;
        const dc = Math.sqrt(dcx * dcx + dcy * dcy);
        if (dc < MIN_CENTER_DIST && dc > 0) {
          const push = MIN_CENTER_DIST - dc;
          positions[i].x += (dcx / dc) * push;
          positions[i].y += (dcy / dc) * push;
        }

        // Push away from other nodes
        for (let j = i + 1; j < positions.length; j++) {
          const dx = positions[j].x - positions[i].x;
          const dy = positions[j].y - positions[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MIN_NODE_DIST && dist > 0) {
            const overlap = (MIN_NODE_DIST - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;
            positions[i].x -= nx * overlap;
            positions[i].y -= ny * overlap;
            positions[j].x += nx * overlap;
            positions[j].y += ny * overlap;
          }
        }
      }
    }

    return positions;
  }, [filteredContacts]);

  const getInitials = useCallback((name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  }, []);

  const isHighlighted = (id: string) => highlightedIds.length === 0 || highlightedIds.includes(id);

  const handleNodeClick = (contact: Contact, event: React.MouseEvent) => {
    const rect = (event.currentTarget as Element).closest('svg')?.getBoundingClientRect();
    if (!rect) return;
    const svgX = event.clientX - rect.left;
    const svgY = event.clientY - rect.top;
    setFloatingContact({ contact, position: { x: event.clientX + 20, y: event.clientY - 100 } });
    onSelectContact(contact);
  };

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden bg-background">
      {/* Ambient glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[100px]" />
        <div className="absolute top-1/4 right-1/4 w-[200px] h-[200px] rounded-full bg-node-outlook/[0.06] blur-[80px]" />
        <div className="absolute bottom-1/3 left-1/3 w-[250px] h-[250px] rounded-full bg-node-outlook/[0.04] blur-[80px]" />
      </div>

      <svg ref={svgRef} className="w-full h-full" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
        {/* Grid pattern */}
        <defs>
          <pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="0.5" fill="hsl(222, 20%, 20%)" opacity="0.5" />
          </pattern>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(142, 60%, 50%)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="hsl(142, 60%, 50%)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1000" height="800" fill="url(#grid)" />
        <circle cx="500" cy="400" r="250" fill="url(#centerGlow)" />

        {/* Connection lines */}
        {nodePositions.map(({ x, y, contact }) => (
          <line
            key={`line-${contact.id}`}
            x1={500} y1={400} x2={x} y2={y}
            stroke={STROKE_COLORS[contact.source]}
            strokeOpacity={isHighlighted(contact.id) ? 0.15 : 0.04}
            strokeWidth={1}
            strokeDasharray={contact.relationshipStrength > 7 ? 'none' : '4 4'}
          />
        ))}

        {/* Orbit rings */}
        {[80, 140, 200].map((r) => (
          <circle key={r} cx={500} cy={400} r={r} fill="none" stroke="hsl(222, 20%, 16%)" strokeWidth={0.5} strokeDasharray="2 6" />
        ))}

        {/* Center node (user) */}
        <g>
          <circle cx={500} cy={400} r={36} fill="hsl(222, 41%, 14%)" stroke="hsl(142, 60%, 50%)" strokeWidth={2} />
          <circle cx={500} cy={400} r={40} fill="none" stroke="hsl(142, 60%, 50%)" strokeWidth={0.5} strokeOpacity={0.3} />
          <text x={500} y={405} textAnchor="middle" fill="hsl(142, 60%, 50%)" fontSize="16" fontWeight="700" fontFamily="Inter">AJ</text>
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
                onClick={(e) => handleNodeClick(contact, e as unknown as React.MouseEvent)}
              >
                {/* Glow */}
                {(highlighted && highlightedIds.length > 0) && (
                  <motion.circle
                    cx={x} cy={y} r={34}
                    fill="none"
                    stroke={nodeColor}
                    strokeWidth={2}
                    strokeOpacity={0.4}
                    animate={{ r: [34, 42, 34], strokeOpacity: [0.4, 0.1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}

                {/* Node bg */}
                <circle
                  cx={x} cy={y} r={28}
                  fill="hsl(222, 41%, 11%)"
                  stroke={selected ? nodeColor : (hovered ? nodeColor : 'hsl(222, 20%, 22%)')}
                  strokeWidth={selected ? 2.5 : (hovered ? 2 : 1)}
                />

                {/* Initials */}
                <text
                  x={x} y={y + 1}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={nodeColor}
                  fontSize="12"
                  fontWeight="600"
                  fontFamily="Inter"
                >
                  {getInitials(contact.name)}
                </text>

                {/* Name label */}
                <text
                  x={x} y={y + 44}
                  textAnchor="middle"
                  fill="hsl(214, 32%, 75%)"
                  fontSize="11"
                  fontWeight="500"
                  fontFamily="Inter"
                  opacity={hovered || selected ? 1 : 0.7}
                >
                  {contact.name.split(' ')[0]}
                </text>

                {/* Hover tooltip */}
                {hovered && !floatingContact && (
                  <foreignObject x={x - 100} y={y - 90} width={200} height={65}>
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

      {/* Floating contact card */}
      <AnimatePresence>
        {floatingContact && (
          <FloatingContactCard
            contact={floatingContact.contact}
            position={floatingContact.position}
            onClose={() => setFloatingContact(null)}
          />
        )}
      </AnimatePresence>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 pointer-events-auto">
        <button
          onClick={() => setZoom(prev => Math.min(MAX_ZOOM, prev * (1 / 0.92)))}
          className="w-8 h-8 rounded-md bg-[hsl(222,41%,14%)] border border-[hsl(222,20%,22%)] text-[hsl(214,32%,75%)] hover:text-white hover:border-[hsl(222,20%,35%)] flex items-center justify-center text-lg leading-none transition-colors"
          title="Zoom in"
        >+</button>
        <button
          onClick={() => setZoom(DEFAULT_ZOOM)}
          className="w-8 h-8 rounded-md bg-[hsl(222,41%,14%)] border border-[hsl(222,20%,22%)] text-[hsl(214,32%,75%)] hover:text-white hover:border-[hsl(222,20%,35%)] flex items-center justify-center text-[10px] font-medium transition-colors"
          title="Reset zoom"
        >{Math.round(zoom * 100)}%</button>
        <button
          onClick={() => setZoom(prev => Math.max(MIN_ZOOM, prev * 0.92))}
          className="w-8 h-8 rounded-md bg-[hsl(222,41%,14%)] border border-[hsl(222,20%,22%)] text-[hsl(214,32%,75%)] hover:text-white hover:border-[hsl(222,20%,35%)] flex items-center justify-center text-lg leading-none transition-colors"
          title="Zoom out"
        >−</button>
      </div>
    </div>
  );
};

export default NetworkGraph;
