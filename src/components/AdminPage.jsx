import React, { useState, useEffect, useCallback } from 'react'
import {
  LayoutDashboard, Users, DollarSign, Settings, ShieldAlert,
  LogOut, RefreshCw, ChevronRight, CheckCircle, XCircle, Clock,
  Smartphone, CreditCard, Zap, Search,
} from 'lucide-react'
import { authAPI } from '../services/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const adminFetch = async (path, options = {}) => {
  const token = localStorage.getItem('adminToken')
  const res = await fetch(`${API_URL}/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

// ── Login screen ──────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await authAPI.login(email, password)
      if (!res.user?.isAdmin) throw new Error('Not an admin account')
      localStorage.setItem('adminToken', res.token)
      onLogin(res.user)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm shadow-2xl border border-gray-800">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Pmail Admin</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to your admin account</p>
        </div>
        {error && <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-sm text-red-400">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="admin@pryro.com"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg font-medium text-sm transition-colors">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = { blue: 'bg-blue-600', green: 'bg-green-600', purple: 'bg-purple-600', yellow: 'bg-yellow-500' }
  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
      <div className={`w-8 h-8 ${colors[color]} rounded-lg mb-3`} />
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminFetch('/earnings/stats').then(setStats).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-gray-400 text-sm p-6">Loading...</div>
  if (!stats) return null

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-white">Platform Overview</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="All-time fees" value={`$${(stats.allTime?.fees || 0).toFixed(2)}`} color="green" />
        <StatCard label="This month" value={`$${(stats.thisMonth?.fees || 0).toFixed(2)}`} color="blue" />
        <StatCard label="Today" value={`$${(stats.today?.fees || 0).toFixed(2)}`} color="purple" />
        <StatCard label="Total transactions" value={stats.allTime?.count || 0} color="yellow" />
      </div>
    </div>
  )
}

// ── Earnings tab ──────────────────────────────────────────────────────────────
function EarningsTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    adminFetch('/earnings?limit=100').then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="text-gray-400 text-sm p-6">Loading...</div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Earnings</h2>
        <button onClick={load} className="p-2 hover:bg-gray-700 rounded-lg"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
      </div>

      {/* By source */}
      {data?.summary?.bySource?.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {data.summary.bySource.map(s => (
            <div key={s.source} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <p className="text-xs text-gray-400 mb-1">{s.source}</p>
              <p className="text-xl font-bold text-white">${(s.fees || 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500">{s.count} transactions</p>
            </div>
          ))}
        </div>
      )}

      {/* Earnings table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">User</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Source</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Deposit</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Fee</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {(data?.earnings || []).map(e => (
              <tr key={e.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="px-4 py-3 text-gray-300">{e.user?.name || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    e.source === 'MOMO' ? 'bg-yellow-900/50 text-yellow-400' :
                    e.source === 'STRIPE' ? 'bg-blue-900/50 text-blue-400' :
                    'bg-purple-900/50 text-purple-400'}`}>{e.source}</span>
                </td>
                <td className="px-4 py-3 text-right text-gray-300">${e.depositAmount.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-green-400 font-medium">+${e.feeAmount.toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(e.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {!data?.earnings?.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No earnings yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Users tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const [data, setData] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback((q = '') => {
    setLoading(true)
    adminFetch(`/users?limit=100${q ? `&search=${encodeURIComponent(q)}` : ''}`)
      .then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Users</h2>
        <div className="flex items-center gap-2 flex-1 max-w-xs bg-gray-800 border border-gray-700 rounded-lg px-3">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input value={search} onChange={e => { setSearch(e.target.value); load(e.target.value) }}
            placeholder="Search name or email..."
            className="flex-1 bg-transparent py-2 text-sm text-white focus:outline-none" />
        </div>
        <button onClick={() => load(search)} className="p-2 hover:bg-gray-700 rounded-lg"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
      </div>

      {loading ? <div className="text-gray-400 text-sm">Loading...</div> : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Country</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Balance</th>
                <th className="text-center px-4 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {(data?.users || []).map(u => (
                <tr key={u.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-white font-medium flex items-center gap-2">
                    {u.name}
                    {u.isAdmin && <span className="text-xs bg-blue-900/50 text-blue-400 px-1.5 py-0.5 rounded">admin</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{u.email}</td>
                  <td className="px-4 py-3 text-gray-400">{u.country || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-300">${(u.walletBalance || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    {u.verified
                      ? <CheckCircle className="w-4 h-4 text-green-400 mx-auto" />
                      : <Clock className="w-4 h-4 text-gray-500 mx-auto" />}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {!data?.users?.length && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No users found</td></tr>
              )}
            </tbody>
          </table>
          {data?.pagination && (
            <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-500">
              {data.pagination.total} total users
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Settings tab ──────────────────────────────────────────────────────────────
function SettingsTab() {
  const [gateway, setGateway] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    adminFetch('/settings').then(r => setGateway(r.settings.activeGateway)).catch(console.error)
  }, [])

  const save = async (gw) => {
    setSaving(true); setSaved(false)
    try {
      await adminFetch('/settings', { method: 'PUT', body: JSON.stringify({ activeGateway: gw }) })
      setGateway(gw); setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const gateways = [
    { id: 'MOMO', label: 'MTN MoMo', sub: 'Mobile Money', Icon: Smartphone, color: 'yellow' },
    { id: 'STRIPE', label: 'Stripe', sub: 'Card payments', Icon: CreditCard, color: 'blue' },
    { id: 'LIGHTNING', label: 'Lightning', sub: 'Bitcoin', Icon: Zap, color: 'purple' },
  ]

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-white">Platform Settings</h2>

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h3 className="text-sm font-medium text-white mb-1">Active Payment Gateway</h3>
        <p className="text-xs text-gray-400 mb-4">Only the selected gateway will be shown to users in the wallet.</p>
        <div className="grid grid-cols-3 gap-3">
          {gateways.map(({ id, label, sub, Icon, color }) => {
            const active = gateway === id
            const ring = { yellow: 'ring-yellow-500 bg-yellow-900/20', blue: 'ring-blue-500 bg-blue-900/20', purple: 'ring-purple-500 bg-purple-900/20' }
            const iconColor = { yellow: 'text-yellow-400', blue: 'text-blue-400', purple: 'text-purple-400' }
            return (
              <button key={id} onClick={() => save(id)} disabled={saving}
                className={`p-4 rounded-xl border-2 transition-all text-left ${active ? `ring-2 ${ring[color]} border-transparent` : 'border-gray-700 hover:border-gray-500'}`}>
                <Icon className={`w-6 h-6 mb-2 ${active ? iconColor[color] : 'text-gray-500'}`} />
                <p className={`text-sm font-medium ${active ? 'text-white' : 'text-gray-400'}`}>{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
                {active && <div className="mt-2 flex items-center gap-1 text-xs text-green-400"><CheckCircle className="w-3 h-3" /> Active</div>}
              </button>
            )
          })}
        </div>
        {saved && <p className="text-xs text-green-400 mt-3 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Saved</p>}
      </div>
    </div>
  )
}

// ── Bot Detection tab ─────────────────────────────────────────────────────────
function BotTab() {
  const [data, setData] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      adminFetch('/entropy?limit=50'),
      adminFetch('/entropy/stats'),
    ]).then(([d, s]) => { setData(d); setStats(s) })
      .catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const label = async (id, lbl) => {
    await adminFetch(`/entropy/${id}/label`, { method: 'PATCH', body: JSON.stringify({ label: lbl }) })
    load()
  }

  const verdictColor = { HUMAN: 'text-green-400', BOT: 'text-red-400', UNCERTAIN: 'text-yellow-400' }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Bot Detection</h2>
        <button onClick={load} className="p-2 hover:bg-gray-700 rounded-lg"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
      </div>

      {stats && !stats.message && (
        <div className="grid grid-cols-4 gap-3">
          {[
            ['Reviewed', stats.totalLabeled, 'blue'],
            ['False Positives', `${stats.historical?.falsePositiveRate}%`, 'yellow'],
            ['False Negatives', `${stats.historical?.falseNegativeRate}%`, 'red'],
            ['Precision', stats.historical?.precision != null ? `${stats.historical.precision}%` : '—', 'green'],
          ].map(([label, val, color]) => (
            <div key={label} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className={`text-xl font-bold text-${color}-400`}>{val}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? <div className="text-gray-400 text-sm">Loading...</div> : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Username</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">IP</th>
                <th className="text-center px-4 py-3 text-gray-400 font-medium">Score</th>
                <th className="text-center px-4 py-3 text-gray-400 font-medium">Verdict</th>
                <th className="text-center px-4 py-3 text-gray-400 font-medium">Label</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {(data?.records || []).map(r => (
                <tr key={r.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-gray-300 font-mono text-xs">{r.username || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.ip}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{r.score}</td>
                  <td className={`px-4 py-3 text-center font-medium text-xs ${verdictColor[r.verdict] || 'text-gray-400'}`}>{r.verdict}</td>
                  <td className="px-4 py-3 text-center">
                    {r.manualLabel ? (
                      <span className={`text-xs font-medium ${r.manualLabel === 'HUMAN' ? 'text-green-400' : 'text-red-400'}`}>{r.manualLabel}</span>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => label(r.id, 'HUMAN')} className="text-xs px-2 py-0.5 bg-green-900/40 text-green-400 rounded hover:bg-green-900/70">Human</button>
                        <button onClick={() => label(r.id, 'BOT')} className="text-xs px-2 py-0.5 bg-red-900/40 text-red-400 rounded hover:bg-red-900/70">Bot</button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {!data?.records?.length && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No signup records yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main Admin Dashboard ──────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',  label: 'Overview',       Icon: LayoutDashboard },
  { id: 'earnings',  label: 'Earnings',        Icon: DollarSign },
  { id: 'users',     label: 'Users',           Icon: Users },
  { id: 'settings',  label: 'Settings',        Icon: Settings },
  { id: 'bots',      label: 'Bot Detection',   Icon: ShieldAlert },
]

function AdminDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('overview')

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <div className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Pmail Admin</p>
              <p className="text-xs text-gray-500 truncate">{user.name}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                tab === id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {tab === id && <ChevronRight className="w-3 h-3 ml-auto" />}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-800">
          <button onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'earnings' && <EarningsTab />}
        {tab === 'users'    && <UsersTab />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'bots'     && <BotTab />}
      </div>
    </div>
  )
}

// ── Entry point ───────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [adminUser, setAdminUser] = useState(() => {
    const token = localStorage.getItem('adminToken')
    const stored = localStorage.getItem('adminUser')
    if (token && stored) {
      try { return JSON.parse(stored) } catch { return null }
    }
    return null
  })

  const handleLogin = (user) => {
    localStorage.setItem('adminUser', JSON.stringify(user))
    setAdminUser(user)
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    setAdminUser(null)
  }

  if (!adminUser) return <AdminLogin onLogin={handleLogin} />
  return <AdminDashboard user={adminUser} onLogout={handleLogout} />
}
