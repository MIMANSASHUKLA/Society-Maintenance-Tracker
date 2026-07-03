'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building, Wrench, Megaphone, CreditCard, AlertTriangle } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [isRegister, setIsRegister] = useState(false);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('resident');
  
  // Status states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) {
          router.push('/dashboard');
        }
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister 
      ? { email, password, name, role }
      : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      if (isRegister) {
        setSuccess('Registration successful! You can now log in.');
        setIsRegister(false);
        setPassword('');
      } else {
        setShowAuthModal(false);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      {/* Navigation Header */}
      <nav className="landing-navbar" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '20px 40px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Building size={24} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px', fontFamily: 'var(--font-headings)' }}>Society Maintenance Tracker</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px', fontSize: '15px', fontWeight: '600', color: 'var(--text-sub)' }}>
          <a href="#features" style={{ transition: 'var(--transition)' }} className="nav-hover-link">Features</a>
          <a href="#about" style={{ transition: 'var(--transition)' }} className="nav-hover-link">About</a>
          <button 
            type="button" 
            className="submit-btn" 
            style={{ width: 'auto', padding: '8px 20px', borderRadius: '20px', fontSize: '13px' }}
            onClick={() => { setIsRegister(false); setShowAuthModal(true); }}
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Main Hero Banner */}
      <header className="landing-hero" style={{ 
        textAlign: 'center', 
        padding: '100px 40px 80px 40px',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <h1 className="landing-headline" style={{ 
          fontSize: '48px', 
          fontWeight: '800', 
          lineHeight: '1.2', 
          letterSpacing: '-1px',
          color: 'var(--text-main)',
          marginBottom: '20px',
          fontFamily: 'var(--font-headings)'
        }}>
          Manage your society &mdash; <br/>
          <span style={{ background: 'linear-gradient(135deg, var(--primary) 30%, var(--accent-blue) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            smarter and well organized
          </span>
        </h1>
        <p className="landing-subtext" style={{ 
          fontSize: '16px', 
          color: 'var(--text-sub)', 
          lineHeight: '1.6', 
          marginBottom: '32px'
        }}>
          A premium collaborative workspace for residents and administrators to log maintenance tickets, coordinate dues payments, and announce notices.
        </p>
        <div className="landing-ctas" style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <button 
            type="button" 
            className="submit-btn" 
            style={{ padding: '14px 28px', borderRadius: '30px', fontSize: '15px', width: 'auto' }}
            onClick={() => { setIsRegister(true); setShowAuthModal(true); }}
          >
            Start Free
          </button>
          <a 
            href="#features" 
            className="btn-secondary" 
            style={{ padding: '14px 28px', borderRadius: '30px', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Learn More
          </a>
        </div>
      </header>

      {/* Features Showcase Grid */}
      <section id="features" style={{ backgroundColor: '#ffffff', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '80px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 40px 40px 40px', textAlign: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Operations Suite</span>
          <h2 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)', marginTop: '8px', letterSpacing: '-0.5px', fontFamily: 'var(--font-headings)' }}>Everything your community needs</h2>
        </div>
        
        <div className="landing-features-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '30px', 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '0 40px' 
        }}>
          <div className="landing-feature-card" style={{ 
            padding: '40px 30px', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-color)', 
            backgroundColor: '#ffffff', 
            boxShadow: 'var(--shadow-sm)',
            transition: 'var(--transition)'
          }}>
            <Wrench size={36} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '20px 0 10px 0', fontFamily: 'var(--font-headings)' }}>Complaint Tracker</h3>
            <p style={{ color: 'var(--text-sub)', fontSize: '14px', lineHeight: '1.6' }}>
              File maintenance tickets with optional photo uploads. Monitor real-time status transitions and detailed action timelines.
            </p>
          </div>

          <div className="landing-feature-card" style={{ 
            padding: '40px 30px', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-color)', 
            backgroundColor: '#ffffff', 
            boxShadow: 'var(--shadow-sm)',
            transition: 'var(--transition)'
          }}>
            <Megaphone size={36} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '20px 0 10px 0', fontFamily: 'var(--font-headings)' }}>Community Board</h3>
            <p style={{ color: 'var(--text-sub)', fontSize: '14px', lineHeight: '1.6' }}>
              Stay updated with society circulars. Pinned notices remain highlighted, and urgent notices trigger instant email notifications.
            </p>
          </div>

          <div className="landing-feature-card" style={{ 
            padding: '40px 30px', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-color)', 
            backgroundColor: '#ffffff', 
            boxShadow: 'var(--shadow-sm)',
            transition: 'var(--transition)'
          }}>
            <CreditCard size={36} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '20px 0 10px 0', fontFamily: 'var(--font-headings)' }}>Financial Dashboard</h3>
            <p style={{ color: 'var(--text-sub)', fontSize: '14px', lineHeight: '1.6' }}>
              Trace maintenance collections monthly, audit outstanding flat dues, and trigger quick payment reminder alerts to residents.
            </p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <footer id="about" style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--text-sub)', fontSize: '14px' }}>
        <p>&copy; {new Date().getFullYear()} Society Maintenance Tracker. All rights reserved.</p>
        <p style={{ color: 'var(--text-light)', marginTop: '8px' }}>Designed for premium apartment collaborations.</p>
      </footer>

      {/* AUTHENTICATION OVERLAY MODAL */}
      {showAuthModal && (
        <div className="modal-backdrop" style={{ zIndex: 100 }} onClick={() => setShowAuthModal(false)}>
          <div 
            className="auth-card" 
            style={{ 
              width: '100%', 
              maxWidth: '440px', 
              backgroundColor: '#ffffff', 
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="auth-header">
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div className="logo-icon" style={{ backgroundColor: 'var(--primary-glow)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '16px' }}>
                  <Building size={28} />
                </div>
              </div>
              <h2 className="auth-title" style={{ fontFamily: 'var(--font-headings)' }}>Welcome to Society Tracker</h2>
              <p className="auth-subtitle">
                {isRegister 
                  ? 'Register your flat coordinates below'
                  : 'Sign in to access your dashboard'}
              </p>
            </div>

            <div className="auth-tabs">
              <button 
                type="button" 
                className={`auth-tab ${!isRegister ? 'active' : ''}`}
                onClick={() => { setIsRegister(false); setError(''); setSuccess(''); }}
              >
                Sign In
              </button>
              <button 
                type="button" 
                className={`auth-tab ${isRegister ? 'active' : ''}`}
                onClick={() => { setIsRegister(true); setError(''); setSuccess(''); }}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="auth-body">
              {error && (
                <div className="form-error" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </div>
              )}
              
              {success && (
                <div className="form-success">
                  {success}
                </div>
              )}

              {isRegister && (
                <div className="form-group">
                  <label className="form-label" htmlFor="auth-name">Full Name</label>
                  <input
                    id="auth-name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Sunita Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="auth-email">Email Address</label>
                <input
                  id="auth-email"
                  type="email"
                  className="form-input"
                  placeholder="e.g. resident@society.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {isRegister && (
                <div className="form-group">
                  <label className="form-label" htmlFor="auth-role">I am a...</label>
                  <select
                    id="auth-role"
                    className="form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="resident">Resident</option>
                    <option value="admin">Administrator / Board Member</option>
                  </select>
                </div>
              )}

              <button 
                type="submit" 
                className="submit-btn" 
                disabled={loading}
                style={{ marginTop: '16px', borderRadius: '12px' }}
              >
                {loading ? 'Processing...' : isRegister ? 'Register Account' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
