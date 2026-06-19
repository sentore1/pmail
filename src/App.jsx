import React, { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import EmailList from './components/EmailList'
import EmailDetail from './components/EmailDetail'
import ComposeModal from './components/ComposeModal'
import KnoccRequestModal from './components/KnoccRequestModal'
import SettingsModal from './components/SettingsModal'
import WalletModal from './components/WalletModal'
import LoginPage from './components/LoginPage'
import { authAPI, emailAPI, knoccAPI, userAPI } from './services/api'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [emails, setEmails] = useState([])
  const [requests, setRequests] = useState([])
  const [sentEmails, setSentEmails] = useState([])
  const [starredEmails, setStarredEmails] = useState([])
  const [binEmails, setBinEmails] = useState([])
  const [draftEmails, setDraftEmails] = useState([])
  const [contacts, setContacts] = useState([])
  const [blockedUsers, setBlockedUsers] = useState([])
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [showCompose, setShowCompose] = useState(false)
  const [composeReplyTo, setComposeReplyTo] = useState(null)
  const [composeForwardOf, setComposeForwardOf] = useState(null)
  const [composeDraft, setComposeDraft] = useState(null)
  const [showKnoccRequest, setShowKnoccRequest] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showWallet, setShowWallet] = useState(false)
  const [currentView, setCurrentView] = useState('inbox')
  const [inboxView, setInboxView] = useState('inbox')
  const [knoccFilter, setKnoccFilter] = useState('all')

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')

      if (token && storedUser) {
        try {
          const response = await authAPI.getMe()
          if (response.user) {
            setUser(response.user)
            setIsAuthenticated(true)
          } else {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
          }
        } catch (error) {
          console.error('Auth check failed:', error)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [])

  // Load emails and requests when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadData()
      // Always keep draft count fresh
      emailAPI.getDrafts().then((r) => setDraftEmails(r.drafts || [])).catch(() => {})
    }
  }, [isAuthenticated, currentView, inboxView, knoccFilter])

  const loadData = async () => {
    try {
      if (currentView === 'inbox') {
        if (inboxView === 'inbox') {
          const response = await emailAPI.getInbox()
          setEmails(response.emails || [])
        } else if (inboxView === 'sent') {
          const response = await emailAPI.getSentEmails()
          setSentEmails(response.emails || [])
        }
      } else if (currentView === 'knocc-requests') {
        const response = await knoccAPI.getRequests(knoccFilter)
        setRequests(response.requests || [])
      } else if (currentView === 'sent') {
        const response = await emailAPI.getSentEmails()
        setSentEmails(response.emails || [])
      } else if (currentView === 'drafts') {
        const response = await emailAPI.getDrafts()
        setDraftEmails(response.drafts || [])
      } else if (currentView === 'starred') {
        const response = await emailAPI.getStarredEmails()
        setStarredEmails(response.emails || [])
      } else if (currentView === 'bin') {
        const response = await emailAPI.getBinEmails()
        setBinEmails(response.emails || [])
      } else if (currentView === 'contacts') {
        const response = await userAPI.getContacts()
        setContacts(response.contacts || [])
      } else if (currentView === 'blocked') {
        const response = await userAPI.getBlockedUsers()
        setBlockedUsers(response.blockedUsers || [])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  const handleLogin = (userData, token) => {
    setUser(userData)
    setIsAuthenticated(true)
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const handleRefresh = () => {
    loadData()
    setSelectedEmail(null)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />
  }

  const getDisplayEmails = () => {
    if (currentView === 'knocc-requests') return requests
    if (currentView === 'sent' || inboxView === 'sent') return sentEmails
    if (currentView === 'starred') return starredEmails
    if (currentView === 'bin') return binEmails
    if (currentView === 'drafts') return draftEmails
    if (currentView === 'contacts') return contacts
    if (currentView === 'blocked') return blockedUsers
    return emails
  }

  // Computed counts for sidebar badges
  const unreadCount = emails.filter((e) => e.isRead === false).length
  const knoccRequestCount = requests.filter((r) => r.status === 'PENDING').length
  const draftCount = draftEmails.length

  return (
    <div className="flex h-screen bg-white">
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          onCompose={() => setShowCompose(true)}
          onShowKnoccRequests={() => {
            setCurrentView('knocc-requests')
            setInboxView('all')
          }}
          onShowInbox={() => {
            setCurrentView('inbox')
            setInboxView('inbox')
          }}
          onShowSettings={() => setShowSettings(true)}
          onShowWallet={() => setShowWallet(true)}
          onNavigate={(view) => {
            setCurrentView(view)
            setSelectedEmail(null)
          }}
          currentView={currentView}
          unreadCount={unreadCount}
          knoccRequestCount={knoccRequestCount}
          draftCount={draftCount}
        />
        
        <div className="flex-1 flex relative">
          {/* Profile Button - Moved from Header */}
          <div className="absolute top-2 right-6 z-50">
            <div className="relative group">
              {/* Profile Avatar */}
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold cursor-pointer hover:bg-blue-700 transition-colors shadow-md">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>

              {/* Hover Dropdown */}
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{user?.email || ''}</p>
                </div>
                
                <button
                  onClick={() => setShowSettings(true)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>

                <div className="border-t border-gray-100 my-1"></div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </div>

          <EmailList 
            emails={getDisplayEmails()}
            selectedEmail={selectedEmail}
            onSelectEmail={(email) => {
              // Drafts open in the compose modal for editing, not in the detail view
              if (currentView === 'drafts') {
                setComposeDraft(email)
                setComposeReplyTo(null)
                setComposeForwardOf(null)
                setShowCompose(true)
              } else {
                setSelectedEmail(email)
              }
            }}
            viewType={currentView}
            onViewChange={(view) => {
              if (currentView === 'knocc-requests') {
                setKnoccFilter(view)
              } else {
                setInboxView(view)
              }
              setSelectedEmail(null)
            }}
          />
          
          <EmailDetail 
            email={selectedEmail}
            viewType={currentView}
            onClose={() => setSelectedEmail(null)}
            onRefresh={handleRefresh}
            onReply={(ctx) => {
              setComposeReplyTo(ctx)
              setComposeForwardOf(null)
              setShowCompose(true)
            }}
            onForward={(ctx) => {
              setComposeForwardOf(ctx)
              setComposeReplyTo(null)
              setShowCompose(true)
            }}
          />
        </div>
      </div>

      {showCompose && (
        <ComposeModal 
          onClose={() => {
            setShowCompose(false)
            setComposeReplyTo(null)
            setComposeForwardOf(null)
            setComposeDraft(null)
            handleRefresh()
          }}
          onSendKnoccRequest={() => {
            setShowCompose(false)
            setComposeReplyTo(null)
            setComposeForwardOf(null)
            setComposeDraft(null)
            setShowKnoccRequest(true)
          }}
          replyTo={composeReplyTo}
          forwardOf={composeForwardOf}
          draft={composeDraft}
        />
      )}

      {showKnoccRequest && (
        <KnoccRequestModal 
          onClose={() => setShowKnoccRequest(false)}
        />
      )}

      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)}
          user={user}
          onLogout={handleLogout}
          onUpdate={(updatedUser) => {
            setUser(updatedUser)
            localStorage.setItem('user', JSON.stringify(updatedUser))
          }}
        />
      )}

      {showWallet && (
        <WalletModal 
          onClose={() => setShowWallet(false)}
          user={user}
        />
      )}
    </div>
  )
}

export default App
