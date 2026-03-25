import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './landing.css'

export default function LandingPage() {
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono:wght@300;400;500&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)

    const onScroll = () => {
      navRef.current?.classList.toggle('scrolled', window.scrollY > 40)
    }
    window.addEventListener('scroll', onScroll)

    const reveals = document.querySelectorAll('.lp-reveal')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), i * 60)
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.1 })
    reveals.forEach(el => observer.observe(el))

    return () => {
      window.removeEventListener('scroll', onScroll)
      observer.disconnect()
      document.head.removeChild(link)
    }
  }, [])

  return (
    <div className="lp">
      <div className="lp-grid-bg" />

      {/* Nav */}
      <nav className="lp-nav" ref={navRef}>
        <a href="#" className="lp-nav-logo">
          <div className="lp-nav-logo-mark">z</div>
          <span className="lp-nav-logo-text">zone</span>
        </a>
        {/* Mobile-only auth buttons */}
        <div className="lp-nav-mobile-auth">
          <Link to="/auth" className="lp-nav-mobile-signin">Sign in</Link>
          <Link to="/auth?mode=signup" className="lp-nav-cta">Sign up</Link>
        </div>

        <ul className="lp-nav-links">
          <li><a href="#values">Values</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#how">How it works</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><Link to="/auth" style={{ color: 'var(--text2)', textDecoration: 'none', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', transition: 'color .2s', fontFamily: 'var(--font-mono)' }}>Sign in</Link></li>
          <li><Link to="/auth?mode=signup" className="lp-nav-cta">Start free trial</Link></li>
        </ul>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero-glow" />
        <div className="lp-hero-eyebrow">
          <div className="lp-hero-eyebrow-line" />
          <span className="lp-hero-eyebrow-text">AI Trading Coach</span>
        </div>
        <h1 className="lp-hero-headline"><em>ZONE.</em></h1>
        <p className="lp-hero-subline">
          Most traders already have an edge. What they don't have is someone holding them to it. Zone is the AI coach that knows your plan, grades your execution, and tells you the truth — every single session.
        </p>
        <div className="lp-hero-actions">
          <Link to="/auth?mode=signup" className="lp-btn-primary">
            Start free trial <span>→</span>
          </Link>
          <a href="#features" className="lp-btn-secondary">See what's inside ↓</a>
        </div>
        <div className="lp-hero-stats">
          <div>
            <div className="lp-hero-stat-val">A–F</div>
            <div className="lp-hero-stat-label">Every trade graded</div>
          </div>
          <div>
            <div className="lp-hero-stat-val">AI</div>
            <div className="lp-hero-stat-label">Daily coaching reports</div>
          </div>
          <div>
            <div className="lp-hero-stat-val">$12.50</div>
            <div className="lp-hero-stat-label">Per month, all features</div>
          </div>
          <div>
            <div className="lp-hero-stat-val">7 days</div>
            <div className="lp-hero-stat-label">Free trial, no card required</div>
          </div>
        </div>

        {/* Terminal mockup */}
        <div className="lp-hero-terminal">
          <div className="lp-terminal-bar">
            <div className="lp-terminal-dot" style={{ background: '#FF5F57' }} />
            <div className="lp-terminal-dot" style={{ background: '#FFBD2E' }} />
            <div className="lp-terminal-dot" style={{ background: '#28CA41' }} />
            <span className="lp-terminal-title">zone // daily coaching report</span>
          </div>
          <div className="lp-terminal-body">
            <div className="lp-t-line"><span className="lp-t-label">session_date  </span><span className="lp-t-val">March 15, 2025</span></div>
            <div className="lp-t-line"><span className="lp-t-label">net_pnl       </span><span className="lp-t-val-green">+$1,240.00</span></div>
            <div className="lp-t-line"><span className="lp-t-label">win_rate      </span><span className="lp-t-val">68% (11/16)</span></div>
            <div className="lp-t-line"><span className="lp-t-label">discipline    </span><span className="lp-t-val-amber">74 / 100</span></div>
            <hr className="lp-t-divider" />
            <div className="lp-t-line"><span className="lp-t-label">rule violations</span></div>
            <div className="lp-t-line">
              <span className="lp-t-tag lp-tag-revenge">revenge trade</span>
              <span className="lp-t-val" style={{ fontSize: 11 }}>10:14 — 2min after $412 loss</span>
            </div>
            <div className="lp-t-line">
              <span className="lp-t-tag lp-tag-oversize">off-playbook</span>
              <span className="lp-t-val" style={{ fontSize: 11 }}>09:47 — no setup matched your plan</span>
            </div>
            <div className="lp-t-line">
              <span className="lp-t-tag lp-tag-clean">A-grade entry</span>
              <span className="lp-t-val" style={{ fontSize: 11 }}>08:31 — ORB setup, clean execution</span>
            </div>
            <hr className="lp-t-divider" />
            <div className="lp-t-line" style={{ color: 'var(--text2)', fontSize: 11, fontStyle: 'italic', fontFamily: "'Libre Baskerville', serif" }}>
              "Strong open. The 10:14 entry violated your rule against trading within 5 minutes of a loss — and cost you $412. Your playbook works when you follow it."
            </div>
            <div className="lp-t-line" style={{ marginTop: 8 }}>
              <span className="lp-t-label">ai_coach  </span><span className="lp-cursor" />
            </div>
          </div>
        </div>
      </section>

      {/* Quote */}
      <div className="lp-quote-section">
        <div className="lp-quote-inner">
          <span className="lp-quote-mark">"</span>
          <p className="lp-quote-text">
            The best traders have developed an edge and, more importantly, the discipline to act on that edge consistently — regardless of what the market does.
          </p>
          <p className="lp-quote-attr">— Mark Douglas, <span>Trading in the Zone</span></p>
        </div>
      </div>

      {/* Values */}
      <section className="lp-values-section" id="values">
        <div className="lp-section-inner">
          <div className="lp-values-header lp-reveal">
            <div className="lp-section-label">
              <div className="lp-section-label-line" />
              <span className="lp-section-label-text">What we believe</span>
            </div>
            <h2 className="lp-section-headline">BUILT ON<br />WHAT MATTERS</h2>
            <p className="lp-section-body">
              Most traders don't fail because of strategy. They fail because no one holds them accountable to the one they have. Zone was built around three truths that separate consistent traders from the rest.
            </p>
          </div>
          <div className="lp-values-grid">
            <div className="lp-value-card lp-reveal">
              <div className="lp-value-number">01</div>
              <div className="lp-value-title">ACCOUNTABILITY IS THE EDGE</div>
              <p className="lp-value-desc">You already know what you should do. The gap between knowing and doing is where accounts blow up. Zone closes that gap — grading every trade against your own rules and calling out every deviation, every session.</p>
            </div>
            <div className="lp-value-card lp-reveal">
              <div className="lp-value-number">02</div>
              <div className="lp-value-title">RADICAL HONESTY</div>
              <p className="lp-value-desc">Your AI coach doesn't sugarcoat. Revenge trades get called out by name. Off-playbook entries get flagged. Losing patterns get surfaced before they become losing months. You can't fix what you can't see.</p>
            </div>
            <div className="lp-value-card lp-reveal">
              <div className="lp-value-number">03</div>
              <div className="lp-value-title">PROCESS OVER OUTCOME</div>
              <p className="lp-value-desc">P&L is a result. Discipline is the input. Zone measures how consistently you execute your own plan — not just whether you made money today. Because traders who score well on process eventually score well on P&L.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="lp-features-section" id="features">
        <div className="lp-section-inner">
          <div className="lp-section-label lp-reveal">
            <div className="lp-section-label-line" />
            <span className="lp-section-label-text">Features</span>
          </div>
          <h2 className="lp-section-headline lp-reveal">YOUR COACH.<br />YOUR RULES.<br />YOUR RESULTS.</h2>
          <div className="lp-features-grid">
            {[
              {
                icon: '📋',
                title: 'YOUR TRADING PLAN',
                desc: 'Build your playbook — the setups you trade, the rules you follow, your weekly intention. Zone feeds your plan directly to the AI so every report is measured against what you said you would do.',
                tags: ['Playbook setups', 'Personal rules', 'Weekly intention'],
              },
              {
                icon: '🧠',
                title: 'AI COACHING REPORTS',
                desc: 'After every session, week, and month — your AI coach delivers a full breakdown. What matched your plan. What didn\'t. What behavioral pattern is costing you money. Specific, personal, actionable.',
                tags: ['Daily reports', 'Weekly deep-dives', 'Monthly reviews'],
              },
              {
                icon: '📊',
                title: 'TRADE GRADING',
                desc: 'Every trade scored across four dimensions: setup quality, entry execution, risk management, and trade management. A/B/C/F grades with AI commentary — so you know exactly why a green trade was still a bad trade.',
                tags: ['A/B/C/F grades', '4 dimensions', 'AI commentary'],
              },
              {
                icon: '💬',
                title: 'DAILY SMS CHECK-IN',
                desc: 'At 6pm on every trading day, Zone texts you to ask how your session went. Your reply gets fed to your AI coach — adding emotional and psychological context that makes every report more accurate and personal.',
                tags: ['6pm daily text', 'Your words matter', 'Feeds AI reports'],
              },
              {
                icon: '📸',
                title: 'SCREENSHOT JOURNAL',
                desc: 'Attach chart screenshots to every trade. Log your emotion. Add notes. Your full trading history — annotated and reviewed in every AI report. The more context you give, the better the coaching gets.',
                tags: ['Chart uploads', 'Emotion tracking', 'Trade notes'],
              },
              {
                icon: '📤',
                title: 'SHARE CARDS',
                desc: 'Generate shareable performance cards — your best trade, daily discipline score, or weekly P&L. Built for Twitter/X and Discord, because public accountability is the strongest kind.',
                tags: ['Twitter/X', 'Discord', 'Auto-generated'],
              },
            ].map((f) => (
              <div className="lp-feature-card lp-reveal" key={f.title}>
                <div className="lp-feature-icon">{f.icon}</div>
                <div>
                  <div className="lp-feature-title">{f.title}</div>
                  <p className="lp-feature-desc">{f.desc}</p>
                  <div className="lp-feature-tags">
                    {f.tags.map(t => <span className="lp-f-tag" key={t}>{t}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="lp-how-section" id="how">
        <div className="lp-section-inner">
          <div className="lp-section-label lp-reveal">
            <div className="lp-section-label-line" />
            <span className="lp-section-label-text">How it works</span>
          </div>
          <h2 className="lp-section-headline lp-reveal">FROM FIRST TRADE<br />TO FIRST REPORT<br />IN MINUTES</h2>
          <div className="lp-how-steps">
            {[
              { n: '01', title: 'IMPORT YOUR TRADES', desc: 'Export a CSV from Tradovate or TradingView and upload it. Zone parses your trade history automatically — no manual entry, no spreadsheets.' },
              { n: '02', title: 'BUILD YOUR PLAN', desc: 'Add your approved setups, your personal rules, and your risk parameters. This is the rulebook Zone will hold you to — in every grade and every report.' },
              { n: '03', title: 'GRADE & JOURNAL', desc: 'Zone grades every trade A–F across four dimensions. Add your chart screenshots and how you felt. The more context you give, the sharper the coaching.' },
              { n: '04', title: 'GET COACHED', desc: 'Your AI coach delivers daily, weekly, and monthly reports — cross-referenced against your plan. Not generic advice. Specific feedback about your specific mistakes.' },
            ].map((s) => (
              <div className="lp-how-step lp-reveal" key={s.n}>
                <div className="lp-how-step-num">{s.n}</div>
                <div className="lp-how-step-title">{s.title}</div>
                <p className="lp-how-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Behavioral */}
      <section className="lp-behavioral-section">
        <div className="lp-section-inner">
          <div className="lp-behavioral-inner">
            <div>
              <div className="lp-section-label lp-reveal">
                <div className="lp-section-label-line" />
                <span className="lp-section-label-text">Accountability</span>
              </div>
              <h2 className="lp-section-headline lp-reveal">ZONE KNOWS<br />YOUR PLAN.<br />DID YOU FOLLOW IT?</h2>
              <p className="lp-section-body lp-reveal">
                Most losses aren't about the setup. They're about what happened after a losing trade — or when boredom hit at noon. Zone cross-references every trade against your playbook and personal rules, and calls out every deviation by name.
              </p>
            </div>
            <div className="lp-behavioral-patterns lp-reveal">
              {[
                { name: 'Revenge trade — entered 2min after loss', badge: 'Flagged', cls: 'lp-badge-detected', row: 'flagged' },
                { name: 'Off-playbook entry — no setup matched', badge: 'Flagged', cls: 'lp-badge-detected', row: 'flagged' },
                { name: 'Traded past daily loss limit', badge: 'Violation', cls: 'lp-badge-detected', row: 'flagged' },
                { name: 'Size escalation after 2 losses', badge: 'Warning', cls: 'lp-badge-warning', row: '' },
                { name: 'ORB setup — clean entry execution', badge: 'A grade', cls: 'lp-badge-clean', row: 'clean' },
                { name: 'Calm emotion → consistent A/B grades', badge: 'Correlated', cls: 'lp-badge-clean', row: 'clean' },
                { name: 'Stop discipline this week', badge: '91%', cls: 'lp-badge-clean', row: 'clean' },
              ].map((p) => (
                <div className={`lp-pattern-row ${p.row}`} key={p.name}>
                  <span className="lp-pattern-name">{p.name}</span>
                  <span className={`lp-pattern-badge ${p.cls}`}>{p.badge}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="lp-pricing-section" id="pricing">
        <div className="lp-section-inner">
          <div style={{ textAlign: 'center' }} className="lp-reveal">
            <div className="lp-section-label" style={{ justifyContent: 'center' }}>
              <div className="lp-section-label-line" />
              <span className="lp-section-label-text">Pricing</span>
              <div className="lp-section-label-line" />
            </div>
            <h2 className="lp-section-headline" style={{ margin: '0 auto 16px', textAlign: 'center' }}>ONE PRICE.<br />EVERYTHING.</h2>
            <p className="lp-section-body" style={{ margin: '0 auto', textAlign: 'center' }}>
              No tiers. No feature gates. Every tool, every AI report, every account — included.
            </p>
          </div>
          <div className="lp-pricing-card lp-reveal">
            <div className="lp-pricing-header">
              <div>
                <div className="lp-pricing-plan">zone</div>
                <div className="lp-pricing-plan-sub">Full access — all features</div>
              </div>
              <span className="lp-pricing-tag">7-day free trial</span>
            </div>
            <div className="lp-pricing-body">
              <div className="lp-pricing-price"><sup>$</sup>12.50<sub>/month</sub></div>
              <p className="lp-pricing-tagline">Less than a losing trade. Cancel anytime.</p>
              <hr className="lp-pricing-divider" />
              <div className="lp-pricing-features">
                {[
                  'Trading plan — playbook, rules, and weekly intention',
                  'AI daily, weekly, and monthly coaching reports',
                  'Trade grading — A/B/C/F with AI commentary',
                  'Daily SMS check-in at 6pm — feeds your AI coach',
                  'Screenshot journal with emotion and notes',
                  'Rule violation engine — daily loss, max size, overtrading',
                  'Multiple accounts — Tradovate, TradingView, manual entry',
                  'Share cards for Twitter/X and Discord',
                ].map(f => (
                  <div className="lp-pricing-feature" key={f}>
                    <span className="lp-pricing-check">✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <Link to="/auth?mode=signup" className="lp-pricing-cta">Start 7-day free trial →</Link>
              <p className="lp-pricing-trial">No credit card required. Cancel anytime.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta-section">
        <h2 className="lp-cta-headline lp-reveal">STOP JOURNALING.<br />START BEING HELD<br /><em style={{ color: 'var(--green)', fontStyle: 'normal' }}>accountable.</em></h2>
        <p className="lp-cta-sub lp-reveal">You already have a plan. Zone makes sure you follow it. Start your free trial today.</p>
        <Link to="/auth?mode=signup" className="lp-btn-primary lp-reveal" style={{ fontSize: 14, padding: '16px 40px', display: 'inline-flex' }}>
          Start free trial — 7 days free →
        </Link>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <span className="lp-footer-logo">zone</span>
        <ul className="lp-footer-links">
          <li><a href="#">Privacy</a></li>
          <li><a href="#">Terms</a></li>
          <li><a href="#">Contact</a></li>
        </ul>
        <span className="lp-footer-copy">© 2026 zone. all rights reserved.</span>
      </footer>
    </div>
  )
}
