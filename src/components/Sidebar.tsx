'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building, 
  CreditCard, 
  Wrench, 
  Megaphone, 
  Settings as SettingsIcon, 
  HelpCircle, 
  LogOut 
} from 'lucide-react';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'resident';
}

interface SidebarProps {
  activePath: string;
  onTabSelect?: (tab: string) => void;
}

export default function Sidebar({ activePath, onTabSelect }: SidebarProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) {
          router.push('/');
          return;
        }
        const data = await res.json();
        setUser(data.user);
      })
      .catch(() => {
        router.push('/');
      });
  }, [router]);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!user) return null;

  const dashboardUrl = user.role === 'admin' ? '/dashboard/admin' : '/dashboard/resident';

  const navItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={18} />, path: 'dashboard', url: dashboardUrl },
    { name: 'Flats / Units', icon: <Building size={18} />, path: 'flats' },
    { name: 'Maintenance', icon: <CreditCard size={18} />, path: 'maintenance' },
    { name: 'Complaints', icon: <Wrench size={18} />, path: 'complaints' },
    { name: 'Notices', icon: <Megaphone size={18} />, path: 'notices', url: '/notices' },
    { name: 'Settings', icon: <SettingsIcon size={18} />, path: 'settings' },
    { name: 'Help & Docs', icon: <HelpCircle size={18} />, path: 'help' }
  ];

  const handleNavClick = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    if (item.url) {
      router.push(item.url);
    } else if (onTabSelect) {
      onTabSelect(item.path);
    }
  };

  return (
    <aside className="left-sidebar">
      <div className="nivas-logo-area">
        <Building size={22} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="nivas-logo-title" style={{ fontSize: '16px', lineHeight: '1.2' }}>SM Tracker</span>
          <span className="nivas-logo-subtitle" style={{ fontSize: '9px', color: 'var(--text-light)', letterSpacing: '0.5px' }}>Society Management</span>
        </div>
      </div>

      <nav className="nivas-nav">
        {navItems.map((item) => (
          <a
            key={item.name}
            href={item.url || '#'}
            onClick={(e) => handleNavClick(e, item)}
            className={`nivas-nav-item ${activePath === item.path ? 'active' : ''}`}
          >
            {item.icon} {item.name}
          </a>
        ))}
      </nav>

      <div className="user-profile-section">
        <div className="user-profile-menu">
          <div className="user-avatar" style={{ backgroundColor: 'var(--primary)' }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.role}</div>
          </div>
        </div>
        <button 
          onClick={handleLogout} 
          className="sidebar-logout-btn" 
          type="button"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
