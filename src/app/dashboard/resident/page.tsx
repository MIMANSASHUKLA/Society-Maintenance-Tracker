'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import { 
  Building, 
  CreditCard, 
  Wrench, 
  Megaphone, 
  HelpCircle, 
  Bell, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  X,
  FileText,
  User,
  Shield,
  Activity,
  History,
  AlertCircle
} from 'lucide-react';

interface Complaint {
  id: number;
  category: string;
  description: string;
  photo_path: string | null;
  status: 'Open' | 'In Progress' | 'Resolved';
  priority: 'Low' | 'Medium' | 'High';
  created_at: string;
  updated_at: string;
  is_overdue: number;
}

interface HistoryItem {
  id: number;
  old_status: string | null;
  new_status: string;
  actor_name: string;
  actor_role: string;
  note: string | null;
  created_at: string;
}

interface UserData {
  id: number;
  name: string;
  email: string;
  role: 'resident';
  flat: {
    flat_no: string;
    owner_name: string;
    maintenance_dues: number;
  } | null;
}

interface PaymentLog {
  id: number;
  flat_no: string;
  resident_name: string;
  amount: number;
  method: string;
  ref_no: string;
  created_at: string;
}

type ResidentTab = 'dashboard' | 'flats' | 'maintenance' | 'complaints' | 'settings' | 'help';

export default function ResidentDashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Active tab selection
  const [activeScreen, setActiveScreen] = useState<ResidentTab>('dashboard');
  
  // Form states
  const [category, setCategory] = useState('Plumbing');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Pay Dues Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Zoomed Image
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const fetchUserDataAndComplaints = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      const compRes = await fetch('/api/complaints');
      
      if (meRes.ok && compRes.ok) {
        const meData = await meRes.json();
        const compData = await compRes.json();
        setUser(meData.user);
        setComplaints(compData.complaints);

        // Fetch payments log if flat is assigned
        if (meData.user?.flat) {
          const payRes = await fetch('/api/payments');
          if (payRes.ok) {
            const payData = await payRes.json();
            const myLogs = (payData.payments || []).filter((p: any) => p.flat_no === meData.user.flat.flat_no);
            setPaymentLogs(myLogs);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching resident dashboard details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDataAndComplaints();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitLoading(true);

    if (!description.trim()) {
      setSubmitError('Please enter a description');
      setSubmitLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('category', category);
    formData.append('description', description);
    if (photo) {
      formData.append('photo', photo);
    }

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit complaint');
      }

      setCategory('Plumbing');
      setDescription('');
      setPhoto(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      fetchUserDataAndComplaints();
      setActiveScreen('complaints');
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleViewHistory = async (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setHistoryItems([]);

    try {
      const res = await fetch(`/api/complaints/${complaint.id}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryItems(data.history);
      }
    } catch (err) {
      console.error('Error fetching history details:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSimulatePayment = () => {
    setPaymentSuccess(true);
    setTimeout(() => {
      setPaymentSuccess(false);
      setShowPayModal(false);
      fetchUserDataAndComplaints();
    }, 2000);
  };

  const openTicketsCount = complaints.filter(c => c.status === 'Open').length;
  const resolvedTicketsCount = complaints.filter(c => c.status === 'Resolved').length;

  if (loading || !user) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-sub)',
        fontFamily: 'sans-serif'
      }}>
        <h2>Loading Resident Dashboard Workspace...</h2>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="nivas-workspace">
      {/* COLUMN 1: LEFT SIDEBAR */}
      <Sidebar 
        activePath={activeScreen} 
        onTabSelect={(tab) => setActiveScreen(tab as ResidentTab)}
      />
      
      {/* COLUMN 2: CENTER CONTENT */}
      <main className="center-column" style={activeScreen !== 'dashboard' && activeScreen !== 'maintenance' ? { gridColumn: '2 / 4' } : {}}>
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
            <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={20} style={{ color: 'var(--primary)' }} /> Resident Services
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button 
              type="button" 
              style={{ position: 'relative', padding: '8px', borderRadius: '10px', backgroundColor: 'var(--bg-app)' }}
              onClick={() => fetchUserDataAndComplaints()}
            >
              <Bell size={18} style={{ color: 'var(--text-sub)' }} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)', color: '#fff', display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: '15px', justifyContent: 'center' }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>{user.name}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: '600' }}>Flat Owner</span>
              </div>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {/* 1. DASHBOARD OVERVIEW VIEW */}
          {activeScreen === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Welcome, {user.name}</h2>
                <p style={{ color: 'var(--text-sub)', fontSize: '14px', marginTop: '2px' }}>Today is {today} &bull; Manage your flat coordinates.</p>
              </div>

              <div className="nivas-card" style={{ padding: '24px', marginBottom: '24px' }}>
                <h3 className="card-label">My Repair Tickets Summary</h3>
                <div style={{ display: 'flex', gap: '40px', marginTop: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-light)', textTransform: 'uppercase' }}>Total Filed</span>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)' }}>{complaints.length}</div>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '40px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-light)', textTransform: 'uppercase' }}>Open Tickets</span>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--warning)' }}>{openTicketsCount}</div>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '40px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-light)', textTransform: 'uppercase' }}>Resolved</span>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--success)' }}>{resolvedTicketsCount}</div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="card-label" style={{ marginBottom: '16px' }}>Active Repair Tickets</h2>
                {complaints.length === 0 ? (
                  <div className="nivas-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-light)' }}>
                    <AlertCircle size={32} style={{ color: 'var(--text-light)', marginBottom: '12px' }} />
                    <h4 style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>No active tickets</h4>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>Submit a complaint using the form if something needs fixing.</p>
                  </div>
                ) : (
                  <div className="complaints-list">
                    {complaints.map((c) => (
                      <div key={c.id} className="complaint-card" style={{ padding: '24px' }}>
                        <div className="complaint-badge-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)', marginRight: 'auto' }}>Ticket #{c.id}</span>
                          {c.is_overdue === 1 && (
                            <span className="badge overdue-alert" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <AlertTriangle size={12} /> Overdue
                            </span>
                          )}
                          <span className={`badge status-${c.status.toLowerCase().replace(' ', '')}`}>{c.status}</span>
                          <span className={`badge priority-${c.priority.toLowerCase()}`}>{c.priority}</span>
                        </div>
                        <div className="complaint-title-row">
                          <h2 className="complaint-category" style={{ fontSize: '16px', fontWeight: 'bold' }}>{c.category}</h2>
                          <span className="complaint-date">Filed on {new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="complaint-description" style={{ color: 'var(--text-sub)', fontSize: '13px' }}>{c.description}</p>
                        <div className="complaint-footer" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '16px' }}>
                          {c.photo_path ? (
                            <div className="complaint-photo-preview" onClick={() => setZoomedImage(c.photo_path)}>
                              <img src={c.photo_path} alt="attachment" />
                              <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>Inspect attachment</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-light)', fontStyle: 'italic' }}>No attachment payload.</span>
                          )}
                          <button 
                            type="button" 
                            className="btn-secondary" 
                            style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => handleViewHistory(c)}
                          >
                            <History size={14} /> History Log
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 2. FLATS / REGISTER MODULE */}
          {activeScreen === 'flats' && (
            <motion.div key="flats" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }}>
              <div className="nivas-card" style={{ padding: '32px' }}>
                <h3 className="card-label" style={{ marginBottom: '24px' }}>My Flat Coordinates</h3>
                {user.flat ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                    <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-light)', textTransform: 'uppercase', display: 'block', fontWeight: '600' }}>Flat / Unit Number</span>
                      <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>Flat {user.flat.flat_no}</span>
                    </div>
                    <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-light)', textTransform: 'uppercase', display: 'block', fontWeight: '600' }}>Registered Owner</span>
                      <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>{user.flat.owner_name}</span>
                    </div>
                    <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', gridColumn: '1 / 3' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-light)', textTransform: 'uppercase', display: 'block', fontWeight: '600' }}>Levy Standing</span>
                      <span style={{ fontSize: '24px', fontWeight: '800', color: user.flat.maintenance_dues > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {user.flat.maintenance_dues > 0 ? `₹${user.flat.maintenance_dues.toLocaleString('en-IN')}` : 'Dues Cleared'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '24px', border: '1px dashed var(--border-color)', borderRadius: '16px', textAlign: 'center', color: 'var(--text-light)' }}>
                    No flat coordinates registered. Contact administrator.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 3. MAINTENANCE DUES LEDGER */}
          {activeScreen === 'maintenance' && (
            <motion.div key="maintenance" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }}>
              <h3 className="card-label" style={{ marginBottom: '20px' }}>Personal Maintenance Dues</h3>
              
              <div className="nivas-card" style={{ padding: '24px' }}>
                {paymentLogs.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-light)' }}>
                    No payment logs recorded.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-color)', color: 'var(--text-sub)' }}>
                        <th style={{ padding: '12px 10px' }}>Flat</th>
                        <th style={{ padding: '12px 10px' }}>Resident</th>
                        <th style={{ padding: '12px 10px' }}>Amount</th>
                        <th style={{ padding: '12px 10px' }}>Method</th>
                        <th style={{ padding: '12px 10px' }}>Reference</th>
                        <th style={{ padding: '12px 10px' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentLogs.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>{p.flat_no}</td>
                          <td style={{ padding: '12px 10px' }}>{p.resident_name}</td>
                          <td style={{ padding: '12px 10px', fontWeight: 'bold', color: 'var(--success)' }}>₹{p.amount.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '12px 10px' }}>
                            <span className="badge priority-low" style={{ textTransform: 'uppercase', fontSize: '11px' }}>{p.method}</span>
                          </td>
                          <td style={{ padding: '12px 10px', fontFamily: 'monospace' }}>{p.ref_no}</td>
                          <td style={{ padding: '12px 10px', color: 'var(--text-light)' }}>
                            {new Date(p.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          )}

          {/* 4. REPAIR SUBMISSION TAB */}
          {activeScreen === 'complaints' && (
            <motion.div key="complaints" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }}>
              <div className="nivas-card" style={{ padding: '32px' }}>
                <h3 className="card-label" style={{ marginBottom: '24px' }}>File Repair Request Ticket</h3>
                <form onSubmit={handleCreateComplaint} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="issue-cat">Category Type</label>
                    <select
                      id="issue-cat"
                      className="form-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="Plumbing">Plumbing repairs</option>
                      <option value="Electrical">Electrical faults</option>
                      <option value="Security">Security risks</option>
                      <option value="Cleanliness">Corridor sanitation</option>
                      <option value="Others">General requests</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="issue-desc">Brief Description</label>
                    <textarea
                      id="issue-desc"
                      className="form-input"
                      style={{ minHeight: '100px' }}
                      placeholder="Explain the repair details..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="issue-photo">Upload Attachment (Optional)</label>
                    <input
                      id="issue-photo"
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      style={{ padding: '8px 0' }}
                    />
                  </div>

                  {submitError && (
                    <div style={{ color: 'var(--danger)', fontSize: '13px', fontWeight: '600' }}>
                      {submitError}
                    </div>
                  )}

                  <button type="submit" className="submit-btn" disabled={submitLoading} style={{ alignSelf: 'flex-start', padding: '12px 24px', borderRadius: '12px' }}>
                    {submitLoading ? 'Filing Ticket...' : 'File Ticket'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* 5. SETTINGS PANEL */}
          {activeScreen === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }}>
              <div className="nivas-card" style={{ padding: '32px' }}>
                <h3 className="card-label" style={{ marginBottom: '24px' }}>Resident Profile Details</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input type="text" className="form-input" value={user.name} disabled />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="text" className="form-input" value={user.email} disabled />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role Privilege</label>
                    <input type="text" className="form-input" value={user.role} style={{ textTransform: 'capitalize' }} disabled />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 6. HELP & FAQS */}
          {activeScreen === 'help' && (
            <motion.div key="help" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }}>
              <div className="nivas-card" style={{ padding: '32px' }}>
                <h3 className="card-label" style={{ marginBottom: '20px' }}>Resident FAQ Manual</h3>
                <div style={{ color: 'var(--text-sub)', fontSize: '14px', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <h4 style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>How do I pay maintenance dues?</h4>
                    <p style={{ marginTop: '4px' }}>Click "Pay Levy" in the dashboard sidebar dues pane to simulate scanning a UPI QR code or executing a bank transaction.</p>
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>How do I track repairs?</h4>
                    <p style={{ marginTop: '4px' }}>Navigate to the "History Log" of your ticket. Any updates made by the administrator (e.g. In Progress, Resolved) along with comments are logged in real-time.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* COLUMN 3: RIGHT SIDEBAR */}
      {(activeScreen === 'dashboard' || activeScreen === 'maintenance') && (
        <aside className="right-sidebar">
          {user.flat ? (
            <div className="dues-sidebar-card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: '700' }}>Dues Balance</span>
              <div style={{ fontSize: '32px', fontWeight: '800', margin: '8px 0', color: user.flat.maintenance_dues > 0 ? 'var(--danger)' : 'var(--success)' }}>
                ₹{user.flat.maintenance_dues.toLocaleString('en-IN')}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginBottom: '20px' }}>
                {user.flat.maintenance_dues > 0 
                  ? 'Please settle your outstanding maintenance dues to avoid service disruption.' 
                  : 'Your account balance is clear. Thank you!'}
              </p>
              {user.flat.maintenance_dues > 0 && (
                <button 
                  type="button" 
                  className="submit-btn" 
                  style={{ width: '100%', padding: '12px', borderRadius: '12px' }}
                  onClick={() => setShowPayModal(true)}
                >
                  Pay Levy
                </button>
              )}
            </div>
          ) : (
            <div style={{ padding: '20px', backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '12px', fontSize: '13px', color: 'var(--text-light)', textAlign: 'center' }}>
              No flat coordinates registered.
            </div>
          )}

          {/* Quick timeline notifications log */}
          <h3 className="right-sidebar-title" style={{ marginTop: '24px' }}>Updates Timeline</h3>
          <div className="sidebar-tx-list">
            {complaints.slice(0, 4).map(c => (
              <div key={c.id} className="sidebar-tx-item" style={{ borderBottom: '1px solid #f1f5f9', borderRadius: '0', padding: '12px 6px' }}>
                <div className="tx-icon-details">
                  <div className="tx-avatar-icon" style={{ backgroundColor: 'var(--primary-glow)', color: 'var(--primary)' }}>
                    <Activity size={16} />
                  </div>
                  <div>
                    <div className="tx-flat-name">Repair ticket #{c.id} updated</div>
                    <div className="tx-time">Status: {c.status}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* HISTORY MODAL */}
      {showHistoryModal && selectedComplaint && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Repair Ticket #{selectedComplaint.id} &mdash; Progress Logs</h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowHistoryModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {historyLoading ? (
                <p style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Loading ticket progress history logs...</p>
              ) : historyItems.length === 0 ? (
                <p style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>No audit comments recorded on this ticket yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {historyItems.map(item => (
                    <div key={item.id} style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '16px', paddingBottom: '4px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                        <span>Updated by <strong>{item.actor_name}</strong> ({item.actor_role})</span> &bull; <span>{new Date(item.created_at).toLocaleString()}</span>
                      </div>
                      <div style={{ margin: '4px 0', fontSize: '13px', color: 'var(--text-main)' }}>
                        Status transition: <strong>{item.old_status || 'Open'}</strong> &rarr; <strong>{item.new_status}</strong>
                      </div>
                      {item.note && (
                        <p style={{ fontSize: '12px', color: 'var(--text-sub)', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
                          Comment: {item.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="submit-btn" onClick={() => setShowHistoryModal(false)}>Close Log</button>
            </div>
          </div>
        </div>
      )}

      {/* DUES SIMULATOR MODAL */}
      {showPayModal && user.flat && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Settle Dues Simulator</h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowPayModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ padding: '24px 0' }}>
              {paymentSuccess ? (
                <div style={{ padding: '20px 0' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--success-glow)', color: 'var(--success)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                    <CheckCircle size={28} />
                  </div>
                  <h4 style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>Payment Succeeded!</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>Dues balance cleared in database logs.</p>
                </div>
              ) : (
                <div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', display: 'inline-block', backgroundColor: '#fff', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
                    <Building size={64} style={{ color: 'var(--primary)' }} />
                  </div>
                  <h4 style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>Maintenance Levy: Flat {user.flat.flat_no}</h4>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-main)', margin: '8px 0' }}>₹{user.flat.maintenance_dues.toLocaleString('en-IN')}</div>
                  <p style={{ fontSize: '11px', color: 'var(--text-light)', maxWidth: '280px', margin: '0 auto 20px' }}>
                    Simulate scanning this QR space with any transaction client to deduct balance.
                  </p>
                  <button 
                    type="button" 
                    className="submit-btn" 
                    style={{ width: '100%', padding: '12px', borderRadius: '12px' }}
                    onClick={handleSimulatePayment}
                  >
                    Simulate Successful Collection
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ZOOM IMAGE BACKDROP */}
      {zoomedImage && (
        <div className="modal-backdrop" style={{ zIndex: 400 }} onClick={() => setZoomedImage(null)}>
          <img src={zoomedImage} alt="attachment" style={{ maxWidth: '85%', maxHeight: '85%', borderRadius: '12px' }} />
        </div>
      )}
    </div>
  );
}
