import React, { useState } from 'react'
import { Edit3, Inbox, Send, Star, Trash2, MoreHorizontal, Bell, Settings, Users, Shield, Wallet, FileText, LogOut, ChevronDown, Menu } from 'lucide-react'

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
  const [collapsed, setCollapsed] = useState(false)

  const navBtn = (view, icon, label, badge, onClick) => {
    const Icon = icon
    const active = currentView === view || (view === 'inbox' && currentView === 'dashboard')
    return (
      <button
        onClick={onClick || (() => onNavigate(view))}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-sm ${
          active
            ? 'bg-[#E2E5EA] text-[#202124] font-semibold'
            : 'text-[#202124] hover:bg-[#E2E5EA]'
        }`}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#202124]' : 'text-[#707782]'}`} />
        <span className="flex-1 text-left">{label}</span>
        {badge > 0 && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
            active ? 'bg-[#2563EB] text-white' : 'bg-[#E2E5EA] text-[#707782]'
          }`}>
            {badge}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="relative flex-shrink-0 flex h-full">
      <div
        className="flex flex-col h-full overflow-hidden transition-all duration-300"
        style={{ width: collapsed ? 52 : 224, background: '#F1F3F6', minWidth: collapsed ? 52 : 224 }}
      >
      {/* Logo + hamburger */}
      <div className="px-3 pt-4 pb-3 flex items-center gap-2">
        <button
          onClick={() => setCollapsed(v => !v)}
          className="p-1 rounded-lg hover:bg-[#E2E5EA] transition-colors flex-shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu className="w-4 h-4 text-[#707782]" />
        </button>
        {!collapsed && (
          <>
            <img src="/pryro logo.png" alt="Pmail" className="h-6 w-auto object-contain" />
            <span className="text-base font-semibold text-gray-800 tracking-tight">Pmail</span>
          </>
        )}
      </div>

      {/* Compose / Write Button */}
      <div className="px-2 mb-3">
        <button
          onClick={onCompose}
          className={`w-full flex items-center bg-white hover:bg-[#F5F7FA] text-[#202124] py-2 rounded-full transition-all text-sm font-medium shadow-sm border border-[#E5E7EB] group ${
            collapsed ? 'justify-center px-2' : 'gap-2.5 px-4'
          }`}
        >
          <Edit3 className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform flex-shrink-0" />
          {!collapsed && <span>Write</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-1.5 overflow-y-auto space-y-0.5 py-1">
        {collapsed ? (
          <>
            <button onClick={onShowInbox} title="Inbox" className={`w-full flex justify-center p-2 rounded-xl transition-all ${ currentView === 'inbox' ? 'bg-[#E2E5EA]' : 'hover:bg-[#E2E5EA]' }`}>
              <Inbox className="w-4 h-4 text-[#707782]" />
            </button>
            <button onClick={onShowKnoccRequests} title="Knocc Requests" className={`w-full flex justify-center p-2 rounded-xl transition-all ${ currentView === 'knocc-requests' ? 'bg-[#E2E5EA]' : 'hover:bg-[#E2E5EA]' }`}>
              <Bell className="w-4 h-4 text-[#707782]" />
            </button>
            <button onClick={() => onNavigate('sent')} title="Sent" className={`w-full flex justify-center p-2 rounded-xl transition-all ${ currentView === 'sent' ? 'bg-[#E2E5EA]' : 'hover:bg-[#E2E5EA]' }`}>
              <Send className="w-4 h-4 text-[#707782]" />
            </button>
            <button onClick={() => onNavigate('starred')} title="Starred" className={`w-full flex justify-center p-2 rounded-xl transition-all ${ currentView === 'starred' ? 'bg-[#E2E5EA]' : 'hover:bg-[#E2E5EA]' }`}>
              <Star className="w-4 h-4 text-[#707782]" />
            </button>
            <button onClick={() => onNavigate('bin')} title="Bin" className={`w-full flex justify-center p-2 rounded-xl transition-all ${ currentView === 'bin' ? 'bg-[#E2E5EA]' : 'hover:bg-[#E2E5EA]' }`}>
              <Trash2 className="w-4 h-4 text-[#707782]" />
            </button>
          </>
        ) : (
          <>
            {navBtn('inbox', Inbox, 'Inbox', unreadCount, onShowInbox)}
            {navBtn('knocc-requests', Bell, 'Knocc Requests', knoccRequestCount, onShowKnoccRequests)}

            {/* More toggle */}
            <button
              onClick={() => setShowMore(!showMore)}
              className="w-full flex items-center gap-3 px-3 py-2 text-[#202124] hover:bg-[#E2E5EA] rounded-xl transition-all text-sm"
            >
              <MoreHorizontal className="w-4 h-4 text-[#707782]" />
              <span className="flex-1 text-left">More</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showMore ? 'rotate-180' : ''}`} />
            </button>

            {showMore && (
              <div className="space-y-0.5 ml-1 pl-2 border-l-2 border-[#E5E7EB]">
                <button
                  onClick={onShowWallet}
                  className="w-full flex items-center gap-3 px-3 py-2 text-[#202124] hover:bg-[#E2E5EA] rounded-xl transition-all text-sm"
                >
                  <Wallet className="w-4 h-4 text-[#707782]" />
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
                  className="w-full flex items-center gap-3 px-3 py-2 text-[#202124] hover:bg-[#E2E5EA] rounded-xl transition-all text-sm"
                >
                  <Settings className="w-4 h-4 text-[#707782]" />
                  <span>Knocc Settings</span>
                </button>
              </div>
            )}
          </>
        )}
      </nav>

      {/* Footer icon bar */}
      <div className="px-1.5 pb-2 pt-1.5 border-t border-gray-300/40 relative">

        {/* Profile popup — opens upward */}
        {showProfileMenu && (
          <div className="absolute bottom-full left-2 right-2 mb-1.5 bg-white rounded-2xl shadow-lg border border-gray-200 py-1 z-50">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-900 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
            </div>
            <button
              onClick={() => { setShowProfileMenu(false); onShowSettings() }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors rounded-lg"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
            <div className="border-t border-gray-100 my-0.5" />
            <button
              onClick={() => { setShowProfileMenu(false); onLogout() }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        )}

        {/* Horizontal icon row */}
        <div className={`flex items-center gap-1.5 ${collapsed ? 'flex-col' : 'px-1'}`}>
          {/* Avatar / profile toggle */}
          <button
            onClick={() => setShowProfileMenu((v) => !v)}
            title={user?.name || 'Profile'}
            className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 hover:bg-blue-700 transition-colors"
          >
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </button>

          <button
            onClick={onShowWallet}
            title="Wallet"
            className="p-1.5 text-[#707782] hover:bg-[#E2E5EA] hover:text-[#202124] rounded-lg transition-all"
          >
            <Wallet className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('contacts')}
            title="Contacts"
            className="p-1.5 text-[#707782] hover:bg-[#E2E5EA] hover:text-[#202124] rounded-lg transition-all"
          >
            <Users className="w-4 h-4" />
          </button>

          <button
            onClick={onShowKnoccRequests}
            title="Knocc Requests"
            className="p-1.5 text-[#707782] hover:bg-[#E2E5EA] hover:text-[#202124] rounded-lg transition-all"
          >
            <Bell className="w-4 h-4" />
          </button>

          <button
            onClick={onShowSettings}
            title="Settings"
            className="p-1.5 text-[#707782] hover:bg-[#E2E5EA] hover:text-[#202124] rounded-lg transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onLogout}
            title="Logout"
            className="p-1.5 text-[#707782] hover:bg-red-100 hover:text-red-600 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

export default Sidebar
