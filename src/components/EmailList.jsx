import React, { useState, useMemo } from 'react'
import { RefreshCw, Filter, Clock, Trash2, X } from 'lucide-react'

const threadKey = (subject = '') =>
  subject.replace(/^(re|fwd|fw):\s*/gi, '').trim().toLowerCase()

function EmailList({
  emails,
  selectedEmail,
  onSelectEmail,
  viewType,
  effectiveView,
  onViewChange,
  onDeleteEmails,
  searchQuery = '',
}) {
  const isRequestView = viewType === 'knocc-requests'
  const [inboxTab, setInboxTab] = useState('inbox')
  const [readFilter, setReadFilter] = useState('all')
  const [knoccTab, setKnoccTab] = useState('all')
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

  const unreadCount = useMemo(
    () => (!isRequestView ? emails.filter((e) => e.isRead === false).length : 0),
    [emails, isRequestView]
  )

  const filteredEmails = useMemo(() => {
    let list = emails
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (e) =>
          (e.subject || '').toLowerCase().includes(q) ||
          (e.sender?.name || e.sender || '').toLowerCase().includes(q) ||
          (e.sender?.email || e.email || '').toLowerCase().includes(q) ||
          (e.reason || '').toLowerCase().includes(q)
      )
    }
    if (isRequestView && knoccTab !== 'all') {
      list = list.filter((e) =>
        knoccTab === 'paid'
          ? e.paymentType?.toLowerCase() === 'paid'
          : e.paymentType?.toLowerCase() === 'pryro'
      )
    }
    return list
  }, [emails, searchQuery, isRequestView, knoccTab])

  const isEmailView = viewType !== 'contacts' && viewType !== 'blocked' && !isRequestView

  const threads = useMemo(() => {
    if (!isEmailView) return filteredEmails
    const map = new Map()
    filteredEmails.forEach((email) => {
      const key = threadKey(email.subject)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(email)
    })
    return Array.from(map.values())
      .map((group) => {
        const sorted = [...group].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
        const latest = sorted[sorted.length - 1]
        return {
          ...latest,
          _thread: sorted,
          _threadCount: sorted.length,
          _hasUnread: sorted.some((e) => e.isRead === false),
        }
      })
      .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
  }, [filteredEmails, isEmailView])

  const visibleThreads = useMemo(() => {
    if (!isEmailView || readFilter === 'all') return threads
    if (readFilter === 'unread') return threads.filter((t) => t._hasUnread)
    return threads.filter((t) => !t._hasUnread)
  }, [threads, readFilter, isEmailView])

  const allSelected =
    visibleThreads.length > 0 && visibleThreads.every((e) => selectedIds.has(e.id))
  const someSelected = selectedIds.size > 0

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(visibleThreads.map((e) => e.id)))
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
      const allIds = visibleThreads
        .filter((t) => selectedIds.has(t.id))
        .flatMap((t) => t._thread?.map((e) => e.id) || [t.id])
      onDeleteEmails(allIds)
      setSelectedIds(new Set())
    }
  }
  const clearSelection = () => setSelectedIds(new Set())

  const getInitials = (name) => {
    if (!name || name === 'Unknown') return '?'
    const parts = name.trim().split(' ')
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name[0].toUpperCase()
  }
  const avatarPalette = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500',
    'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
  ]
  const getAvatarColor = (name) => {
    if (!name) return avatarPalette[0]
    let h = 0
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
    return avatarPalette[Math.abs(h) % avatarPalette.length]
  }
  const isActive = (item) => {
    if (!selectedEmail) return false
    if (item._thread) return item._thread.some((e) => e.id === selectedEmail.id || selectedEmail.id === item.id)
    return selectedEmail.id === item.id
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const getGroupLabel = (sentAt) => {
    if (!sentAt) return 'OLDER'
    const d = new Date(sentAt)
    if (d >= startOfToday) return 'TODAY'
    if (d >= startOfWeek) return 'THIS WEEK'
    if (d >= startOfMonth) return 'THIS MONTH'
    return d.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase()
  }

  return (
    <div className="w-80 flex-shrink-0 flex flex-col bg-white border-r border-[#E5E7EB]">

      {/* ── Tabs header ── */}
      <div className="h-12 flex items-center px-4 border-b border-[#E5E7EB] gap-1">
        {!isRequestView ? (
          <>
            <div className="flex items-stretch h-full flex-1 gap-1">
              {[
                { id: 'inbox', label: 'Inbox', badge: unreadCount },
                { id: 'sent',  label: 'Sent'  },
              ].map(({ id, label, badge }) => {
                const active = inboxTab === id
                return (
                  <button
                    key={id}
                    onClick={() => handleTabChange(id)}
                    className={`flex items-center gap-1.5 px-3 text-sm border-b-2 transition-colors ${
                      active
                        ? 'font-semibold text-[#202124] border-[#2563EB]'
                        : 'font-medium text-[#707782] border-transparent hover:text-[#202124] hover:bg-[#F5F7FA]'
                    }`}
                  >
                    {label}
                    {badge > 0 && (
                      <span className={`text-xs font-bold ${active ? 'text-[#2563EB]' : 'text-[#707782]'}`}>
                        {badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-0.5 ml-auto">
              <button className="p-1.5 hover:bg-[#F5F7FA] rounded-full transition-colors" title="Refresh">
                <RefreshCw className="w-3.5 h-3.5 text-[#707782]" />
              </button>
              <button className="p-1.5 hover:bg-[#F5F7FA] rounded-full transition-colors" title="Filter">
                <Filter className="w-3.5 h-3.5 text-[#707782]" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between w-full">
            <h2 className="text-sm font-semibold text-[#202124]">Knocc Requests</h2>
            <div className="flex items-center gap-1">
              {[['pryro', 'purple'], ['paid', 'green'], ['all', 'blue']].map(([tab]) => (
                <button
                  key={tab}
                  onClick={() => handleKnoccTabChange(tab)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
                    knoccTab === tab ? 'bg-[#2563EB] text-white' : 'text-[#707782] hover:bg-[#F5F7FA]'
                  }`}
                >
                  {tab !== 'all' && (
                    <div className={`w-2 h-2 ${tab === 'pryro' ? 'bg-purple-500' : 'bg-green-500'} rounded-full`} />
                  )}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Filter + select bar ── */}
      {isEmailView && (
        <div className="px-4 py-2 flex items-center gap-2 border-b border-[#E5E7EB]/70 bg-white">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="w-3.5 h-3.5 rounded border-gray-300 accent-[#2563EB] cursor-pointer"
          />
          <div className="flex items-center gap-0.5">
            {['all', 'read', 'unread'].map((f) => (
              <button
                key={f}
                onClick={() => setReadFilter(f)}
                className={`px-2.5 py-0.5 text-xs font-medium rounded-full transition-colors ${
                  readFilter === f
                    ? 'bg-[#2563EB] text-white font-semibold'
                    : 'text-[#707782] hover:bg-[#F5F7FA]'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          {someSelected && (
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-xs text-[#707782]">{selectedIds.size} selected</span>
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1 px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-full transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
              <button onClick={clearSelection} className="p-0.5 hover:bg-[#F5F7FA] rounded-full">
                <X className="w-3 h-3 text-[#707782]" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── List ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Contacts / Blocked */}
        {(viewType === 'contacts' || viewType === 'blocked') && (
          filteredEmails.length === 0 ? (
            <p className="text-sm text-[#707782] text-center py-10">
              {searchQuery ? 'No results found' : viewType === 'contacts' ? 'No approved contacts' : 'No blocked users'}
            </p>
          ) : filteredEmails.map((person) => (
            <div
              key={person.id}
              onClick={() => onSelectEmail(person)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-[#E5E7EB] ${
                selectedEmail?.id === person.id
                  ? 'bg-[#EAF2FF]'
                  : 'hover:bg-[#F5F7FA]'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${getAvatarColor(person.name || person.email)}`}>
                {getInitials(person.name || person.email || '?')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#202124] truncate">{person.name || 'Unknown'}</p>
                <p className="text-xs text-[#707782] truncate">{person.email}</p>
              </div>
              {viewType === 'blocked' && <span className="text-xs text-red-500">Blocked</span>}
              {viewType === 'contacts' && person.verified && <span className="text-xs text-[#2563EB]">✓</span>}
            </div>
          ))
        )}

        {/* Knocc requests */}
        {isRequestView && (
          filteredEmails.length === 0 ? (
            <p className="text-sm text-[#707782] text-center py-10">
              {searchQuery ? 'No results found' : 'No requests'}
            </p>
          ) : filteredEmails.map((email) => {
            const senderName =
              email.sender?.name ||
              (typeof email.sender === 'string' ? email.sender : null) ||
              'Unknown'
            const active = selectedEmail?.id === email.id
            return (
              <div
                key={email.id}
                onClick={() => onSelectEmail(email)}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-[#E5E7EB] ${
                  active ? 'bg-[#EAF2FF]' : 'hover:bg-[#F5F7FA]'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white ${getAvatarColor(senderName)}`}>
                  {getInitials(senderName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-bold text-[#202124] truncate">{senderName}</span>
                    <span className="text-xs text-[#707782] flex-shrink-0 ml-2">
                      {email.sentAt
                        ? new Date(email.sentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : email.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-[#707782] truncate">Reason: {email.reason || ''}</p>
                  {email.status?.toLowerCase() === 'pending' && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold mt-0.5">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}

        {/* Email threads */}
        {isEmailView && (
          visibleThreads.length === 0 ? (
            <p className="text-sm text-[#707782] text-center py-10">
              {searchQuery ? 'No results found' : 'No emails'}
            </p>
          ) : (() => {
            const groupOrder = []
            const groupMap = {}
            visibleThreads.forEach((thread) => {
              const label = getGroupLabel(thread.sentAt)
              if (!groupMap[label]) { groupMap[label] = []; groupOrder.push(label) }
              groupMap[label].push(thread)
            })

            return groupOrder.map((label) => (
              <div key={label}>
                {/* Section label */}
                <div className="px-5 pt-4 pb-1">
                  <span className="text-[10px] font-semibold tracking-widest text-[#707782] uppercase">
                    {label}
                  </span>
                </div>

                {groupMap[label].map((thread) => {
                  const active = isActive(thread)
                  const isSent = effectiveView === 'sent'
                  const firstRecipient = thread.recipients?.find((r) => r.type === 'TO')?.recipient
                  const displayName = isSent
                    ? firstRecipient?.name || firstRecipient?.email || 'Unknown'
                    : thread.sender?.name ||
                      (typeof thread.sender === 'string' ? thread.sender : null) ||
                      'Unknown'
                  const subjectText = thread.subject || '(No subject)'
                  const isUnread = thread._hasUnread
                  const previewText = thread.body
                    ? thread.body.replace(/<[^>]+>/g, '').slice(0, 60)
                    : thread.preview || ''
                  const isChecked = selectedIds.has(thread.id)
                  const count = thread._threadCount || 1

                  return (
                    <div
                      key={thread.id}
                      onClick={() => onSelectEmail(thread)}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all group border-b border-[#E5E7EB] ${
                        active
                          ? 'bg-[#E2E5EA] rounded-r-2xl border-l-2 border-l-[#2563EB]'
                          : isChecked
                          ? 'bg-blue-50/50'
                          : 'hover:bg-[#F5F7FA]'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="flex-shrink-0 w-4" onClick={(e) => toggleSelect(e, thread.id)}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded border-gray-300 accent-[#2563EB] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>

                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${getAvatarColor(displayName)}`}>
                        {getInitials(displayName)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Row 1: name + date */}
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                            <span className={`text-sm truncate ${isUnread ? 'font-bold text-[#202124]' : 'font-medium text-[#202124]'}`}>
                              {displayName}
                            </span>
                            {count > 1 && (
                              <span className="flex-shrink-0 text-xs font-semibold text-[#707782]">{count}</span>
                            )}
                          </div>
                          <span className={`text-xs flex-shrink-0 whitespace-nowrap ${isUnread ? 'font-semibold text-[#202124]' : 'text-[#707782]'}`}>
                            {thread.sentAt
                              ? new Date(thread.sentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                              : thread.timestamp}
                          </span>
                        </div>
                        {/* Row 2: subject + unread dot */}
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {isUnread && (
                            <div className="w-1.5 h-1.5 bg-[#2563EB] rounded-full flex-shrink-0" />
                          )}
                          <p className={`text-xs truncate ${isUnread ? 'font-semibold text-[#202124]' : 'text-[#202124]'}`}>
                            {subjectText}
                          </p>
                          {thread.inboundRequest?.status === 'PAID' && (
                            <span className="flex-shrink-0 text-[10px] font-semibold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                              Decide
                            </span>
                          )}
                          {thread.inboundRequest?.status === 'ACCEPTED' && (
                            <span className="flex-shrink-0 text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                              Accepted
                            </span>
                          )}
                        </div>
                        {/* Row 3: preview */}
                        <p className="text-xs text-[#707782] truncate">{previewText}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))
          })()
        )}
      </div>
    </div>
  )
}

export default EmailList
