export type DataSource = 'linkedin' | 'outlook' | 'calendar' | 'phone' | 'teams' | 'university';

export interface Contact {
  id: string;
  name: string;
  title: string;
  company: string;
  avatar: string;
  source: DataSource;
  industry: string;
  location: string;
  relationshipStrength: number; // 1-10
  lastInteraction: string;
  howYouKnow: string;
  sharedConnections: number;
  email?: string;
  phone?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'vinny';
  content: string;
  timestamp: string;
}

export const SOURCE_COLORS: Record<DataSource, string> = {
  linkedin: 'bg-node-linkedin',
  outlook: 'bg-node-outlook',
  calendar: 'bg-node-calendar',
  phone: 'bg-node-phone',
  teams: 'bg-node-teams',
  university: 'bg-node-university',
};

export const SOURCE_LABELS: Record<DataSource, string> = {
  linkedin: 'LinkedIn',
  outlook: 'Outlook',
  calendar: 'Calendar',
  phone: 'Contacts',
  teams: 'Teams',
  university: 'University',
};

export const STROKE_COLORS: Record<DataSource, string> = {
  linkedin: 'hsl(210, 100%, 56%)',
  outlook: 'hsl(142, 60%, 50%)',
  calendar: 'hsl(270, 60%, 60%)',
  phone: 'hsl(28, 100%, 60%)',
  teams: 'hsl(262, 60%, 55%)',
  university: 'hsl(45, 100%, 55%)',
};

export const mockContacts: Contact[] = [
  { id: '1', name: 'Sarah Chen', title: 'VP of Engineering', company: 'Goldman Sachs', avatar: '', source: 'linkedin', industry: 'Banking', location: 'New York', relationshipStrength: 9, lastInteraction: '2 days ago', howYouKnow: 'Met at FinTech Summit 2024', sharedConnections: 14 },
  { id: '2', name: 'Marcus Williams', title: 'Managing Director', company: 'JP Morgan', avatar: '', source: 'linkedin', industry: 'Banking', location: 'New York', relationshipStrength: 7, lastInteraction: '1 week ago', howYouKnow: 'College roommate', sharedConnections: 23 },
  { id: '3', name: 'Julio Cesare', title: 'CEO', company: 'JCC Construction', avatar: '', source: 'phone', industry: 'Construction', location: 'Las Vegas', relationshipStrength: 4, lastInteraction: '3 weeks ago', howYouKnow: 'Saved from conference card', sharedConnections: 2 },
  { id: '4', name: 'Priya Sharma', title: 'Product Manager', company: 'Stripe', avatar: '', source: 'outlook', industry: 'FinTech', location: 'San Francisco', relationshipStrength: 8, lastInteraction: '3 days ago', howYouKnow: 'Worked together at previous startup', sharedConnections: 11 },
  { id: '5', name: 'David Park', title: 'Investment Analyst', company: 'Citadel', avatar: '', source: 'linkedin', industry: 'Banking', location: 'Chicago', relationshipStrength: 6, lastInteraction: '2 weeks ago', howYouKnow: 'LinkedIn connection via Sarah', sharedConnections: 8 },
  { id: '6', name: 'Emma Rodriguez', title: 'CTO', company: 'Plaid', avatar: '', source: 'calendar', industry: 'FinTech', location: 'San Francisco', relationshipStrength: 7, lastInteraction: 'Yesterday', howYouKnow: 'Monthly coffee catch-up', sharedConnections: 6 },
  { id: '7', name: 'James Liu', title: 'Partner', company: 'McKinsey', avatar: '', source: 'outlook', industry: 'Consulting', location: 'Boston', relationshipStrength: 5, lastInteraction: '1 month ago', howYouKnow: 'MBA classmate', sharedConnections: 19 },
  { id: '8', name: 'Olivia Taylor', title: 'Head of Design', company: 'Figma', avatar: '', source: 'teams', industry: 'Tech', location: 'San Francisco', relationshipStrength: 8, lastInteraction: '4 days ago', howYouKnow: 'Collaborated on design sprint', sharedConnections: 5 },
  { id: '9', name: 'Alex Petrov', title: 'Professor', company: 'MIT', avatar: '', source: 'university', industry: 'Academia', location: 'Cambridge', relationshipStrength: 6, lastInteraction: '2 months ago', howYouKnow: 'Graduate advisor', sharedConnections: 3 },
  { id: '10', name: 'Rachel Kim', title: 'Analyst', company: 'Morgan Stanley', avatar: '', source: 'linkedin', industry: 'Banking', location: 'New York', relationshipStrength: 5, lastInteraction: '3 weeks ago', howYouKnow: 'Met at networking event', sharedConnections: 7 },
  { id: '11', name: 'Tom Nakamura', title: 'Director of Sales', company: 'Salesforce', avatar: '', source: 'calendar', industry: 'Tech', location: 'Seattle', relationshipStrength: 6, lastInteraction: '1 week ago', howYouKnow: 'Quarterly business review', sharedConnections: 4 },
  { id: '12', name: 'Nina Patel', title: 'Founder', company: 'NovaPay', avatar: '', source: 'phone', industry: 'FinTech', location: 'Austin', relationshipStrength: 9, lastInteraction: 'Today', howYouKnow: 'Close friend and co-founder prospect', sharedConnections: 12 },
  { id: '13', name: 'Chris Andersen', title: 'VP of Banking', company: 'Wells Fargo', avatar: '', source: 'linkedin', industry: 'Banking', location: 'Charlotte', relationshipStrength: 4, lastInteraction: '1 month ago', howYouKnow: 'Conference panel together', sharedConnections: 9 },
  { id: '14', name: 'Mei Zhang', title: 'Research Scientist', company: 'DeepMind', avatar: '', source: 'university', industry: 'AI/ML', location: 'London', relationshipStrength: 7, lastInteraction: '5 days ago', howYouKnow: 'PhD lab partner', sharedConnections: 4 },
  { id: '15', name: 'Ryan O\'Brien', title: 'Senior Developer', company: 'Notion', avatar: '', source: 'teams', industry: 'Tech', location: 'New York', relationshipStrength: 8, lastInteraction: '2 days ago', howYouKnow: 'Hackathon teammate', sharedConnections: 6 },
  { id: '16', name: 'Lisa Wang', title: 'Portfolio Manager', company: 'BlackRock', avatar: '', source: 'linkedin', industry: 'Banking', location: 'New York', relationshipStrength: 3, lastInteraction: '2 months ago', howYouKnow: 'LinkedIn cold connect', sharedConnections: 5 },
  { id: '17', name: 'Ahmed Hassan', title: 'CEO', company: 'BuildRight', avatar: '', source: 'outlook', industry: 'Construction', location: 'Dubai', relationshipStrength: 5, lastInteraction: '3 weeks ago', howYouKnow: 'International trade conference', sharedConnections: 1 },
];

export const initialChatMessages: ChatMessage[] = [
  { id: '1', role: 'vinny', content: "Hey! I'm Vinny, your network intelligence assistant. I can help you find connections, recall contacts, and navigate your professional network. Try asking me something like \"Who do I know in banking?\" or \"When did I last talk to Priya?\"", timestamp: '9:00 AM' },
];

export const vinnyResponses: Record<string, { response: string; highlightIds: string[] }> = {
  banking: {
    response: "Found **7 contacts** in banking — highlighting them on your map now. Your strongest connections are **Sarah Chen** (Goldman Sachs) and **Marcus Williams** (JP Morgan).",
    highlightIds: ['1', '2', '5', '10', '13', '16'],
  },
  construction: {
    response: "That sounds like **Julio Cesare** — saved 3 weeks ago, CEO of JCC Construction, based in Vegas. I also found **Ahmed Hassan** from BuildRight in Dubai.",
    highlightIds: ['3', '17'],
  },
  fintech: {
    response: "You have **3 strong FinTech connections**: **Priya Sharma** at Stripe, **Emma Rodriguez** at Plaid, and **Nina Patel** who founded NovaPay. Nina is your closest — you spoke today!",
    highlightIds: ['4', '6', '12'],
  },
};
