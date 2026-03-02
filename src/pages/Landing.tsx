import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import VinnyBackground from '@/components/VinnyBackground';
import './Landing.css';

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Landing = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shaking, setShaking] = useState(false);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const bottomBarRef = useRef<HTMLElement>(null);

  // Intersection observer for footer/bottom-bar reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -50px 0px' }
    );
    if (footerRef.current) observer.observe(footerRef.current);
    if (bottomBarRef.current) observer.observe(bottomBarRef.current);
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();

    if (!EMAIL_REGEX.test(trimmed)) {
      setShaking(true);
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
        const raw = localStorage.getItem('vinny_emails');
        const arr = raw ? JSON.parse(raw) : [];
        arr.push({ email: trimmed, date: new Date().toISOString() });
        localStorage.setItem('vinny_emails', JSON.stringify(arr));
      }

      setIsSuccess(true);
      setEmail('');

      // Collapse the input
      if (inputWrapRef.current) {
        inputWrapRef.current.style.maxHeight = inputWrapRef.current.scrollHeight + 'px';
        requestAnimationFrame(() => {
          inputWrapRef.current?.classList.add('hidden');
        });
      }
    } catch (err) {
      console.error('[Vinny] Submit error:', err);
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="landing-page">
      <VinnyBackground />

      {/* Avatar / app link */}
      <Link to="/app" className="landing-avatar" aria-label="Go to app">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </Link>

      {/* Hero */}
      <main className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-left">
            <span className="landing-badge">Soon</span>
            <h1 className="landing-headline">Vinny</h1>
            <p className="landing-tagline">Visualize your network.</p>
            <p className="landing-subtext">In a world of 9 billion people, why venture alone?</p>
          </div>
          <div className="landing-right">
            <form className="landing-form-wrap" onSubmit={handleSubmit} noValidate>
              <div
                ref={inputWrapRef}
                className="landing-input-collapse"
              >
                <input
                  type="email"
                  className={`landing-email-input${shaking ? ' shake' : ''}`}
                  placeholder="Enter your email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onAnimationEnd={() => setShaking(false)}
                />
              </div>
              <button
                type="submit"
                className={`landing-cta-btn${isSuccess ? ' success' : ''}`}
                disabled={isSubmitting || isSuccess}
              >
                {isSubmitting ? (
                  <div className="landing-spinner" />
                ) : isSuccess ? (
                  "You're on the list \u2713"
                ) : (
                  'Get Early Access \u2192'
                )}
              </button>
            </form>
            <p className="landing-microcopy">No spam. Only an email when Vinny launches.</p>
          </div>
        </div>
      </main>

      {/* Footer stats */}
      <section className="landing-footer-strip" ref={footerRef}>
        <div className="landing-stats">
          <div className="landing-stat">
            <span className="landing-stat-label">Free</span>
            <span className="landing-stat-desc">Early access at no cost</span>
          </div>
          <div className="landing-stat">
            <span className="landing-stat-label">Your Network</span>
            <span className="landing-stat-desc">Mapped & visualized</span>
          </div>
          <div className="landing-stat">
            <span className="landing-stat-label">One email</span>
            <span className="landing-stat-desc">That's all it takes</span>
          </div>
        </div>
      </section>

      <footer className="landing-bottom-bar" ref={bottomBarRef}>&copy; 2025 Vinny</footer>
    </div>
  );
};

export default Landing;
