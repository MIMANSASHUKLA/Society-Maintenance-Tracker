'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRoute() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) {
          router.push('/');
          return;
        }
        const data = await res.json();
        if (data.user.role === 'admin') {
          router.push('/dashboard/admin');
        } else {
          router.push('/dashboard/resident');
        }
      })
      .catch(() => {
        router.push('/');
      });
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'sans-serif',
      color: '#64748b',
      backgroundColor: '#f8fafc'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: '8px', color: '#1e293b' }}>Loading Workspace...</h2>
        <p style={{ fontSize: '14px' }}>Verifying credentials and setting up your panel.</p>
      </div>
    </div>
  );
}
