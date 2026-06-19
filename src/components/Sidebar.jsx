import React, { useState } from 'react'
import { Mail, Edit, Inbox, Send, Star, Trash2, MoreHorizontal, Bell, Settings, Users, Shield, Wallet } from 'lucide-react'

function Sidebar({ onCompose, onShowKnoccRequests, onShowInbox, onShowSettings, currentView, onShowWallet, onNavigate }) {
  const [showMore, setShowMore] = useState(false)

  return (
    <div className="w-56 bg-white flex flex-col">
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
        <button
          onClick={onShowInbox}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-sm ${
            currentView === 'inbox' 
              ? 'bg-blue-50 text-blue-600' 
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Inbox</span>
          {currentView === 'inbox' && <span className="ml-auto text-xs">5</span>}
        </button>

        <button
          onClick={onShowKnoccRequests}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-sm ${
            currentView === 'knocc-requests' 
              ? 'bg-blue-50 text-blue-600' 
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Knocc Requests</span>
          {currentView === 'knocc-requests' && <span className="ml-auto text-xs">2</span>}
        </button>

        {/* More Section */}
        <button
          onClick={() => setShowMore(!showMore)}
          className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors text-sm"
        >
          <MoreHorizontal className="w-4 h-4" />
          <span>More</span>
        </button>

        {showMore && (
          <div className="space-y-1 pl-3">
            <button
              onClick={onShowWallet}
              className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors text-sm"
            >
              <Wallet className="w-4 h-4" />
              <span>Wallet</span>
            </button>
            <button
              onClick={() => onNavigate('sent')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-sm ${
                currentView === 'sent'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Sent</span>
            </button>
            <button
              onClick={() => onNavigate('starred')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-sm ${
                currentView === 'starred'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Star className="w-4 h-4" />
              <span>Starred</span>
            </button>
            <button
              onClick={() => onNavigate('bin')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-sm ${
                currentView === 'bin'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Bin</span>
            </button>
            <button
              onClick={() => onNavigate('contacts')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-sm ${
                currentView === 'contacts'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Approved Contacts</span>
            </button>
            <button
              onClick={() => onNavigate('blocked')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-sm ${
                currentView === 'blocked'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Blocked Users</span>
            </button>
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
