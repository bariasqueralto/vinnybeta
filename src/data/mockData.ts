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
  // Banking
  {
    id: '1',
    name: 'Alex Morgan',
    title: 'Analyst',
    company: 'Goldman Sachs',
    avatar: '',
    source: 'outlook',
    industry: 'Banking',
    location: 'New York, NY',
    relationshipStrength: 8,
    lastInteraction: '2 days ago',
    howYouKnow: 'Met at a Goldman recruiting event and worked on a few deal teams together early in your career.',
    sharedConnections: 5,
    email: 'alex.morgan@gs.com',
  },
  {
    id: '2',
    name: 'Sarah Chen',
    title: 'VP',
    company: 'JPMorgan',
    avatar: '',
    source: 'outlook',
    industry: 'Banking',
    location: 'New York, NY',
    relationshipStrength: 9,
    lastInteraction: '1 day ago',
    howYouKnow: 'Connected through a mutual Wharton alum at a networking mixer. She\'s been a trusted sounding board for years.',
    sharedConnections: 8,
    email: 'sarah.chen@jpmorgan.com',
  },
  {
    id: '3',
    name: 'Marco Diaz',
    title: 'Associate',
    company: 'Citi',
    avatar: '',
    source: 'outlook',
    industry: 'Banking',
    location: 'New York, NY',
    relationshipStrength: 6,
    lastInteraction: '1 week ago',
    howYouKnow: 'Former colleague from your summer internship. You still grab coffee whenever he\'s in town.',
    sharedConnections: 3,
    email: 'marco.diaz@citi.com',
  },
  {
    id: '4',
    name: 'James Wu',
    title: 'Director',
    company: 'Morgan Stanley',
    avatar: '',
    source: 'outlook',
    industry: 'Banking',
    location: 'New York, NY',
    relationshipStrength: 8,
    lastInteraction: '3 days ago',
    howYouKnow: 'Went to school together and reconnected at a finance conference in 2022. You collaborate on deal flow regularly.',
    sharedConnections: 10,
    email: 'james.wu@morganstanley.com',
  },
  // Tech
  {
    id: '5',
    name: 'Priya Patel',
    title: 'Product Manager',
    company: 'Google',
    avatar: '',
    source: 'outlook',
    industry: 'Tech',
    location: 'San Francisco, CA',
    relationshipStrength: 5,
    lastInteraction: '2 weeks ago',
    howYouKnow: 'Introduced by a mutual friend at a startup event in SF. She leads the Maps platform team.',
    sharedConnections: 4,
    email: 'priya.patel@google.com',
  },
  {
    id: '6',
    name: 'Ryan Torres',
    title: 'Software Engineer',
    company: 'Stripe',
    avatar: '',
    source: 'outlook',
    industry: 'Tech',
    location: 'San Francisco, CA',
    relationshipStrength: 4,
    lastInteraction: '3 weeks ago',
    howYouKnow: 'Met at a hackathon two years ago. You keep in touch over occasional coffee and Slack.',
    sharedConnections: 2,
    email: 'ryan.torres@stripe.com',
  },
  {
    id: '7',
    name: 'Nina Kovac',
    title: 'Engineering Manager',
    company: 'Microsoft',
    avatar: '',
    source: 'outlook',
    industry: 'Tech',
    location: 'Seattle, WA',
    relationshipStrength: 7,
    lastInteraction: '5 days ago',
    howYouKnow: 'Former college classmate who moved into big tech. You reconnected at a class reunion and have stayed close.',
    sharedConnections: 6,
    email: 'nina.kovac@microsoft.com',
  },
  // Real Estate
  {
    id: '8',
    name: 'Daniel Reyes',
    title: 'Senior Broker',
    company: 'CBRE',
    avatar: '',
    source: 'outlook',
    industry: 'Real Estate',
    location: 'New York, NY',
    relationshipStrength: 5,
    lastInteraction: '10 days ago',
    howYouKnow: 'Referred by a banking contact. He helped you evaluate commercial properties in Midtown and has been a reliable resource.',
    sharedConnections: 3,
    email: 'daniel.reyes@cbre.com',
  },
  {
    id: '9',
    name: 'Olivia Huang',
    title: 'VP Acquisitions',
    company: 'Blackstone',
    avatar: '',
    source: 'outlook',
    industry: 'Real Estate',
    location: 'New York, NY',
    relationshipStrength: 7,
    lastInteraction: '4 days ago',
    howYouKnow: 'Met at an alternative assets summit. Strong overlap on the finance and real estate investing side.',
    sharedConnections: 7,
    email: 'olivia.huang@blackstone.com',
  },
  {
    id: '10',
    name: 'Marcus Blake',
    title: 'Principal',
    company: 'JLL',
    avatar: '',
    source: 'outlook',
    industry: 'Real Estate',
    location: 'Chicago, IL',
    relationshipStrength: 3,
    lastInteraction: '1 month ago',
    howYouKnow: 'Connected on LinkedIn after a real estate investment conference. You\'ve exchanged a few emails on market trends.',
    sharedConnections: 1,
    email: 'marcus.blake@jll.com',
  },
];

export const initialChatMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'vinny',
    content: "Hey! I'm Vinny, your network intelligence assistant. I can help you find connections, recall contacts, and navigate your professional network. Try asking **\"who do I know in banking\"**, **\"any tech contacts?\"**, or **\"real estate connections\"**.",
    timestamp: '9:00 AM',
  },
];
