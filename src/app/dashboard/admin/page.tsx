'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import { 
  LayoutDashboard, 
  Building, 
  CreditCard, 
  Wrench, 
  Megaphone, 
  Settings as SettingsIcon, 
  HelpCircle, 
  LogOut, 
  Bell, 
  Search, 
  PlusCircle, 
  CheckCircle, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Mail, 
  MessageSquare, 
  PhoneCall, 
  Calendar, 
  User, 
  Shield, 
  Info, 
  X,
  Users,
  AlertCircle,
  FileText,
  DollarSign
} from 'lucide-react';

interface Complaint {
  id: number;
  resident_id: number;
  resident_name: string;
  resident_email: string;
  category: string;
  description: string;
  photo_path: string | null;
  status: 'Open' | 'In Progress' | 'Resolved';
  priority: 'Low' | 'Medium' | 'High';
  created_at: string;
  updated_at: string;
  age_days: number;
  is_overdue: number;
}

interface Flat {
  flat_no: string;
  owner_name: string;
  occupancy_status: 'Occupied' | 'Vacant';
  maintenance_dues: number;
}

interface Payment {
  id: number;
  flat_no: string;
  resident_name: string;
  amount: number;
  method: string;
  ref_no: string;
  created_at: string;
}

interface DashboardStats {
  total_collected: number;
  growth_amount: number;
  monthly_chart: { label: string; value: number }[];
  pending_dues: {
    total: number;
    categories: {
      overdue: { count: number; sum: number };
      partial: { count: number; sum: number };
      cleared: { count: number };
    };
  };
  occupancy: { total: number; occupied: number; vacant: number };
  tickets: { open: number; in_progress: number; resolved: number; overdue: number };
}

type AdminTab = 'dashboard' | 'flats' | 'maintenance' | 'complaints' | 'settings' | 'help' | 'logs';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [flatsList, setFlatsList] = useState<Flat[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // Active tab selection
  const [activeScreen, setActiveScreen] = useState<AdminTab>('dashboard');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Settings states
  const [overdueThreshold, setOverdueThreshold] = useState(3);
  const [flatRate, setFlatRate] = useState(1500);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Manual payment state
  const [manualFlat, setManualFlat] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualMethod, setManualMethod] = useState('Cash');
  const [paymentRecording, setPaymentRecording] = useState(false);

  // Custom reminder states
  const [selectedReminderFlat, setSelectedReminderFlat] = useState('');
  const [reminderType, setReminderType] = useState('Email');
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderSending, setReminderSending] = useState(false);

  // Selected complaint actions
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [statusVal, setStatusVal] = useState<'Open' | 'In Progress' | 'Resolved'>('Open');
  const [priorityVal, setPriorityVal] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Post notice states
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeIsImportant, setNoticeIsImportant] = useState(false);
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  // Toast notifier
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Email Server logs
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Zoomed Image
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Record Manual Payment modal
  const [showRecordModal, setShowRecordModal] = useState(false);

  // Fetch initial dashboard stats
  const loadDashboardData = async () => {
    try {
      const statsRes = await fetch('/api/dashboard-stats');
      const paymentsRes = await fetch('/api/payments');
      const complaintsRes = await fetch('/api/complaints');

      if (statsRes.ok && paymentsRes.ok && complaintsRes.ok) {
        const statsData = await statsRes.json();
        const paymentsData = await paymentsRes.json();
        const complaintsData = await complaintsRes.json();

        setStats(statsData);
        setPayments(paymentsData.payments);
        setFlatsList(paymentsData.allFlats || paymentsData.flatsWithDues || []);
        setComplaints(complaintsData.complaints);
      }
    } catch (error) {
      console.error('Failed fetching data details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    // Load config settings
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setOverdueThreshold(data.overdue_threshold_days || 3);
        setFlatRate(data.monthly_flat_rate || 1500);
      })
      .catch(() => {});
  }, []);

  const handleSendReminder = async (flatNo: string, ownerName: string, dues: number) => {
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flat_no: flatNo,
          resident_name: ownerName,
          dues_amount: dues
        })
      });

      if (res.ok) {
        showToast(`Reminder alert sent to ${ownerName} (Flat ${flatNo})!`);
      } else {
        showToast('Failed to trigger reminder. Try again.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error dispatching reminder.');
    }
  };

  const handleSendCustomReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReminderFlat) {
      showToast('Please select a resident.');
      return;
    }
    const flat = flatsList.find(f => f.flat_no === selectedReminderFlat);
    if (!flat) return;

    setReminderSending(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flat_no: flat.flat_no,
          resident_name: flat.owner_name,
          dues_amount: flat.maintenance_dues,
          type: reminderType,
          message: reminderMessage
        })
      });

      if (res.ok) {
        showToast(`Reminder alert sent successfully via ${reminderType}!`);
        setReminderMessage('');
        setSelectedReminderFlat('');
      } else {
        showToast('Failed to trigger reminder.');
      }
    } catch (err) {
      showToast('Error dispatching reminder.');
    } finally {
      setReminderSending(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualFlat.trim() || !manualName.trim() || !manualAmount) {
      showToast('Please fill out all payment details.');
      return;
    }
    setPaymentRecording(true);

    try {
      const res = await fetch('/api/payments/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flat_no: manualFlat,
          resident_name: manualName,
          amount: parseFloat(manualAmount),
          method: manualMethod,
          ref_no: 'MANUAL' + Math.floor(100000 + Math.random() * 900000)
        })
      });

      if (res.ok) {
        setManualFlat('');
        setManualName('');
        setManualAmount('');
        setShowRecordModal(false);
        showToast(`Payment recorded successfully for Flat ${manualFlat}!`);
        loadDashboardData();
      } else {
        const errorData = await res.json();
        showToast(errorData.error || 'Failed to record payment');
      }
    } catch (err) {
      showToast('Error recording transaction.');
    } finally {
      setPaymentRecording(false);
    }
  };

  const handleUpdateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/complaints/${selectedComplaint.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusVal,
          priority: priorityVal,
          note: actionNote
        })
      });

      if (res.ok) {
        setShowComplaintModal(false);
        showToast(`Complaint #${selectedComplaint.id} updated successfully!`);
        loadDashboardData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          overdue_threshold_days: overdueThreshold,
          monthly_flat_rate: flatRate
        })
      });
      if (res.ok) {
        showToast('Settings saved successfully.');
        loadDashboardData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoticeLoading(true);

    try {
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noticeTitle,
          content: noticeContent,
          is_important: noticeIsImportant ? 1 : 0
        })
      });

      if (res.ok) {
        setNoticeTitle('');
        setNoticeContent('');
        setNoticeIsImportant(false);
        setShowNoticeModal(false);
        showToast('Announcement posted successfully!');
        loadDashboardData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setNoticeLoading(false);
    }
  };

  const loadEmailLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setEmailLogs(data.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeScreen === 'logs') {
      loadEmailLogs();
    }
  }, [activeScreen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredFlats = flatsList.filter(f => {
    const query = searchQuery.toLowerCase();
    return f.flat_no.toLowerCase().includes(query) || f.owner_name.toLowerCase().includes(query);
  });

  const filteredPayments = payments.filter(p => {
    const query = searchQuery.toLowerCase();
    return p.flat_no.toLowerCase().includes(query) || p.resident_name.toLowerCase().includes(query) || p.method.toLowerCase().includes(query);
  });

  const latestPayment = payments[0] || null;

  if (loading || !stats) {
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
        <h2>Loading Society Maintenance Tracker Workspace...</h2>
      </div>
    );
  }

  const duesCats = stats.pending_dues.categories;
  const totalCategorySum = duesCats.overdue.sum + duesCats.partial.sum;
  const overduePercent = totalCategorySum > 0 ? (duesCats.overdue.sum / totalCategorySum) * 100 : 0;
  const partialPercent = totalCategorySum > 0 ? (duesCats.partial.sum / totalCategorySum) * 100 : 0;
  const conicGradientStyle = totalCategorySum > 0
    ? `conic-gradient(var(--danger) 0% ${overduePercent}%, var(--warning) ${overduePercent}% ${overduePercent + partialPercent}%, var(--success) ${overduePercent + partialPercent}% 100%)`
    : `conic-gradient(var(--success) 0% 100%)`;

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="nivas-workspace">
      {/* COLUMN 1: LEFT SIDEBAR */}
      <Sidebar 
        activePath={activeScreen} 
        onTabSelect={(tab) => { setActiveScreen(tab as AdminTab); setSearchQuery(''); }}
      />

      {/* COLUMN 2: CENTER CONTENT */}
      <main className="center-column" style={activeScreen !== 'dashboard' ? { gridColumn: '2 / 4' } : {}}>
        {/* Modern SaaS Header Card */}
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
          <div className="search-container" style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            <input 
              type="text" 
              className="search-input" 
              style={{ paddingLeft: '44px', borderRadius: '12px', border: '1px solid var(--border-color)', width: '100%', height: '40px', outline: 'none' }}
              placeholder={`Search...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button 
              type="button" 
              style={{ position: 'relative', padding: '8px', borderRadius: '10px', backgroundColor: 'var(--bg-app)' }}
              onClick={() => showToast('System notification log up to date.')}
            >
              <Bell size={18} style={{ color: 'var(--text-sub)' }} />
              <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--danger)' }} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: '15px', justifyContent: 'center' }}>
                AM
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>Admin Manager</span>
                <span style={{ fontSize: '10px', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: '600' }}>Society Board</span>
              </div>
            </div>
          </div>
        </header>

        {/* 1. DASHBOARD OVERVIEW VIEW */}
        {activeScreen === 'dashboard' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            {/* Welcome banner */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Welcome back, Admin</h2>
              <p style={{ color: 'var(--text-sub)', fontSize: '14px', marginTop: '2px' }}>Today is {today} &bull; Here is the society overview.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <button 
                onClick={() => { setActiveScreen('flats'); }}
                className="btn-secondary" 
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', borderRadius: 'var(--radius-sm)', fontWeight: '600', justifyContent: 'center' }}
              >
                <PlusCircle size={18} style={{ color: 'var(--primary)' }} /> Add Resident
              </button>
              <button 
                onClick={() => setShowRecordModal(true)}
                className="submit-btn" 
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', borderRadius: 'var(--radius-sm)', fontWeight: '600', justifyContent: 'center' }}
              >
                <DollarSign size={18} /> Collect Dues
              </button>
              <button 
                onClick={() => setShowNoticeModal(true)}
                className="btn-secondary" 
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', borderRadius: 'var(--radius-sm)', fontWeight: '600', justifyContent: 'center' }}
              >
                <Megaphone size={18} style={{ color: 'var(--primary)' }} /> Post Notice
              </button>
              <button 
                onClick={() => { setActiveScreen('complaints'); }}
                className="btn-secondary" 
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', borderRadius: 'var(--radius-sm)', fontWeight: '600', justifyContent: 'center' }}
              >
                <Wrench size={18} style={{ color: 'var(--primary)' }} /> Resolve Ticket
              </button>
            </div>

            {/* 4 Stats Cards Grid */}
            <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(200px, 1fr))', gap: '20px', minWidth: '720px' }}>
              {/* Card 1: Collections */}
              <div className="nivas-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-sub)', fontWeight: '600' }}>Total Collected</span>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(79, 70, 229, 0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={18} />
                  </div>
                </div>
                <h3 style={{ fontSize: '24px', fontWeight: '800', marginTop: '12px', color: 'var(--text-main)' }}>
                  ₹{stats.total_collected.toLocaleString('en-IN')}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '11px' }}>
                  {stats.growth_amount > 0 ? (
                    <span style={{ color: 'var(--success)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <ArrowUpRight size={14} /> +₹{stats.growth_amount.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-light)' }}>No dynamic growth</span>
                  )}
                  <span style={{ color: 'var(--text-light)' }}>vs last month</span>
                </div>
              </div>

              {/* Card 2: Occupancy */}
              <div className="nivas-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-sub)', fontWeight: '600' }}>Flats Occupied</span>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(96, 165, 250, 0.1)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building size={18} />
                  </div>
                </div>
                <h3 style={{ fontSize: '24px', fontWeight: '800', marginTop: '12px', color: 'var(--text-main)' }}>
                  {stats.occupancy.occupied}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '11px' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>
                    {stats.occupancy.total > 0 ? Math.round((stats.occupancy.occupied / stats.occupancy.total) * 100) : 0}%
                  </span>
                  <span style={{ color: 'var(--text-light)' }}>occupancy rate</span>
                </div>
              </div>

              {/* Card 3: Complaints */}
              <div className="nivas-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-sub)', fontWeight: '600' }}>Active Tickets</span>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Wrench size={18} />
                  </div>
                </div>
                <h3 style={{ fontSize: '24px', fontWeight: '800', marginTop: '12px', color: 'var(--text-main)' }}>
                  {stats.tickets.open + stats.tickets.in_progress}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '11px' }}>
                  <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{stats.tickets.overdue} Overdue</span>
                  <span style={{ color: 'var(--text-light)' }}>pending action</span>
                </div>
              </div>

              {/* Card 4: Residents */}
              <div className="nivas-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-sub)', fontWeight: '600' }}>Residents Logged</span>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(34, 197, 94, 0.08)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={18} />
                  </div>
                </div>
                <h3 style={{ fontSize: '24px', fontWeight: '800', marginTop: '12px', color: 'var(--text-main)' }}>
                  {stats.occupancy.occupied}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '11px' }}>
                  <span style={{ color: 'var(--text-light)' }}>Assigned to flats</span>
                </div>
              </div>
            </div>
            </div>

            {/* Analytics Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
              {/* Collection stats graph */}
              <div className="nivas-card">
                <h3 className="card-label">Monthly Collections</h3>
                {stats.monthly_chart.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-light)' }}>
                    No collections history available.
                  </div>
                ) : (
                  <div className="bar-chart-container" style={{ marginTop: '24px' }}>
                    {stats.monthly_chart.map((bar, idx) => {
                      const maxVal = Math.max(...stats.monthly_chart.map(b => b.value));
                      const percentHeight = maxVal > 0 ? (bar.value / maxVal) * 100 : 0;
                      return (
                        <div key={bar.label} className="chart-bar-wrapper">
                          <div className={`chart-bar ${idx === stats.monthly_chart.length - 1 ? 'highlighted' : ''}`} style={{ height: `${percentHeight}%` }}>
                            <span className="chart-bar-tooltip">₹{bar.value.toLocaleString('en-IN')}</span>
                          </div>
                          <span className="chart-bar-label">{bar.label.split(' ')[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dues status breakdown donut */}
              <div className="nivas-card">
                <h3 className="card-label">Outstanding Dues</h3>
                <div className="donut-layout" style={{ flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
                  <div className="donut-chart-svg" style={{ backgroundImage: conicGradientStyle, borderRadius: '50%' }}>
                    <div className="donut-inner-text">
                      <div className="donut-inner-num">₹{(stats.pending_dues.total).toLocaleString('en-IN')}</div>
                      <div className="donut-inner-label">Pending</div>
                    </div>
                  </div>
                  <div className="donut-legend" style={{ width: '100%' }}>
                    <div className="legend-item">
                      <span className="legend-color-label"><span className="legend-dot overdue" /> Overdue Dues</span>
                      <span className="legend-value">₹{duesCats.overdue.sum.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color-label"><span className="legend-dot partial" /> Partial Payments</span>
                      <span className="legend-value">₹{duesCats.partial.sum.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 2. FLATS / UNITS REGISTER VIEW */}
        {activeScreen === 'flats' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="card-label">Flats Directory Registry</h3>
              <span style={{ fontSize: '13px', color: 'var(--text-light)', fontWeight: '600' }}>Showing {filteredFlats.length} flats</span>
            </div>

            {filteredFlats.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-light)' }}>
                No flats match search query.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                {filteredFlats.map((flat) => (
                  <div key={flat.flat_no} className="nivas-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>Flat {flat.flat_no}</span>
                      <span className={`badge ${flat.occupancy_status === 'Occupied' ? 'status-inprogress' : 'priority-low'}`}>
                        {flat.occupancy_status}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-light)', textTransform: 'uppercase', display: 'block', fontWeight: '600' }}>Owner Name</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>{flat.owner_name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '4px' }}>
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--text-light)', textTransform: 'uppercase', display: 'block', fontWeight: '600' }}>Dues Status</span>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: flat.maintenance_dues > 0 ? 'var(--danger)' : 'var(--success)' }}>
                          {flat.maintenance_dues > 0 ? `₹${flat.maintenance_dues.toLocaleString('en-IN')}` : 'Cleared'}
                        </span>
                      </div>
                      {flat.maintenance_dues > 0 && (
                        <button 
                          type="button" 
                          className="submit-btn" 
                          style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px' }}
                          onClick={() => handleSendReminder(flat.flat_no, flat.owner_name, flat.maintenance_dues)}
                        >
                          Remind
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* 3. MAINTENANCE COLLECTION LEDGER VIEW */}
        {activeScreen === 'maintenance' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="card-label">Maintenance Payment Collections Logs</h3>
              <button 
                type="button" 
                className="submit-btn" 
                style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px' }}
                onClick={() => setShowRecordModal(true)}
              >
                Collect Manual Payment
              </button>
            </div>
            
            <div className="nivas-card" style={{ padding: '24px' }}>
              {filteredPayments.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-light)' }}>
                  No payment logs found.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-color)', color: 'var(--text-sub)' }}>
                      <th style={{ padding: '12px 10px' }}>Flat</th>
                      <th style={{ padding: '12px 10px' }}>Resident</th>
                      <th style={{ padding: '12px 10px' }}>Amount</th>
                      <th style={{ padding: '12px 10px' }}>Method</th>
                      <th style={{ padding: '12px 10px' }}>Reference No</th>
                      <th style={{ padding: '12px 10px' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map(p => (
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

        {/* 4. COMPLAINTS LIST VIEW */}
        {activeScreen === 'complaints' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <h3 className="card-label" style={{ marginBottom: '20px' }}>Active Facility Repair Tickets</h3>
            {complaints.length === 0 ? (
              <div className="nivas-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-light)' }}>
                No active complaints filed.
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
                      <span className="complaint-date">Filed by {c.resident_name} (Flat {c.resident_email.split('@')[0].toUpperCase()})</span>
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
                        style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px' }}
                        onClick={() => {
                          setSelectedComplaint(c);
                          setStatusVal(c.status);
                          setPriorityVal(c.priority);
                          setActionNote('');
                          setShowComplaintModal(true);
                        }}
                      >
                        Update status
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* 5. SYSTEM SETTINGS PANEL */}
        {activeScreen === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="nivas-card" style={{ padding: '32px' }}>
              <h3 className="card-label" style={{ marginBottom: '24px' }}>Configure Society Rules</h3>
              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="setting-overdue">Overdue Complaint limit (Days)</label>
                  <input
                    id="setting-overdue"
                    type="number"
                    className="form-input"
                    value={overdueThreshold}
                    onChange={(e) => setOverdueThreshold(parseInt(e.target.value, 10))}
                    required
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                    Tickets unresolved after this limit will trigger overdue warnings.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="setting-rate">Monthly Maintenance Rate (₹)</label>
                  <input
                    id="setting-rate"
                    type="number"
                    className="form-input"
                    value={flatRate}
                    onChange={(e) => setFlatRate(parseInt(e.target.value, 10))}
                    required
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                    Base monthly levy charged to occupied units.
                  </span>
                </div>

                <button type="submit" className="submit-btn" style={{ padding: '12px 24px', borderRadius: '12px', alignSelf: 'flex-start' }} disabled={settingsSaving}>
                  {settingsSaving ? 'Saving Configurations...' : 'Save Settings'}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* 6. HELP & DOCUMENTATION PANEL */}
        {activeScreen === 'help' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="nivas-card" style={{ padding: '32px' }}>
              <h3 className="card-label" style={{ marginBottom: '20px' }}>Society Maintenance Administration Manual</h3>
              <div style={{ color: 'var(--text-sub)', fontSize: '14px', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Info size={16} style={{ color: 'var(--primary)' }} /> Overdue Ticket Banners
                  </h4>
                  <p style={{ marginTop: '4px' }}>Complaints remaining open longer than the overdue configurations (default: 3 days) are flagged with the warning overdue badge and auto-pinned to the top of list filters.</p>
                </div>
                <div>
                  <h4 style={{ fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={16} style={{ color: 'var(--primary)' }} /> Simulated Notifications
                  </h4>
                  <p style={{ marginTop: '4px' }}>When you click "Remind Dues" or post notices, simulated emails are dispatched to resident mail routes and logged in the Email Logs console.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 7. SYSTEM EMAIL LOGS CONSOLE */}
        {activeScreen === 'logs' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="nivas-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="card-label">System Notification Logs</h3>
                <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={loadEmailLogs}>Refresh</button>
              </div>

              {logsLoading ? (
                <p style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Retrieving mail records...</p>
              ) : emailLogs.length === 0 ? (
                <p style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>No email notifications sent yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {emailLogs.map(log => (
                    <div key={log.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-light)' }}>
                        <span>To: <strong>{log.recipient}</strong></span>
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <h4 style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-main)', margin: '6px 0' }}>{log.subject}</h4>
                      <div 
                        dangerouslySetInnerHTML={{ __html: log.body }} 
                        style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: 'var(--text-sub)', overflowX: 'auto' }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>

      {/* COLUMN 3: RIGHT SIDEBAR (Only visible in Dashboard tab) */}
      {activeScreen === 'dashboard' && (
        <aside className="right-sidebar">
          <h3 className="right-sidebar-title">Recent Payments</h3>
          {latestPayment ? (
            <div className="visual-payment-card" style={{ 
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-blue) 100%)',
              boxShadow: '0 8px 24px rgba(79, 70, 229, 0.15)',
              borderRadius: 'var(--radius-sm)'
            }}>
              <span className="visual-card-logo"><CheckCircle size={18} /></span>
              <div className="visual-card-flat">Flat {latestPayment.flat_no}</div>
              <div className="visual-card-ref">REF: {latestPayment.ref_no}</div>
              <div className="visual-card-footer">
                <span className="visual-card-name">{latestPayment.resident_name}</span>
                <span className="visual-card-amount">₹{latestPayment.amount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px', backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '12px', fontSize: '13px', color: 'var(--text-light)', textAlign: 'center', marginBottom: '24px' }}>
              No recent payments recorded.
            </div>
          )}

          {/* Send Dues Reminder Card */}
          <h3 className="right-sidebar-title" style={{ marginTop: '20px' }}>Send Dues Reminder</h3>
          <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
            <form onSubmit={handleSendCustomReminder} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-light)', letterSpacing: '0.03em' }} htmlFor="reminder-resident">Select Resident</label>
                <select
                  id="reminder-resident"
                  className="form-select"
                  style={{ fontSize: '12px', padding: '7px 10px', borderRadius: '8px' }}
                  value={selectedReminderFlat}
                  onChange={(e) => setSelectedReminderFlat(e.target.value)}
                  required
                >
                  <option value="">-- Choose Flat --</option>
                  {flatsList.filter(f => f.maintenance_dues > 0).map(f => (
                    <option key={f.flat_no} value={f.flat_no}>
                      Flat {f.flat_no} &bull; {f.owner_name} (₹{f.maintenance_dues})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-light)', letterSpacing: '0.03em' }} htmlFor="reminder-type">Reminder Type</label>
                <select
                  id="reminder-type"
                  className="form-select"
                  style={{ fontSize: '12px', padding: '7px 10px', borderRadius: '8px' }}
                  value={reminderType}
                  onChange={(e) => setReminderType(e.target.value)}
                >
                  <option value="Email">Email Notification</option>
                  <option value="SMS">SMS Message</option>
                  <option value="WhatsApp">WhatsApp Alert</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-light)', letterSpacing: '0.03em' }} htmlFor="reminder-msg">Note (Optional)</label>
                <textarea
                  id="reminder-msg"
                  className="form-input"
                  placeholder="e.g. Please clear dues soon..."
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  style={{ minHeight: '52px', resize: 'vertical', fontSize: '12px', borderRadius: '8px', padding: '7px 10px' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: 'transparent',
                  color: 'var(--primary)',
                  border: '1.5px solid var(--primary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginTop: '2px'
                }}
                disabled={reminderSending}
                onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'var(--primary)'; (e.target as HTMLButtonElement).style.color = '#fff'; }}
                onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'transparent'; (e.target as HTMLButtonElement).style.color = 'var(--primary)'; }}
              >
                {reminderSending ? 'Sending...' : 'Send Reminder'}
              </button>
            </form>
          </div>

          <h3 className="right-sidebar-title" style={{ marginTop: '24px' }}>Recent Transactions</h3>
          <div className="sidebar-tx-list">
            {payments.slice(0, 4).map(pay => (
              <div key={pay.id} className="sidebar-tx-item" style={{ borderBottom: '1px solid #f1f5f9', borderRadius: '0', padding: '12px 6px' }}>
                <div className="tx-icon-details">
                  <div className="tx-avatar-icon" style={{ backgroundColor: 'var(--primary-glow)', color: 'var(--primary)' }}>
                    {pay.resident_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="tx-flat-name">Flat {pay.flat_no}</div>
                    <div className="tx-time">{new Date(pay.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="tx-amount" style={{ color: 'var(--success)' }}>₹{pay.amount.toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* TOAST ALERTS */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--text-main)', border: '1px solid var(--primary)', color: '#fff', padding: '12px 24px', borderRadius: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 300, fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={16} style={{ color: 'var(--success)' }} /> {toastMessage}
        </div>
      )}

      {/* COMPLAINT MODIFICATIONS MODAL */}
      {showComplaintModal && selectedComplaint && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Update Status &mdash; Ticket #{selectedComplaint.id}</h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowComplaintModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleUpdateComplaint}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">Status Level</label>
                    <select className="form-select" value={statusVal} onChange={(e) => setStatusVal(e.target.value as any)}>
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved (Close Ticket)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-select" value={priorityVal} onChange={(e) => setPriorityVal(e.target.value as any)}>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Resolution Comment</label>
                  <textarea className="form-input" style={{ minHeight: '80px' }} value={actionNote} onChange={(e) => setActionNote(e.target.value)} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowComplaintModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={actionLoading}>{actionLoading ? 'Saving...' : 'Apply status'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {showRecordModal && (
        <div className="modal-backdrop" style={{ zIndex: 250 }}>
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Record Manual Collection</h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowRecordModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" htmlFor="record-flat">Flat / Unit Number</label>
                  <input
                    id="record-flat"
                    type="text"
                    className="form-input"
                    placeholder="e.g. A-102"
                    value={manualFlat}
                    onChange={(e) => setManualFlat(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" htmlFor="record-name">Resident Name</label>
                  <input
                    id="record-name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. David Miller"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="record-amount">Amount (₹)</label>
                    <input
                      id="record-amount"
                      type="number"
                      className="form-input"
                      placeholder="e.g. 1500"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="record-method">Method</label>
                    <select
                      id="record-method"
                      className="form-select"
                      value={manualMethod}
                      onChange={(e) => setManualMethod(e.target.value)}
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowRecordModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={paymentRecording}>
                  {paymentRecording ? 'Recording...' : 'Log Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POST NOTICE MODAL */}
      {showNoticeModal && (
        <div className="modal-backdrop" style={{ zIndex: 250 }}>
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Post New Announcement</h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowNoticeModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handlePostNotice}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" htmlFor="notice-title">Announcement Title</label>
                  <input
                    id="notice-title"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Annual General Body Meeting"
                    value={noticeTitle}
                    onChange={(e) => setNoticeTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" htmlFor="notice-content">Description Details</label>
                  <textarea
                    id="notice-content"
                    className="form-input"
                    placeholder="Provide details about the announcement..."
                    value={noticeContent}
                    onChange={(e) => setNoticeContent(e.target.value)}
                    style={{ minHeight: '120px' }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                  <input
                    id="notice-important"
                    type="checkbox"
                    checked={noticeIsImportant}
                    onChange={(e) => setNoticeIsImportant(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  <label htmlFor="notice-important" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-sub)', cursor: 'pointer' }}>
                    Mark as Important Notice (Dispatches Email Alerts)
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowNoticeModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={noticeLoading}>
                  {noticeLoading ? 'Posting...' : 'Post Notice'}
                </button>
              </div>
            </form>
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
