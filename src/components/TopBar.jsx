import React, { useState, useRef, useEffect } from 'react'
import { Search, Edit3, Settings, LogOut, X } from 'lucide-react'

function TopBar({ user, onCompose, onShowSettings, onLogout, searchQuery, onSearchChange }) {
  const [showProfile, setShowProfile] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const inputRef = useRef(null)

  return (
    <div
      className="h-14 flex items-center px-4 gap-3 flex-shrink-0 border-b border-[#E5E7EB]"
      style={{ background: '#ffffff' }}
    >
      {/* Search — pill-shaped, left-aligned, grows on focus */}
      <div className={`flex items-center transition-all duration-200 ${searchFocused ? 'w-80' : 'w-64'}`}>
        <div
          className={`relative w-full flex items-center rounded-full border transition-all ${
            searchFocused
              ? 'bg-white border-blue-400 shadow-md'
              : 'bg-[#F1F3F6] border-transparent hover:bg-[#E8EAED]'
          }`}
        >
          <Search className="absolute left-3.5 w-4 h-4 text-[#707782] pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search in mail"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full pl-10 pr-9 py-2 bg-transparent text-sm text-[#202124] focus:outline-none placeholder-[#707782] rounded-full"
          />
          {searchQuery && (
            <button
              onMouseDown={e => { e.preventDefault(); onSearchChange('') }}
              className="absolute right-3 p-0.5 hover:bg-gray-200 rounded-full"
            >
              <X className="w-3.5 h-3.5 text-[#707782]" />
            </button>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Compose */}
      <button
        onClick={onCompose}
        className="flex items-center gap-2 px-5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-medium rounded-full shadow-sm transition-all"
      >
        <Edit3 className="w-3.5 h-3.5" />
        Compose
      </button>

      {/* Profile avatar */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setShowProfile(v => !v)}
          className="w-9 h-9 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white text-sm font-bold transition-all"
        >
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </button>

        {showProfile && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
            <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-xl border border-[#E5E7EB] py-1 z-50">
              <div className="px-4 py-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#202124] truncate">{user?.name || 'User'}</p>
                    <p className="text-xs text-[#707782] truncate">{user?.email || ''}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setShowProfile(false); onShowSettings() }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#202124] hover:bg-[#F5F7FA] transition-colors"
              >
                <Settings className="w-4 h-4 text-[#707782]" />
                Settings
              </button>
              <div className="border-t border-[#E5E7EB] my-1" />
              <button
                onClick={() => { setShowProfile(false); onLogout() }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default TopBar
