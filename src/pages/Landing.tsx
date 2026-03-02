import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const sheetsScriptUrl = (import.meta.env.VITE_GOOGLE_SHEETS_SCRIPT_URL || '').trim();
const web3formsKey = (import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || '').trim();
const formspreeFormId = (import.meta.env.VITE_FORMSPREE_FORM_ID || '').trim();

function getWaitlistPayload(email: string) {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  return {
    email,
    timestamp: new Date().toISOString(),
    referrer: typeof document !== 'undefined' ? document.referrer || '' : '',
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '',
    language: typeof navigator !== 'undefined' ? navigator.language : '',
    device: typeof navigator !== 'undefined' && /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
  };
}

const Landing = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error('Please enter your email.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (sheetsScriptUrl) {
        const res = await fetch(sheetsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(getWaitlistPayload(trimmed)),
        });
        const text = await res.text();
        let data: { success?: boolean; message?: string; alreadyRegistered?: boolean } = {};
        try {
          data = JSON.parse(text);
        } catch {
          console.error('[Vinny] Script returned non-JSON. Status:', res.status, 'Body:', text.slice(0, 200));
          throw new Error('Script returned invalid response — check deployment is "Anyone"');
        }
        if (!res.ok || data.success === false) {
          console.error('[Vinny] Script error:', res.status, data);
          throw new Error(data.message || 'Failed to submit');
        }
        if (data.alreadyRegistered) {
          toast.success("You're already registered for early access!");
          setEmail('');
          return;
        }
      } else if (web3formsKey) {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_key: web3formsKey,
            email: trimmed,
            subject: 'Vinny early access signup',
            from_name: 'Vinny Waitlist',
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to submit');
      } else if (formspreeFormId) {
        const res = await fetch(`https://formspree.io/f/${formspreeFormId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmed, _subject: 'Vinny early access signup' }),
        });
        if (!res.ok) throw new Error('Failed to submit');
      } else {
        localStorage.setItem('vinny_early_access_email', trimmed);
      }
      toast.success("Thanks! We'll notify you when Vinny launches.");
      setEmail('');
    } catch (err) {
      console.error('[Vinny] Submit error:', err);
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top right: user icon (links to app) */}
      <header className="absolute top-0 right-0 p-6">
        <Link
          to="/app"
          className="w-10 h-10 rounded-full border border-zinc-600 flex items-center justify-center text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Go to app"
        >
          <User className="w-5 h-5" />
        </Link>
      </header>

      {/* Centered content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        {/* Coming soon badge */}
        <span className="mb-6 px-4 py-1.5 rounded-full bg-zinc-900 text-white text-sm font-medium">
          Coming soon
        </span>

        {/* Title */}
        <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight mb-3">
          Vinny
        </h1>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-white mb-4">
          Visualize your network.
        </p>

        {/* Supporting text */}
        <p className="text-base text-zinc-400 mb-10 max-w-md text-center">
          In a world of 9 billion people, why venture alone?
        </p>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full h-12 px-4 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 transition-colors"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-lg bg-white text-black font-semibold hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Get early access
                <span aria-hidden>→</span>
              </>
            )}
          </button>
        </form>

        {/* Disclaimer */}
        <p className="mt-6 text-xs text-zinc-500 text-center max-w-sm">
          No spam. We'll only notify you when Vinny launches.
        </p>
      </main>
    </div>
  );
};

export default Landing;
