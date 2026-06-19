import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Mail, Users, Send, CheckCircle, XCircle, Loader, AlertCircle,
  Upload, Trash2, RefreshCw, Search, UserCheck, ChevronDown,
} from 'lucide-react';
import { invitationAPI, googleAPI } from '../services/api';

// ── Helpers ──────────────────────────────────────────────────────────────────
const parseContacts = (raw) => {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  const out = [];
  for (const line of lines) {
    const angle = line.match(/^(.+?)\s*<([^\s@]+@[^\s@]+\.[^\s@]+)>/);
    if (angle) { out.push({ name: angle[1].trim(), email: angle[2].trim() }); continue; }
    const parts = line.split(',');
    if (parts.length >= 2) {
      const email = parts[parts.length - 1].trim();
      const name  = parts.slice(0, -1).join(',').trim();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { out.push({ name, email }); continue; }
    }
    const e = line.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) out.push({ name: '', email: e });
  }
  return out;
};

const statusBadge = (status) => {
  const cls = {
    PENDING:   'bg-yellow-100 text-yellow-800',
    ACCEPTED:  'bg-green-100 text-green-800',
    EXPIRED:   'bg-gray-100 text-gray-500',
    CANCELLED: 'bg-red-100 text-red-700',
  }[status] || 'bg-gray-100 text-gray-500';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>;
};

function InviteFriendsModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('google');

  // ── Google import state ───────────────────────────────────────────────────
  const [googleContacts, setGoogleContacts]   = useState([]);   // all fetched
  const [filteredGC, setFilteredGC]           = useState([]);   // after search
  const [selectedEmails, setSelectedEmails]   = useState(new Set());
  const [gcSearch, setGcSearch]               = useState('');
  const [googleStatus, setGoogleStatus]       = useState('idle'); // idle|connecting|done|error
  const [googleError, setGoogleError]         = useState('');
  const popupRef = useRef(null);

  // ── Manual tab ────────────────────────────────────────────────────────────
  const [manualEmail, setManualEmail] = useState('');
  const [manualName,  setManualName]  = useState('');

  // ── CSV import tab ────────────────────────────────────────────────────────
  const [csvText, setCsvText]               = useState('');
  const [csvContacts, setCsvContacts]       = useState([]);
  const [csvSelected, setCsvSelected]       = useState(new Set());
  const fileInputRef = useRef(null);

  // ── History tab ───────────────────────────────────────────────────────────
  const [invitations, setInvitations]         = useState([]);
  const [stats, setStats]                     = useState(null);
  const [historyLoading, setHistoryLoading]   = useState(false);

  // ── Shared ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => { loadHistory(); }, []);

  // Filter Google contacts by search
  useEffect(() => {
    const q = gcSearch.toLowerCase();
    setFilteredGC(
      q ? googleContacts.filter(c =>
        c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
      ) : googleContacts
    );
  }, [gcSearch, googleContacts]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const [invRes, statRes] = await Promise.all([
        invitationAPI.getSentInvitations(),
        invitationAPI.getInvitationStats(),
      ]);
      setInvitations(invRes.invitations || []);
      setStats(statRes.stats || null);
    } catch { /* silent */ }
    finally { setHistoryLoading(false); }
  };

  // ── Google OAuth popup ────────────────────────────────────────────────────
  const handleGoogleImport = useCallback(async () => {
    setGoogleStatus('connecting');
    setGoogleError('');
    setMessage(null);

    try {
      const { authUrl } = await googleAPI.getAuthUrl();
      if (!authUrl) throw new Error('Could not generate Google auth URL');

      // Open popup
      const w = 520, h = 680;
      const left = Math.round(window.screenX + (window.outerWidth  - w) / 2);
      const top  = Math.round(window.screenY + (window.outerHeight - h) / 2);
      popupRef.current = window.open(
        authUrl, 'google_oauth',
        `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`
      );

      if (!popupRef.current) {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }
    } catch (err) {
      setGoogleStatus('error');
      setGoogleError(err.message);
    }
  }, []);

  // Listen for postMessage from the OAuth callback page
  useEffect(() => {
    const handler = (event) => {
      // Only accept messages from our own origin
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.success === true && Array.isArray(data.contacts)) {
        setGoogleContacts(data.contacts);
        setSelectedEmails(new Set(data.contacts.map(c => c.email)));
        setGoogleStatus('done');
        setMessage({ type: 'success', text: `Imported ${data.contacts.length} contacts from Google.` });
      } else if (data.success === false) {
        setGoogleStatus('error');
        setGoogleError(data.error || 'Google import failed');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Poll popup close — if user closes manually before completing
  useEffect(() => {
    if (googleStatus !== 'connecting') return;
    const timer = setInterval(() => {
      if (popupRef.current?.closed) {
        clearInterval(timer);
        if (googleStatus === 'connecting') {
          setGoogleStatus('idle');
        }
      }
    }, 800);
    return () => clearInterval(timer);
  }, [googleStatus]);

  // ── Google contacts selection ─────────────────────────────────────────────
  const toggleGC = (email) => {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      next.has(email) ? next.delete(email) : next.add(email);
      return next;
    });
  };
  const toggleAllGC = () => {
    setSelectedEmails(
      selectedEmails.size === filteredGC.length
        ? new Set()
        : new Set(filteredGC.map(c => c.email))
    );
  };

  const handleSendGoogle = async () => {
    const toSend = googleContacts.filter(c => selectedEmails.has(c.email));
    if (!toSend.length) { setMessage({ type: 'error', text: 'Select at least one contact' }); return; }
    setLoading(true); setMessage(null);
    try {
      const res = await invitationAPI.sendBulkInvitations(toSend);
      const s = res.summary;
      setMessage({ type: 'success', text: `Sent: ${s.successful} · Already on Pmail: ${s.alreadyExists} · Already invited: ${s.alreadyInvited}${s.failed ? ` · Failed: ${s.failed}` : ''}` });
      loadHistory();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to send' });
    } finally { setLoading(false); }
  };

  // Save contacts to our system (creates invitation records so the algorithm
  // knows about these people and can message / target them later)
  const handleSaveToSystem = async () => {
    const toSave = googleContacts.filter(c => selectedEmails.has(c.email));
    if (!toSave.length) { setMessage({ type: 'error', text: 'Select at least one contact' }); return; }
    setLoading(true); setMessage(null);
    try {
      const res = await invitationAPI.sendBulkInvitations(toSave);
      const s = res.summary;
      setMessage({
        type: 'success',
        text: `Saved ${s.successful} new contact${s.successful !== 1 ? 's' : ''} to system.` +
              (s.alreadyExists ? ` ${s.alreadyExists} already on Pmail.` : '') +
              (s.alreadyInvited ? ` ${s.alreadyInvited} already saved.` : ''),
      });
      loadHistory();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save' });
    } finally { setLoading(false); }
  };

  // ── Manual send ───────────────────────────────────────────────────────────
  const handleManualSend = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage(null);
    try {
      await invitationAPI.sendInvitation(manualEmail.trim(), manualName.trim() || undefined);
      setMessage({ type: 'success', text: `Invitation sent to ${manualEmail}` });
      setManualEmail(''); setManualName('');
      loadHistory();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to send' });
    } finally { setLoading(false); }
  };

  // ── CSV ───────────────────────────────────────────────────────────────────
  const parseCsv = () => {
    const contacts = parseContacts(csvText);
    setCsvContacts(contacts);
    setCsvSelected(new Set(contacts.map(c => c.email)));
    if (!contacts.length) setMessage({ type: 'error', text: 'No valid emails found.' });
    else setMessage(null);
  };
  const handleCsvFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText(ev.target.result);
      const contacts = parseContacts(ev.target.result);
      setCsvContacts(contacts);
      setCsvSelected(new Set(contacts.map(c => c.email)));
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  const toggleCsv = (email) => {
    setCsvSelected(prev => { const next = new Set(prev); next.has(email) ? next.delete(email) : next.add(email); return next; });
  };
  const handleSendCsv = async () => {
    const toSend = csvContacts.filter(c => csvSelected.has(c.email));
    if (!toSend.length) { setMessage({ type: 'error', text: 'Select at least one contact' }); return; }
    setLoading(true); setMessage(null);
    try {
      const res = await invitationAPI.sendBulkInvitations(toSend);
      const s = res.summary;
      setMessage({ type: 'success', text: `Sent: ${s.successful} · Exists: ${s.alreadyExists} · Already invited: ${s.alreadyInvited}` });
      loadHistory();
    } catch (err) { setMessage({ type: 'error', text: err.message || 'Failed' }); }
    finally { setLoading(false); }
  };

  // ── History actions ───────────────────────────────────────────────────────
  const handleResend = async (id) => {
    try { await invitationAPI.resendInvitation(id); setMessage({ type: 'success', text: 'Resent' }); loadHistory(); }
    catch (err) { setMessage({ type: 'error', text: err.message }); }
  };
  const handleCancel = async (id) => {
    try { await invitationAPI.cancelInvitation(id); setMessage({ type: 'success', text: 'Cancelled' }); loadHistory(); }
    catch (err) { setMessage({ type: 'error', text: err.message }); }
  };

  const tabCls = (t) => `px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
    activeTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
  }`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Invite Friends to Pmail</h2>
            {stats && <p className="text-xs text-gray-400 mt-0.5">{stats.total} sent · {stats.accepted} accepted · {stats.pending} pending</p>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mx-5 mt-3 p-3 rounded-lg flex items-start gap-2 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5 overflow-x-auto">
          <button onClick={() => setActiveTab('google')}  className={tabCls('google')}>
            <svg className="w-4 h-4 inline mr-1.5 -mt-0.5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Import from Google
          </button>
          <button onClick={() => setActiveTab('manual')} className={tabCls('manual')}>
            <Mail className="w-4 h-4 inline mr-1.5 -mt-0.5" />Manual
          </button>
          <button onClick={() => setActiveTab('csv')}    className={tabCls('csv')}>
            <Upload className="w-4 h-4 inline mr-1.5 -mt-0.5" />CSV / Paste
          </button>
          <button onClick={() => { setActiveTab('history'); loadHistory(); }} className={tabCls('history')}>
            <Users className="w-4 h-4 inline mr-1.5 -mt-0.5" />History
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── Google Import ── */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              {googleStatus === 'idle' && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-50 border-2 border-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Import your Google Contacts</h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">Connect your Google account to import all your contacts and send them invitations to join Pmail.</p>
                  <button onClick={handleGoogleImport}
                    className="inline-flex items-center gap-2.5 px-6 py-2.5 bg-white border-2 border-gray-200 hover:border-blue-400 rounded-xl text-sm font-medium text-gray-700 hover:text-blue-600 transition-all shadow-sm">
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Sign in with Google
                  </button>
                  <p className="mt-4 text-xs text-gray-400">We only read your contacts. We never post or modify anything.</p>
                </div>
              )}

              {googleStatus === 'connecting' && (
                <div className="text-center py-12">
                  <Loader className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                  <p className="text-sm text-gray-600 font-medium">Waiting for Google authorization…</p>
                  <p className="text-xs text-gray-400 mt-1">Complete the sign-in in the popup window</p>
                </div>
              )}

              {googleStatus === 'error' && (
                <div className="text-center py-8">
                  <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <XCircle className="w-7 h-7 text-red-500" />
                  </div>
                  <p className="text-sm text-red-600 font-medium mb-1">{googleError}</p>
                  <p className="text-xs text-gray-500 mb-4">Make sure popups are allowed for this site.</p>
                  <button onClick={() => { setGoogleStatus('idle'); setGoogleError(''); }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Try Again</button>
                </div>
              )}

              {googleStatus === 'done' && googleContacts.length > 0 && (
                <div className="space-y-3">
                  {/* Search + select all */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" value={gcSearch} onChange={e => setGcSearch(e.target.value)}
                        placeholder="Search contacts…"
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <button onClick={toggleAllGC} className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap px-2">
                      {selectedEmails.size === filteredGC.length ? 'Deselect all' : 'Select all'}
                    </button>
                    <button onClick={() => { setGoogleStatus('idle'); setGoogleContacts([]); setSelectedEmails(new Set()); }}
                      className="p-2 hover:bg-gray-100 rounded-lg" title="Re-import">
                      <RefreshCw className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>

                  {/* Contact count */}
                  <p className="text-xs text-gray-500">
                    {filteredGC.length} contact{filteredGC.length !== 1 ? 's' : ''} · {selectedEmails.size} selected
                  </p>

                  {/* List */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {filteredGC.map((c) => (
                      <label key={c.email} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                        <input type="checkbox" checked={selectedEmails.has(c.email)} onChange={() => toggleGC(c.email)}
                          className="w-4 h-4 text-blue-600 rounded flex-shrink-0" />
                        {c.photo
                          ? <img src={c.photo} alt={c.name} className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
                          : <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 text-sm font-medium">
                              {(c.name || c.email)[0].toUpperCase()}
                            </div>
                        }
                        <div className="min-w-0 flex-1">
                          {c.name && <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>}
                          <p className="text-xs text-gray-500 truncate">{c.email}</p>
                        </div>
                        {selectedEmails.has(c.email) && <UserCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                      </label>
                    ))}
                  </div>

                  {/* Send button */}
                  <div className="flex gap-2">
                    <button onClick={handleSendGoogle} disabled={loading || selectedEmails.size === 0}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-medium transition-colors">
                      {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {loading ? 'Sending…' : `Invite ${selectedEmails.size} contact${selectedEmails.size !== 1 ? 's' : ''}`}
                    </button>
                    <button onClick={handleSaveToSystem} disabled={loading || selectedEmails.size === 0}
                      title="Save contacts to our system so the algorithm can reach them later"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-blue-600 hover:bg-blue-50 disabled:border-blue-300 disabled:text-blue-300 text-blue-600 rounded-xl text-sm font-medium transition-colors">
                      <UserCheck className="w-4 h-4" />
                      Save
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 text-center">
                    "Invite" sends an email invitation · "Save" registers them in our system for the algorithm
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Manual ── */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSend} className="max-w-md space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                <input type="email" value={manualEmail} onChange={e => setManualEmail(e.target.value)} required
                  placeholder="friend@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name (optional)</label>
                <input type="text" value={manualName} onChange={e => setManualName(e.target.value)}
                  placeholder="Friend's name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
              </div>
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium">
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? 'Sending…' : 'Send Invitation'}
              </button>
            </form>
          )}

          {/* ── CSV ── */}
          {activeTab === 'csv' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">One email per line, or CSV: <code className="bg-gray-100 px-1 rounded text-xs">Name,email</code> or <code className="bg-gray-100 px-1 rounded text-xs">Name &lt;email&gt;</code></p>
              <textarea value={csvText} onChange={e => setCsvText(e.target.value)} rows={5}
                placeholder={"john@example.com\nJane Doe,jane@example.com"}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <div className="flex gap-2">
                <button onClick={parseCsv}
                  className="px-4 py-1.5 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900">Parse</button>
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-4 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
                  <Upload className="w-3.5 h-3.5" /> Upload CSV
                </button>
                <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleCsvFile} className="hidden" />
                {csvContacts.length > 0 && (
                  <button onClick={() => { setCsvText(''); setCsvContacts([]); setCsvSelected(new Set()); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm">
                    <Trash2 className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
              </div>
              {csvContacts.length > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">{csvContacts.length} contacts · {csvSelected.size} selected</p>
                    <button onClick={() => setCsvSelected(csvSelected.size === csvContacts.length ? new Set() : new Set(csvContacts.map(c => c.email)))}
                      className="text-xs text-blue-600 hover:text-blue-700">
                      {csvSelected.size === csvContacts.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="border border-gray-200 rounded-xl max-h-52 overflow-y-auto">
                    {csvContacts.map(c => (
                      <label key={c.email} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                        <input type="checkbox" checked={csvSelected.has(c.email)} onChange={() => toggleCsv(c.email)} className="w-4 h-4 text-blue-600 rounded" />
                        <div className="min-w-0">
                          {c.name && <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>}
                          <p className="text-xs text-gray-500 truncate">{c.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button onClick={handleSendCsv} disabled={loading || csvSelected.size === 0}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-medium">
                    {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {loading ? 'Sending…' : `Invite ${csvSelected.size} contact${csvSelected.size !== 1 ? 's' : ''}`}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── History ── */}
          {activeTab === 'history' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">Sent Invitations</p>
                <button onClick={loadHistory} className="p-1 hover:bg-gray-100 rounded-md" title="Refresh">
                  <RefreshCw className={`w-4 h-4 text-gray-500 ${historyLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {invitations.length === 0 ? (
                <div className="text-center py-10">
                  <Mail className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No invitations sent yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {invitations.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        {inv.name && <p className="text-sm font-medium text-gray-900 truncate">{inv.name}</p>}
                        <p className="text-xs text-gray-500 truncate">{inv.email}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(inv.sentAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        {statusBadge(inv.status)}
                        {inv.status === 'PENDING' && (
                          <>
                            <button onClick={() => handleResend(inv.id)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Resend</button>
                            <button onClick={() => handleCancel(inv.id)} className="text-xs text-red-500 hover:text-red-600 font-medium">Cancel</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default InviteFriendsModal;
