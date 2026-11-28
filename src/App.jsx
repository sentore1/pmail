import React, { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import EmailList from './components/EmailList'
import EmailDetail from './components/EmailDetail'
import ComposeModal from './components/ComposeModal'
import KnoccRequestModal from './components/KnoccRequestModal'
import SettingsModal from './components/SettingsModal'
import WalletModal from './components/WalletModal'
import LoginPage from './components/LoginPage'
import InviteFriendsModal from './components/InviteFriendsModal'
import BentoDashboard from './components/BentoDashboard'
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
  const [showInvite, setShowInvite] = useState(false)
  const [currentView, setCurrentView] = useState('dashboard')
  const [inboxView, setInboxView] = useState('inbox')
  const [knoccFilter, setKnoccFilter] = useState('all')
  const [globalSearch, setGlobalSearch] = useState('')

  // ── Auth check on mount ────────────────────────────────────────────────────
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

  // ── Load data when view / filter changes ───────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return
    loadData()
    // Keep draft badge fresh on every view change
    if (currentView !== 'drafts') {
      emailAPI.getDrafts().then((r) => setDraftEmails(r.drafts || [])).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentView, inboxView, knoccFilter])

  // ── Data fetcher ───────────────────────────────────────────────────────────
  const loadData = async () => {
    try {
      if (currentView === 'knocc-requests') {
        const response = await knoccAPI.getRequests(knoccFilter)
        setRequests(response.requests || [])
        return
      }

      // Always keep knocc badge count fresh in background
      knoccAPI.getRequests('all').then(r => setRequests(r.requests || [])).catch(() => {})

      if (currentView === 'inbox') {
        if (inboxView === 'inbox') {
          const response = await emailAPI.getInbox()
          setEmails(response.emails || [])
        } else if (inboxView === 'sent') {
          const response = await emailAPI.getSentEmails()
          setSentEmails(response.emails || [])
        }
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

  const handleRefresh = async () => {
    await loadData()
  }

  const handleDeleteEmails = async (ids) => {
    try {
      if (currentView === 'drafts') {
        await Promise.allSettled(ids.map((id) => emailAPI.deleteDraft(id)))
      } else if (currentView === 'bin') {
        await Promise.allSettled(ids.map((id) => emailAPI.permanentlyDeleteEmail(id)))
      } else {
        await Promise.allSettled(ids.map((id) => emailAPI.deleteEmail(id)))
      }
      if (selectedEmail && ids.includes(selectedEmail.id)) {
        setSelectedEmail(null)
      }
      loadData()
    } catch (error) {
      console.error('Failed to delete emails:', error)
    }
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

  const unreadCount = emails.filter((e) => e.isRead === false).length
  const knoccRequestCount = requests.filter((r) => r.status === 'PENDING').length
  const draftCount = draftEmails.length

  return (
    <div className="flex h-screen" style={{ background: '#f6f8fc' }}>

      {/* Sidebar — full height on the left */}
      <Sidebar
        onCompose={() => setShowCompose(true)}
        onShowKnoccRequests={() => {
          setCurrentView('knocc-requests')
          setInboxView('all')
          setSelectedEmail(null)
        }}
        onShowInbox={() => {
          setCurrentView('dashboard')
          setInboxView('inbox')
          setSelectedEmail(null)
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
        user={user}
        onLogout={handleLogout}
      />

      {/* Right side: TopBar on top, then EmailList + EmailDetail below */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar — only over the right two columns */}
        <TopBar
          user={user}
          onCompose={() => setShowCompose(true)}
          onShowSettings={() => setShowSettings(true)}
          onLogout={handleLogout}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
        />

        {/* Email list + detail */}
        <div className="flex flex-1 overflow-hidden">
          {currentView === 'dashboard' && (
            <BentoDashboard
              user={user}
              emails={emails}
              requests={requests}
              onCompose={() => setShowCompose(true)}
              onNavigate={(view) => { setCurrentView(view); setSelectedEmail(null) }}
              onShowKnoccRequests={() => { setCurrentView('knocc-requests'); setInboxView('all'); setSelectedEmail(null) }}
              onShowWallet={() => setShowWallet(true)}
              onSelectEmail={(email) => { setCurrentView('inbox'); setInboxView('inbox'); setSelectedEmail(email) }}
            />
          )}
          {currentView !== 'dashboard' && <EmailList
            emails={getDisplayEmails()}
            selectedEmail={selectedEmail}
            onSelectEmail={(email) => {
              if (currentView === 'drafts') {
                setComposeDraft(email)
                setComposeReplyTo(null)
                setComposeForwardOf(null)
                setShowCompose(true)
              } else {
                setSelectedEmail(email)
                // Mark all thread emails as read
                const threadEmails = email._thread || [email]
                const unreadItems = threadEmails.filter(t => t.isRead === false)
                if (unreadItems.length > 0) {
                  const threadIds = new Set(threadEmails.map(t => t.id))
                  setEmails(prev => prev.map(e =>
                    threadIds.has(e.id) ? { ...e, isRead: true } : e
                  ))
                  unreadItems.forEach(t => emailAPI.markAsRead(t.id).catch(() => {}))
                }
              }
            }}
            viewType={currentView}
            effectiveView={currentView === 'inbox' ? inboxView : currentView}
            onViewChange={(view) => {
              if (currentView === 'knocc-requests') {
                setKnoccFilter(view)
              } else {
                setInboxView(view)
              }
              setSelectedEmail(null)
            }}
            onDeleteEmails={handleDeleteEmails}
            onRefresh={handleRefresh}
            searchQuery={globalSearch}
          />}

          {currentView !== 'dashboard' && <EmailDetail
            email={selectedEmail}
            viewType={currentView}
            onClose={() => setSelectedEmail(null)}
            onRefresh={handleRefresh}
            onApproved={(sender) => {
              setCurrentView('inbox')
              setInboxView('inbox')
              setSelectedEmail(null)
              setComposeReplyTo({
                senderId: sender.id,
                senderEmail: sender.email,
                senderName: sender.name,
                subject: '',
                body: '',
                date: '',
              })
              setComposeForwardOf(null)
              setComposeDraft(null)
              setShowCompose(true)
            }}
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
          />}
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
        <KnoccRequestModal onClose={() => setShowKnoccRequest(false)} />
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
          onShowInvite={() => {
            setShowSettings(false)
            setShowInvite(true)
          }}
        />
      )}

      {showWallet && (
        <WalletModal onClose={() => setShowWallet(false)} user={user} />
      )}

      {showInvite && (
        <InviteFriendsModal onClose={() => setShowInvite(false)} />
      )}
    </div>
  )
}

export default App
