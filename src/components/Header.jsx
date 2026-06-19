import React from 'react'
import { LogOut, Settings } from 'lucide-react'

function Header({ user, onLogout, onShowSettings }) {
  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-end px-6">
      <div className="relative group">
        {/* Profile Avatar */}
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold cursor-pointer hover:bg-blue-700 transition-colors">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>

        {/* Hover Dropdown */}
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-500 mt-0.5">{user?.email || ''}</p>
          </div>
          
          <button
            onClick={onShowSettings}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>

          <div className="border-t border-gray-100 my-1"></div>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

export default Header
