import React, { useState } from 'react'
import { Mail, Edit, Inbox, Send, Star, Trash2, MoreHorizontal, Bell, Settings, Users, Shield, Wallet, FileText, LogOut } from 'lucide-react'

function Sidebar({
  onCompose,
  onShowKnoccRequests,
  onShowInbox,
  onShowSettings,
  currentView,
  onShowWallet,
  onNavigate,
  unreadCount = 0,
  knoccRequestCount = 0,
  draftCount = 0,
  user,
  onLogout,
}) {
  const [showMore, setShowMore] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const navBtn = (view, icon, label, badge, onClick) => {
    const Icon = icon
    const active = currentView === view
    return (
      <button
        onClick={onClick || (() => onNavigate(view))}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-sm ${
          active ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span>{label}</span>
        {badge > 0 && (
          <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full font-medium ${
            active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {badge}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="w-56 bg-white flex flex-col border-r border-gray-100">
      {/* Logo */}
      <div className="p-5 flex items-center gap-2">
        <Mail className="w-5 h-5 text-blue-600" />
        <span className="text-lg font-medium text-gray-900">Pmail</span>
      </div>

      {/* Write Button */}
      <div className="px-3 mb-4">
        <button
          onClick={onCompose}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl transition-colors text-sm font-medium"
        >
          <Edit className="w-4 h-4" />
          Write
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto space-y-1">
        {navBtn('inbox', Inbox, 'Inbox', unreadCount, onShowInbox)}
        {navBtn('knocc-requests', Bell, 'Knocc Requests', knoccRequestCount, onShowKnoccRequests)}

        <button
          onClick={() => setShowMore(!showMore)}
          className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors text-sm"
        >
          <MoreHorizontal className="w-4 h-4" />
          <span>More</span>
          <svg
            className={`w-3.5 h-3.5 ml-auto transition-transform text-gray-400 ${showMore ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showMore && (
          <div className="space-y-1 pl-2">
            <button
              onClick={onShowWallet}
              className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors text-sm"
            >
              <Wallet className="w-4 h-4" />
              <span>Wallet</span>
            </button>
            {navBtn('sent', Send, 'Sent')}
            {navBtn('drafts', FileText, 'Drafts', draftCount)}
            {navBtn('starred', Star, 'Starred')}
            {navBtn('bin', Trash2, 'Bin')}
            {navBtn('contacts', Users, 'Approved Contacts')}
            {navBtn('blocked', Shield, 'Blocked Users')}
            <button
              onClick={onShowSettings}
              className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors text-sm"
            >
              <Settings className="w-4 h-4" />
              <span>Knocc Settings</span>
            </button>
          </div>
        )}
      </nav>

      {/* Profile — bottom of sidebar */}
      <div className="px-3 pb-3 pt-2 border-t border-gray-100 relative">
        {/* Popup menu — opens upward */}
        {showProfileMenu && (
          <div className="absolute bottom-full left-3 right-3 mb-1.5 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
            </div>
            <button
              onClick={() => { setShowProfileMenu(false); onShowSettings() }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
            <div className="border-t border-gray-100 my-0.5" />
            <button
              onClick={() => { setShowProfileMenu(false); onLogout() }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        )}

        <button
          onClick={() => setShowProfileMenu((v) => !v)}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
            <p className="text-[10px] text-gray-500 truncate">{user?.email || ''}</p>
          </div>
        </button>
      </div>
    </div>
  )
}

export default Sidebar
