import { Contact, STROKE_COLORS } from '@/data/mockData';
import { MapPin, Building, Users, Clock, Link2, Mail, Phone, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface FloatingContactCardProps {
  contact: Contact;
  position: { x: number; y: number };
  onClose: () => void;
}

const FloatingContactCard = ({ contact, position, onClose }: FloatingContactCardProps) => {
  const nodeColor = STROKE_COLORS[contact.source];
  const initials = contact.name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <div className="absolute inset-0 z-50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="absolute glass-panel-solid p-5 w-[300px] rounded-2xl shadow-2xl border border-border/50"
        style={{
          left: position.x,
          top: position.y,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute top-3 right-3 w-6 h-6 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center transition-colors">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        {/* Avatar & Name */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border-2"
            style={{ borderColor: nodeColor, color: nodeColor, backgroundColor: `${nodeColor}15` }}
          >
            {initials}
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{contact.name}</h3>
            <p className="text-sm text-muted-foreground">{contact.title}</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2.5 mb-4">
          <div className="flex items-center gap-2.5 text-sm">
            <Building className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground">{contact.company}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground">{contact.location}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Last:</span>
            <span className="text-foreground">{contact.lastInteraction}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground">{contact.sharedConnections} shared connections</span>
          </div>
        </div>

        {/* How you know */}
        <div className="glass-panel p-3 mb-4 rounded-lg">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-1">How you know</div>
          <p className="text-sm text-foreground">{contact.howYouKnow}</p>
        </div>

        {/* Relationship strength */}
        <div className="mb-4">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2">Relationship Strength</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${contact.relationshipStrength * 10}%`, backgroundColor: nodeColor }}
              />
            </div>
            <span className="text-xs font-medium text-foreground">{contact.relationshipStrength}/10</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button className="flex-1 h-8 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary text-xs font-medium flex items-center justify-center gap-1.5 transition-colors">
            <Mail className="w-3.5 h-3.5" /> Email
          </button>
          <button className="flex-1 h-8 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground text-xs font-medium flex items-center justify-center gap-1.5 transition-colors">
            <Phone className="w-3.5 h-3.5" /> Call
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default FloatingContactCard;
