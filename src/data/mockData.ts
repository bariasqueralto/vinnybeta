export type DataSource = 'outlook';

export interface Contact {
  id: string;
  name: string;
  title: string;
  company: string;
  avatar: string;
  source: DataSource;
  industry: string;
  location: string;
  relationshipStrength: number;
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
  outlook: 'bg-node-outlook',
};

export const SOURCE_LABELS: Record<DataSource, string> = {
  outlook: 'Outlook',
};

export const STROKE_COLORS: Record<DataSource, string> = {
  outlook: 'hsl(142, 60%, 50%)',
};

export const mockContacts: Contact[] = [
  { id: '1', name: 'Alex Morgan', title: 'Analyst', company: 'Goldman Sachs', avatar: '', source: 'outlook', industry: 'Banking', location: 'New York', relationshipStrength: 7, lastInteraction: '2 days ago', howYouKnow: 'Outlook contact', sharedConnections: 5 },
  { id: '2', name: 'Sarah Chen', title: 'VP', company: 'JPMorgan', avatar: '', source: 'outlook', industry: 'Banking', location: 'New York', relationshipStrength: 9, lastInteraction: '1 day ago', howYouKnow: 'Outlook contact', sharedConnections: 8 },
  { id: '3', name: 'Marco Diaz', title: 'Associate', company: 'Citi', avatar: '', source: 'outlook', industry: 'Banking', location: 'New York', relationshipStrength: 6, lastInteraction: '1 week ago', howYouKnow: 'Outlook contact', sharedConnections: 3 },
  { id: '4', name: 'Priya Patel', title: 'Intern', company: 'BlackRock', avatar: '', source: 'outlook', industry: 'Finance', location: 'New York', relationshipStrength: 4, lastInteraction: '3 weeks ago', howYouKnow: 'Outlook contact', sharedConnections: 2 },
  { id: '5', name: 'James Wu', title: 'Director', company: 'Morgan Stanley', avatar: '', source: 'outlook', industry: 'Banking', location: 'New York', relationshipStrength: 8, lastInteraction: '3 days ago', howYouKnow: 'Outlook contact', sharedConnections: 10 },
  { id: '6', name: 'Lisa Park', title: 'Associate', company: 'Deutsche Bank', avatar: '', source: 'outlook', industry: 'Banking', location: 'New York', relationshipStrength: 5, lastInteraction: '2 weeks ago', howYouKnow: 'Outlook contact', sharedConnections: 4 },
];

export const initialChatMessages: ChatMessage[] = [
  { id: '1', role: 'vinny', content: "Hey! I'm Vinny, your network intelligence assistant. I can help you find connections, recall contacts, and navigate your professional network. Try asking me something like \"Who do I know in banking?\"", timestamp: '9:00 AM' },
];

export const vinnyResponses: Record<string, { response: string; highlightIds: string[] }> = {
  banking: {
    response: "Found **5 contacts** in banking — highlighting them on your map now. Your strongest connections are **Sarah Chen** (JPMorgan) and **James Wu** (Morgan Stanley).",
    highlightIds: ['1', '2', '3', '5', '6'],
  },
  goldman: {
    response: "**Alex Morgan** is an Analyst at Goldman Sachs. You connected via Outlook.",
    highlightIds: ['1'],
  },
  jpmorgan: {
    response: "**Sarah Chen** is a VP at JPMorgan — one of your strongest connections!",
    highlightIds: ['2'],
  },
};
