import React, { useState, useMemo } from 'react'
import { Search, Filter, Bell, Clock, DollarSign, Trash2, X } from 'lucide-react'

// Normalize a subject to a thread key by stripping Re:/Fwd: prefixes
const threadKey = (subject = '') =>
  subject.replace(/^(re|fwd|fw):\s*/gi, '').trim().toLowerCase()

function EmailList({ emails, selectedEmail, onSelectEmail, viewType, effectiveView, onViewChange, onDeleteEmails }) {
  const isRequestView = viewType === 'knocc-requests'
  const [inboxTab, setInboxTab] = useState('inbox')
  const [knoccTab, setKnoccTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())

  const handleTabChange = (tab) => {
    setInboxTab(tab)
    setSelectedIds(new Set())
    if (onViewChange) onViewChange(tab)
  }
  const handleKnoccTabChange = (tab) => {
    setKnoccTab(tab)
    setSelectedIds(new Set())
  }

  const unreadCount = useMemo(() =>
    !isRequestView ? emails.filter((e) => e.isRead === false).length : 0,
    [emails, isRequestView]
  )

  // Filter by search
  const filteredEmails = useMemo(() => {
    let list = emails
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((e) =>
        (e.subject || '').toLowerCase().includes(q) ||
        (e.sender?.name || e.sender || '').toLowerCase().includes(q) ||
        (e.sender?.email || e.email || '').toLowerCase().includes(q) ||
        (e.reason || '').toLowerCase().includes(q)
      )
    }
    if (isRequestView && knoccTab !== 'all') {
      list = list.filter((e) =>
        knoccTab === 'paid' ? e.paymentType?.toLowerCase() === 'paid' : e.paymentType?.toLowerCase() === 'pryro'
      )
    }
    return list
  }, [emails, searchQuery, isRequestView, knoccTab])

  // Thread grouping — only for email views (not contacts/blocked/knocc)
  const isEmailView = viewType !== 'contacts' && viewType !== 'blocked' && !isRequestView
  const threads = useMemo(() => {
    if (!isEmailView) return filteredEmails

    // Group by normalized subject key
    const map = new Map() // key → [emails sorted oldest→newest]
    filteredEmails.forEach((email) => {
      const key = threadKey(email.subject)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(email)
    })

    // Each thread entry: latest email as representative + full thread list
    return Array.from(map.values())
      .map((group) => {
        // Sort oldest→newest within the group
        const sorted = [...group].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
        const latest = sorted[sorted.length - 1]
        return {
          ...latest,              // use latest email's fields for the list row
          _thread: sorted,        // full thread (oldest first)
          _threadCount: sorted.length,
          _hasUnread: sorted.some((e) => e.isRead === false),
        }
      })
      // Sort threads by latest message date descending
      .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
  }, [filteredEmails, isEmailView])

  // Checkboxes operate on thread representatives (latest email id)
  const allSelected = threads.length > 0 && threads.every((e) => selectedIds.has(e.id))
  const someSelected = selectedIds.size > 0

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(threads.map((e) => e.id)))
    }
  }

  const toggleSelect = (e, id) => {
    e.stopPropagation()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDeleteSelected = () => {
    if (onDeleteEmails && selectedIds.size > 0) {
      // Delete all emails in each selected thread
      const allIds = threads
        .filter((t) => selectedIds.has(t.id))
        .flatMap((t) => t._thread?.map((e) => e.id) || [t.id])
      onDeleteEmails(allIds)
      setSelectedIds(new Set())
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  // Avatar helpers
  const getInitials = (name) => {
    if (!name || name === 'Unknown') return '?'
    const parts = name.trim().split(' ')
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name[0].toUpperCase()
  }
  const avatarColors = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500',
    'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
  ]
  const getAvatarColor = (name) => {
    if (!name) return avatarColors[0]
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return avatarColors[Math.abs(hash) % avatarColors.length]
  }

  // Determine if a thread/email is "selected" in the detail pane
  const isActive = (item) => {
    if (!selectedEmail) return false
    // Match by thread — any email in the thread matches
    if (item._thread) return item._thread.some((e) => e.id === selectedEmail.id || selectedEmail.id === item.id)
    return selectedEmail.id === item.id
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search emails"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {!isRequestView ? (
              <>
                <button
                  onClick={() => handleTabChange('inbox')}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    inboxTab === 'inbox' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Inbox
                  {inboxTab === 'inbox' && unreadCount > 0 && (
                    <span className="ml-1.5 text-xs bg-blue-600 text-white rounded-full px-1.5 py-0.5">{unreadCount}</span>
                  )}
                </button>
                <button
                  onClick={() => handleTabChange('sent')}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    inboxTab === 'sent' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Sent
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <h2 className="text-lg font-medium text-gray-900">Knocc Requests</h2>
                <div className="flex items-center gap-1">
                  {[['pryro','purple'],['paid','green'],['all','blue']].map(([tab, color]) => (
                    <button key={tab} onClick={() => handleKnoccTabChange(tab)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-colors flex items-center gap-1 ${
                        knoccTab === tab ? `bg-${color}-50 text-${color}-600` : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {tab !== 'all' && (
                        <div className={`w-3.5 h-3.5 bg-${color}-500 rounded-full flex items-center justify-center`}>
                          <DollarSign className="w-2 h-2 text-white" strokeWidth={3} />
                        </div>
                      )}
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {!isRequestView && (
            <button className="p-1.5 hover:bg-gray-50 rounded-xl transition-colors">
              <Filter className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Bulk action toolbar */}
      {isEmailView && someSelected && (
        <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={clearSelection} className="p-1 hover:bg-blue-100 rounded-lg transition-colors">
              <X className="w-3.5 h-3.5 text-blue-600" />
            </button>
            <span className="text-xs font-medium text-blue-700">{selectedIds.size} selected</span>
          </div>
          <button onClick={handleDeleteSelected}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}

      {/* Select-all row */}
      {isEmailView && threads.length > 0 && (
        <div className="px-3 py-1.5 border-b border-gray-50 flex items-center gap-2">
          <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
            className="w-2.5 h-2.5 rounded border-gray-300 text-blue-600 cursor-pointer accent-blue-600" />
          <span className="text-xs text-gray-400">Select all</span>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">

        {/* Contacts / blocked */}
        {(viewType === 'contacts' || viewType === 'blocked') && (
          filteredEmails.length === 0
            ? <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
                {searchQuery ? 'No results found' : viewType === 'contacts' ? 'No approved contacts' : 'No blocked users'}
              </div>
            : filteredEmails.map((person) => (
              <div key={person.id} onClick={() => onSelectEmail(person)}
                className={`p-3 border-b border-gray-50 cursor-pointer transition-colors ${
                  selectedEmail?.id === person.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getAvatarColor(person.name || person.email)}`}>
                    <span className="text-white text-xs font-semibold">{getInitials(person.name || person.email || '?')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{person.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 truncate">{person.email}</p>
                    {person.country && <p className="text-xs text-gray-400">{person.country}</p>}
                  </div>
                  {viewType === 'blocked' && <span className="text-xs text-red-500 flex-shrink-0">Blocked</span>}
                  {viewType === 'contacts' && person.verified && <span className="text-xs text-blue-500 flex-shrink-0">✓</span>}
                </div>
              </div>
            ))
        )}

        {/* Knocc requests — no threading */}
        {isRequestView && (
          filteredEmails.length === 0
            ? <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
                {searchQuery ? 'No results found' : 'No requests'}
              </div>
            : filteredEmails.map((email) => {
                const senderName = email.sender?.name || (typeof email.sender === 'string' ? email.sender : null) || 'Unknown'
                const senderEmail = email.sender?.email || (typeof email.sender === 'string' ? email.sender : '') || ''
                return (
                  <div key={email.id} onClick={() => onSelectEmail(email)}
                    className={`p-3 border-b border-gray-50 cursor-pointer transition-colors ${
                      selectedEmail?.id === email.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}>
                    <div className="flex items-start gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        email.paymentType?.toLowerCase() === 'pryro' ? 'bg-purple-100' :
                        email.paymentType?.toLowerCase() === 'paid' ? 'bg-green-100' : 'bg-orange-100'
                      }`}>
                        {email.paymentType?.toLowerCase() === 'pryro'
                          ? <DollarSign className="w-3.5 h-3.5 text-purple-600" strokeWidth={2.5} />
                          : email.paymentType?.toLowerCase() === 'paid'
                            ? <DollarSign className="w-3.5 h-3.5 text-green-600" strokeWidth={2.5} />
                            : <Bell className="w-3.5 h-3.5 text-orange-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-medium text-gray-800 truncate">{senderName}</span>
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-1">
                            {email.sentAt ? new Date(email.sentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : email.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 truncate">Reason: {email.reason || ''}</p>
                        <p className="text-xs text-gray-400 truncate">{senderEmail}</p>
                        {email.status?.toLowerCase() === 'pending' && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
        )}

        {/* Email threads */}
        {isEmailView && (
          threads.length === 0
            ? <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
                {searchQuery ? 'No results found' : 'No emails'}
              </div>
            : threads.map((thread) => {
                // For sent emails the sender is "me" — show the recipient name instead
                const firstRecipient = thread.recipients?.find(r => r.type === 'TO')?.recipient
                const isSent = effectiveView === 'sent'
                const displayName = isSent
                  ? (firstRecipient?.name || firstRecipient?.email || 'Unknown')
                  : (thread.sender?.name || (typeof thread.sender === 'string' ? thread.sender : null) || 'Unknown')
                const subjectText = thread.subject || '(No subject)'
                const isUnread = thread._hasUnread
                const previewText = thread.body
                  ? thread.body.replace(/<[^>]+>/g, '').slice(0, 80)
                  : thread.preview || ''
                const isChecked = selectedIds.has(thread.id)
                const count = thread._threadCount || 1
                const isThreaded = count > 1

                return (
                  <div key={thread.id}
                    onClick={() => onSelectEmail(thread)}
                    className={`p-3 border-b border-gray-50 cursor-pointer transition-colors ${
                      isActive(thread) && !someSelected ? 'bg-blue-50' :
                      isChecked ? 'bg-blue-50/60' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {/* Checkbox */}
                      <div className="pt-1 flex-shrink-0" onClick={(e) => toggleSelect(e, thread.id)}>
                        <input type="checkbox" checked={isChecked} onChange={() => {}}
                          className="w-2.5 h-2.5 rounded border-gray-300 text-blue-600 cursor-pointer accent-blue-600" />
                      </div>

                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${getAvatarColor(displayName)}`}>
                        <span className="text-white text-xs font-semibold">{getInitials(displayName)}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {isUnread && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full flex-shrink-0" />}
                            <span className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>
                              {displayName}
                            </span>
                            {/* Thread count badge */}
                            {isThreaded && (
                              <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-gray-700 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                {count}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-1">
                            {thread.sentAt
                              ? new Date(thread.sentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                              : thread.timestamp}
                          </span>
                        </div>
                        <p className={`text-xs mb-0.5 truncate ${isUnread ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                          {subjectText}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{previewText}</p>
                      </div>
                    </div>
                  </div>
                )
              })
        )}
      </div>
    </div>
  )
}

export default EmailList
