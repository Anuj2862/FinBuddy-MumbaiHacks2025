import { useState, useEffect, useRef, useCallback } from 'react'
import { VoiceChat } from './components/VoiceChat'
import { Analytics } from './components/Analytics'
import './App.css'

/* ─────────────────────────────────────────────
   AudioCoinBtn — defined OUTSIDE App so it
   never remounts when App re-renders.
   Receives a stable ref to the <audio> element.
───────────────────────────────────────────── */
function AudioCoinBtn({ audioRef }: { audioRef: React.RefObject<HTMLAudioElement> }) {
  const [on, setOn] = useState(false)

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (on) {
      el.pause()
    } else {
      el.volume = 1
      el.play().catch(err => console.warn('Audio blocked by browser:', err))
    }
    setOn(prev => !prev)
  }

  return (
    <button
      className={`coin-audio-btn ${on ? 'coin-audio-btn--on' : ''}`}
      onClick={toggle}
      title={on ? 'Mute background music' : 'Play background music'}
      aria-label="Toggle background music"
    >
      <span className="coin-audio-btn__symbol">$</span>
      <span className="coin-audio-btn__icon">
        <i className={`fas ${on ? 'fa-volume-up' : 'fa-volume-mute'}`} />
      </span>
    </button>
  )
}

/* ─────────────────────────────────────────────
   Main App
───────────────────────────────────────────── */
function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [userName, setUserName]   = useState('')
  const [theme, setTheme]         = useState(localStorage.getItem('finbuddy_theme') || 'dark')
  const [lang,  setLang]          = useState(localStorage.getItem('finbuddy_lang')  || 'en')

  /* Persistent audio ref — lives for the entire app lifetime */
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    document.body.className = theme
    localStorage.setItem('finbuddy_theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('finbuddy_lang', lang)
  }, [lang])

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const uid  = p.get('userId')
    const name = p.get('name')
    if (uid) {
      localStorage.setItem('finbuddy_user_id', uid)
      if (name) localStorage.setItem('finbuddy_user_name', name)
      setActiveTab('dashboard')
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    const storedUid  = localStorage.getItem('finbuddy_user_id')
    const storedName = localStorage.getItem('finbuddy_user_name')
    if (storedUid) setUserName(storedName || 'User')
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('finbuddy_user_id')
    localStorage.removeItem('finbuddy_user_name')
    setActiveTab('home')
  }, [])

  const userId = localStorage.getItem('finbuddy_user_id')

  return (
    <div className="premium-bg min-vh-100">

      {/* ── Single persistent <audio> — always in DOM ── */}
      <audio
        ref={audioRef}
        src="/bg-audio.mp3"
        loop
        preload="auto"
        style={{ display: 'none' }}
      />

      {/* ── Coin audio button — only shown on home tab ── */}
      {activeTab === 'home' && <AudioCoinBtn audioRef={audioRef} />}

      <div className="border-0 rounded-0 min-vh-100 overflow-hidden" style={{ background: 'transparent' }}>

        {/* ── Navbar ── */}
        <div
          className="p-4 d-flex flex-column flex-md-row justify-content-between align-items-center glass-navbar border-bottom"
          style={{ borderColor: '#DDE8F8' }}
        >
          <h2
            className="mb-3 mb-md-0 fw-bold text-gradient-primary"
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveTab('home')}
          >
            <i className="fas fa-wallet me-2" />FinBuddy AI
          </h2>

          {activeTab !== 'home' && (
            <div className="d-flex align-items-center gap-3">
              <span className="d-none d-md-inline" style={{ color: '#8FA3C8' }}>
                Welcome, <strong style={{ color: '#1A2340' }}>{userName}</strong>
              </span>
              <div
                className="btn-group"
                role="group"
                style={{ background: '#F0F5FF', padding: '4px', borderRadius: '12px', border: '1px solid #DDE8F8' }}
              >
                <button
                  type="button"
                  className={`btn ${activeTab === 'dashboard' ? 'btn-glow-primary' : 'btn-nav-inactive'} rounded-2 me-1`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  <i className="fas fa-chart-line me-2" />
                  {lang === 'en' ? 'Dashboard' : 'डैशबोर्ड'}
                </button>
                <button
                  type="button"
                  className={`btn ${activeTab === 'assistant' ? 'btn-glow-primary' : 'btn-nav-inactive'} rounded-2 me-1`}
                  onClick={() => setActiveTab('assistant')}
                >
                  <i className="fas fa-robot me-2" />
                  {lang === 'en' ? 'AI Assistant' : 'एआई सहायक'}
                </button>
                <button
                  type="button"
                  className="btn btn-nav-inactive rounded-2 ms-1"
                  onClick={() => window.open('http://localhost:4200/arena', '_blank')}
                >
                  <i className="fas fa-gamepad me-2" />
                  {lang === 'en' ? 'Spend Arena' : 'स्पेंड एरिना'}
                </button>
              </div>
              <button className="btn btn-util ms-2" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Toggle Theme">
                <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
              </button>
              <button className="btn btn-util fw-bold" onClick={() => setLang(l => l === 'en' ? 'hi' : 'en')}>
                {lang === 'en' ? 'HI' : 'EN'}
              </button>
              {userId && (
                <button className="btn btn-util" onClick={handleLogout} title="Logout">
                  <i className="fas fa-sign-out-alt" />
                </button>
              )}
            </div>
          )}

          {activeTab === 'home' && !userId && (
            <button className="btn btn-glow-primary rounded-pill px-4" onClick={() => window.location.href = 'http://localhost:5000/login.html'}>
              Login / Join Now
            </button>
          )}
          {activeTab === 'home' && userId && (
            <div className="d-flex align-items-center gap-3">
              <span style={{ color: '#8FA3C8' }}>Hi, {userName}</span>
              <button className="btn btn-nav-inactive btn-sm" onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>

        {/* ── Page content ── */}
        <div className="card-body p-0">
          {activeTab === 'home' ? (

            /* ── Landing page with video bg ── */
            <div className="landing-page">
              <div className="video-bg-wrap">
                <video className="video-bg" src="/bg-video.mp4" autoPlay loop muted playsInline />
                <div className="video-overlay" />
              </div>

              <div className="landing-content text-center animate-fadeIn">
                <div className="mb-4">
                  <i className="fas fa-wallet fa-4x mb-3 landing-icon" />
                  <h1 className="display-4 fw-bold mb-3 landing-title">
                    Financial Clarity for{' '}
                    <span className="text-gradient-primary">Small Vendors</span>
                  </h1>
                  <p className="lead mx-auto landing-subtitle" style={{ maxWidth: '680px' }}>
                    Track your daily income, manage expenses, and monitor GST limits using just your voice.
                    Built specifically for India's informal economy.
                  </p>
                </div>

                <div className="d-flex justify-content-center gap-3 mt-4 flex-wrap">
                  {userId ? (
                    <button className="btn btn-glow-primary btn-lg px-5 py-3 rounded-pill" onClick={() => setActiveTab('dashboard')}>
                      <i className="fas fa-th-large me-2" /> Open Dashboard
                    </button>
                  ) : (
                    <button className="btn btn-glow-primary btn-lg px-5 py-3 rounded-pill" onClick={() => window.location.href = 'http://localhost:5000/login.html'}>
                      <i className="fas fa-sign-in-alt me-2" /> Get Started / Login
                    </button>
                  )}
                  <button className="btn btn-lg px-5 py-3 rounded-pill landing-btn-ghost" onClick={() => window.open('http://localhost:4200/arena', '_blank')}>
                    <i className="fas fa-gamepad me-2" /> Play Spend Arena
                  </button>
                </div>

                <div className="row mt-5 g-4 justify-content-center landing-cards">
                  <div className="col-md-4 col-sm-10">
                    <div className="glass-card landing-card p-4 h-100 d-flex flex-column align-items-center text-center">
                      <i className="fas fa-microphone fa-2x mb-3" style={{ color: '#4B7BF5' }} />
                      <h4 className="landing-card-title">Voice Tracking</h4>
                      <p className="small landing-card-text mb-0">Just say "Rs. 500 earned" and let the AI do the work.</p>
                    </div>
                  </div>
                  <div className="col-md-4 col-sm-10">
                    <div className="glass-card landing-card p-4 h-100 d-flex flex-column align-items-center text-center">
                      <i className="fas fa-file-invoice-dollar fa-2x mb-3" style={{ color: '#3A9E5F' }} />
                      <h4 className="landing-card-title">GST Monitoring</h4>
                      <p className="small landing-card-text mb-0">Track turnover vs 20L/40L thresholds automatically.</p>
                    </div>
                  </div>
                  <div className="col-md-4 col-sm-10">
                    <div className="glass-card landing-card p-4 h-100 d-flex flex-column align-items-center text-center">
                      <i className="fas fa-chart-line fa-2x mb-3" style={{ color: '#8FA3C8' }} />
                      <h4 className="landing-card-title">Daily Insights</h4>
                      <p className="small landing-card-text mb-0">Get localized advice to grow your business.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          ) : activeTab === 'assistant' ? (
            <div className="p-4 d-flex justify-content-center">
              <div style={{ width: '100%', maxWidth: '800px' }}>
                <VoiceChat />
              </div>
            </div>
          ) : (
            <Analytics lang={lang as 'en' | 'hi'} />
          )}
        </div>

        <div className="p-3 text-center border-top mt-auto" style={{ borderColor: '#DDE8F8' }}>
          <small style={{ color: '#8FA3C8' }}>© 2026 FinBuddy AI - Indian Informal Economy Financial Freedom</small>
        </div>
      </div>
    </div>
  )
}

export default App
