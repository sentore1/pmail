import React, { useState } from 'react'
import { Mail, Edit, Inbox, Send, Star, Trash2, MoreHorizontal, Bell, Settings, Users, Shield, Wallet, FileText } from 'lucide-react'

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
}) {
  const [showMore, setShowMore] = useState(false)

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
        {/* Inbox */}
        {navBtn('inbox', Inbox, 'Inbox', unreadCount, onShowInbox)}

        {/* Knocc Requests */}
        {navBtn('knocc-requests', Bell, 'Knocc Requests', knoccRequestCount, onShowKnoccRequests)}

        {/* More Section */}
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
    </div>
  )
}

export default Sidebar
