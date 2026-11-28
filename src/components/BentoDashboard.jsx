import React, { useEffect, useState } from 'react'
import { Inbox, Bell, Wallet, Users, Edit3, Send, Star, ArrowRight, Clock, TrendingUp, Mail } from 'lucide-react'
import { walletAPI, userAPI, knoccAPI } from '../services/api'

const avatarPalette = ['bg-blue-500','bg-purple-500','bg-green-500','bg-orange-500','bg-pink-500','bg-teal-500','bg-indigo-500','bg-rose-500']
const getAvatarColor = (name = '') => {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return avatarPalette[Math.abs(h) % avatarPalette.length]
}
const getInitials = (name = '') => {
  const p = name.trim().split(' ')
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : (name[0] || '?').toUpperCase()
}

export default function BentoDashboard({ user, emails, requests, onCompose, onNavigate, onShowKnoccRequests, onShowWallet, onSelectEmail }) {
  const [balance, setBalance] = useState(null)
  const [contacts, setContacts] = useState([])

  useEffect(() => {
    walletAPI.getBalance().then(r => setBalance(r.balance ?? r.walletBalance ?? 0)).catch(() => {})
    userAPI.getContacts().then(r => setContacts(r.contacts || [])).catch(() => {})
  }, [])

  const unread = emails.filter(e => e.isRead === false)
  const pendingKnocc = requests.filter(r => r.status === 'PENDING')
  const recentEmails = [...emails].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt)).slice(0, 5)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ background: '#f6f8fc' }}>
      {/* Greeting */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#202124]">{greeting}, {user?.name?.split(' ')[0] || 'there'} 👋</h1>
        <p className="text-sm text-[#707782] mt-0.5">Here's what's happening in your inbox</p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-3 auto-rows-auto">

        {/* Unread — small stat */}
        <div
          onClick={() => onNavigate('inbox')}
          className="col-span-3 bg-blue-600 rounded-2xl p-4 cursor-pointer hover:bg-blue-700 transition-colors flex flex-col justify-between min-h-[110px]"
        >
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <Inbox className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{unread.length}</p>
            <p className="text-xs text-blue-100 mt-0.5">Unread emails</p>
          </div>
        </div>

        {/* Knocc Requests — small stat */}
        <div
          onClick={onShowKnoccRequests}
          className="col-span-3 bg-purple-600 rounded-2xl p-4 cursor-pointer hover:bg-purple-700 transition-colors flex flex-col justify-between min-h-[110px]"
        >
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{pendingKnocc.length}</p>
            <p className="text-xs text-purple-100 mt-0.5">Knocc requests</p>
          </div>
        </div>

        {/* Wallet — small stat */}
        <div
          onClick={onShowWallet}
          className="col-span-3 bg-emerald-600 rounded-2xl p-4 cursor-pointer hover:bg-emerald-700 transition-colors flex flex-col justify-between min-h-[110px]"
        >
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-3xl font-bold text-white">
              {balance === null ? '—' : `$${Number(balance).toFixed(2)}`}
            </p>
            <p className="text-xs text-emerald-100 mt-0.5">Wallet balance</p>
          </div>
        </div>

        {/* Contacts — small stat */}
        <div
          onClick={() => onNavigate('contacts')}
          className="col-span-3 bg-orange-500 rounded-2xl p-4 cursor-pointer hover:bg-orange-600 transition-colors flex flex-col justify-between min-h-[110px]"
        >
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{contacts.length}</p>
            <p className="text-xs text-orange-100 mt-0.5">Contacts</p>
          </div>
        </div>

        {/* Recent Emails — tall wide card */}
        <div className="col-span-8 bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#707782]" />
              <span className="text-sm font-semibold text-[#202124]">Recent Emails</span>
            </div>
            <button
              onClick={() => onNavigate('inbox')}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {recentEmails.length === 0 ? (
              <p className="text-sm text-[#707782] text-center py-8">No emails yet</p>
            ) : recentEmails.map(email => {
              const senderName = email.sender?.name || (typeof email.sender === 'string' ? email.sender : 'Unknown')
              const preview = (email.body || '').replace(/<[^>]+>/g, '').slice(0, 60)
              const isUnread = email.isRead === false
              return (
                <div
                  key={email.id}
                  onClick={() => onSelectEmail(email)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9FAFB] cursor-pointer transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${getAvatarColor(senderName)}`}>
                    {getInitials(senderName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm truncate ${isUnread ? 'font-bold text-[#202124]' : 'font-medium text-[#202124]'}`}>
                        {senderName}
                      </span>
                      <span className="text-xs text-[#707782] flex-shrink-0 ml-2">
                        {email.sentAt ? new Date(email.sentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${isUnread ? 'font-semibold text-[#202124]' : 'text-[#707782]'}`}>
                      {email.subject || '(No subject)'}
                    </p>
                    <p className="text-xs text-[#9CA3AF] truncate">{preview}</p>
                  </div>
                  {isUnread && <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-span-4 bg-white rounded-2xl border border-[#E5E7EB] p-4 flex flex-col gap-2">
          <p className="text-sm font-semibold text-[#202124] mb-1">Quick Actions</p>
          {[
            { icon: Edit3, label: 'Compose Email', color: 'text-blue-600 bg-blue-50', action: onCompose },
            { icon: Inbox, label: 'Go to Inbox', color: 'text-purple-600 bg-purple-50', action: () => onNavigate('inbox') },
            { icon: Send, label: 'Sent Emails', color: 'text-emerald-600 bg-emerald-50', action: () => onNavigate('sent') },
            { icon: Star, label: 'Starred', color: 'text-orange-500 bg-orange-50', action: () => onNavigate('starred') },
            { icon: Bell, label: 'Knocc Requests', color: 'text-pink-600 bg-pink-50', action: onShowKnoccRequests },
            { icon: Wallet, label: 'Wallet', color: 'text-teal-600 bg-teal-50', action: onShowWallet },
          ].map(({ icon: Icon, label, color, action }) => (
            <button
              key={label}
              onClick={action}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#F5F7FA] transition-colors text-left w-full"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm text-[#202124] font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Pending Knocc Requests */}
        <div className="col-span-6 bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#707782]" />
              <span className="text-sm font-semibold text-[#202124]">Pending Knocc Requests</span>
            </div>
            <button onClick={onShowKnoccRequests} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {pendingKnocc.length === 0 ? (
              <p className="text-sm text-[#707782] text-center py-6">No pending requests</p>
            ) : pendingKnocc.slice(0, 3).map(req => {
              const name = req.sender?.name || (typeof req.sender === 'string' ? req.sender : 'Unknown')
              return (
                <div key={req.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${getAvatarColor(name)}`}>
                    {getInitials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#202124] truncate">{name}</p>
                    <p className="text-xs text-[#707782] truncate">{req.reason || 'No reason provided'}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Clock className="w-3 h-3 text-amber-500" />
                    <span className="text-xs text-amber-600 font-semibold">Pending</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Contacts */}
        <div className="col-span-6 bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#707782]" />
              <span className="text-sm font-semibold text-[#202124]">Recent Contacts</span>
            </div>
            <button onClick={() => onNavigate('contacts')} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {contacts.length === 0 ? (
              <p className="text-sm text-[#707782] text-center py-6">No contacts yet</p>
            ) : contacts.slice(0, 3).map(c => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${getAvatarColor(c.name || c.email)}`}>
                  {getInitials(c.name || c.email || '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#202124] truncate">{c.name || 'Unknown'}</p>
                  <p className="text-xs text-[#707782] truncate">{c.email}</p>
                </div>
                {c.verified && <span className="text-xs text-blue-600 font-semibold flex-shrink-0">✓</span>}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
