'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Megaphone, AlertTriangle, Bell } from 'lucide-react';

interface Notice {
  id: number;
  title: string;
  content: string;
  is_important: number;
  author_name: string;
  created_at: string;
}

export default function NoticeBoard() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotices = async () => {
    try {
      const res = await fetch('/api/notices');
      if (res.ok) {
        const data = await res.json();
        setNotices(data.notices);
      }
    } catch (err) {
      console.error('Error fetching notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  return (
    <div className="nivas-workspace" style={{ gridTemplateColumns: '280px 1fr' }}>
      <Sidebar activePath="notices" />

      <main className="center-column" style={{ paddingRight: '40px' }}>
        <header className="top-bar" style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.85)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 24px',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 className="section-title" style={{ fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Megaphone size={20} style={{ color: 'var(--primary)' }} /> Society Circulars
            </h1>
            <p style={{ color: 'var(--text-sub)', fontSize: '13px', marginTop: '2px' }}>
              Official announcements, maintenance schedules, and general news.
            </p>
          </div>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-sub)' }}>
            <p>Loading circular board...</p>
          </div>
        ) : notices.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 24px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Megaphone size={48} style={{ color: 'var(--text-light)', marginBottom: '16px' }} />
            <h3 style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>No notices posted</h3>
            <p style={{ color: 'var(--text-sub)', fontSize: '14px', marginTop: '4px' }}>
              The management board has not posted any announcements yet.
            </p>
          </div>
        ) : (
          <div className="notices-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {notices.map((n) => (
              <div 
                key={n.id} 
                className={`notice-card ${n.is_important === 1 ? 'pinned' : ''}`}
                style={{ 
                  backgroundColor: 'var(--bg-card)', 
                  borderRadius: '20px', 
                  border: n.is_important === 1 ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                  padding: '24px',
                  boxShadow: 'var(--shadow-card)',
                  position: 'relative'
                }}
              >
                {n.is_important === 1 && (
                  <span className="notice-pin-indicator" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', right: '24px', top: '24px', fontWeight: '700', fontSize: '11px', position: 'absolute' }}>
                    <Bell size={14} /> Important Alert
                  </span>
                )}

                <h2 className="notice-title" style={{ fontSize: '18px', color: 'var(--text-main)', marginBottom: '12px', paddingRight: '120px', fontWeight: '700', fontFamily: 'var(--font-headings)' }}>{n.title}</h2>
                <p className="notice-content" style={{ color: 'var(--text-sub)', fontSize: '14px', lineHeight: '1.6' }}>{n.content}</p>

                <div className="notice-footer" style={{ borderTop: '1px solid var(--border-color)', marginTop: '16px', paddingTop: '12px', color: 'var(--text-light)', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    Posted by: <strong>{n.author_name}</strong>
                  </span>
                  <span>
                    {new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
