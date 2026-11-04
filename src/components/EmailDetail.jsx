import React, { useState, useEffect } from 'react'
import { HelpCircle, User, CheckCircle, XCircle, Bell, Search, Globe, DollarSign, X, Star, Trash2, Reply, Forward, Paperclip, Download, ChevronDown, ChevronUp, Send, Loader2 } from 'lucide-react'
import DOMPurify from 'dompurify'
import { knoccAPI, userAPI, emailAPI, walletAPI } from '../services/api'

// Instagram/Twitter-style verification badge
const VerifiedBadge = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#3B82F6"/>
  </svg>
)

function EmailDetail({ email, viewType, onClose, onRefresh, onReply, onForward, onApproved }) {
  const isRequestView = viewType === 'knocc-requests'
  const isBinView = viewType === 'bin'

  // ── All hooks must be here — before any early returns ────────────────────
  const [peopleTab, setPeopleTab] = useState('who-you-know')
  const [allPeople, setAllPeople] = useState([])
  const [whoYouKnowPeople, setWhoYouKnowPeople] = useState([])
  const [loading, setLoading] = useState(false)
  const [showKnoccModal, setShowKnoccModal] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [knoccReason, setKnoccReason] = useState('')
  const [actionError, setActionError] = useState('')
  const [walletBalance, setWalletBalance] = useState(null)
  // IDs of users we've already sent a Knocc request to (or are contacts with)
  const [sentKnoccIds, setSentKnoccIds] = useState(new Set())
  const [contactIds, setContactIds] = useState(new Set())
  const [peopleSearch, setPeopleSearch] = useState('')
  const [showSenderInfo, setShowSenderInfo] = useState(false)

  // Thread expand state — which message IDs are open
  const [expandedIds, setExpandedIds] = useState(() => {
    const t = email?._thread || (email ? [email] : [])
    return new Set(t.length ? [t[t.length - 1].id] : [])
  })

  // Reset expanded state whenever the selected email/thread changes
  useEffect(() => {
    const t = email?._thread || (email ? [email] : [])
    setExpandedIds(new Set(t.length ? [t[t.length - 1].id] : []))
    setActionError('')  // clear any stale error when switching emails
  }, [email?.id])

  // Fetch people when in Knocc requests view without email selected
  useEffect(() => {
    if (!email && isRequestView) {
      fetchPeople()
    }
  }, [email, isRequestView])

  const fetchPeople = async () => {
    try {
      const [usersRes, contactsRes, sentRes, balanceRes] = await Promise.all([
        userAPI.getAllUsers(),
        userAPI.getContacts(),
        knoccAPI.getSentRequests(),
        walletAPI.getBalance(),
      ])

      if (balanceRes.walletBalance !== undefined) {
        setWalletBalance(balanceRes.walletBalance)
      }

      if (usersRes.users) {
        const approved = contactsRes.contacts || []
        const activeContacts = approved.filter(c => !c.isExpired)
        const expiredContacts = approved.filter(c => c.isExpired)

        const activeIds = new Set(activeContacts.map(c => c.id))
        const expiredIds = new Set(expiredContacts.map(c => c.id))
        const sent = sentRes.requests || []
        const sentIds = new Set(sent.map(r => r.recipientId))

        setContactIds(activeIds)
        expiredIds.forEach(id => sentIds.delete(id))
        setSentKnoccIds(sentIds)
        setWhoYouKnowPeople(activeContacts.slice(0, 2))
        const allUserIds = new Set(usersRes.users.map(u => u.id))
        setAllPeople([
          ...expiredContacts.map(c => ({ ...c, _expired: true })),
          ...usersRes.users.filter(u => !activeIds.has(u.id)),
        ])
      }
    } catch (err) {
      console.error('Failed to fetch people:', err)
    }
  }

  const handleKnoccClick = (person) => {
    setSelectedPerson(person)
    setShowKnoccModal(true)
  }

  const handleSendKnocc = async () => {
    if (!knoccReason.trim()) {
      setActionError('Please provide a reason')
      return
    }
    setActionError('')
    setLoading(true)
    try {
      await knoccAPI.sendRequest({
        recipientEmail: selectedPerson.email,
        reason: knoccReason,
        message: '',
        paymentAmount: selectedPerson.knoccPrice,
      })
      // Mark this person as already knocced so the button disappears immediately
      setSentKnoccIds((prev) => new Set([...prev, selectedPerson.id]))
      setShowKnoccModal(false)
      setKnoccReason('')
    } catch (err) {
      setActionError(err.message || 'Failed to send Knocc request')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveRequest = async () => {
    if (!email) return
    setActionError('')
    setLoading(true)
    try {
      const result = await knoccAPI.respondToRequest(email.id, 'approve')
      // Close the request view first
      onClose()
      if (onRefresh) onRefresh()
      // Navigate to inbox and open compose to the sender
      if (result?.sender && onApproved) {
        onApproved(result.sender)
      }
    } catch (err) {
      setActionError(err.message || 'Failed to approve request')
      setLoading(false)
    }
  }

  const handleDeclineRequest = async () => {
    if (!email) return
    setActionError('')
    setLoading(true)
    try {
      await knoccAPI.respondToRequest(email.id, 'decline')
      // Close first so the stale item disappears immediately, then refresh
      onClose()
      if (onRefresh) onRefresh()
    } catch (err) {
      setActionError(err.message || 'Failed to decline request')
      setLoading(false)
    }
  }

  const handleDeleteEmail = async () => {
    if (!email) return
    setLoading(true)
    try {
      if (isBinView) {
        await emailAPI.permanentlyDeleteEmail(email.id)
      } else {
        await emailAPI.deleteEmail(email.id)
      }
      onClose()          // clear selected email first
      setActionError('') // ensure no stale error lingers
      if (onRefresh) onRefresh()
    } catch (err) {
      setActionError(err.message || 'Failed to delete email')
    } finally {
      setLoading(false)
    }
  }

  if (!email && isRequestView) {
    const filterPeople = (list) => {
      if (!peopleSearch.trim()) return list
      const q = peopleSearch.toLowerCase()
      return list.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.email || '').toLowerCase().includes(q) ||
          (p.profession || '').toLowerCase().includes(q) ||
          (p.country || '').toLowerCase().includes(q)
      )
    }
    const displayedPeople = filterPeople(peopleTab === 'who-you-know' ? whoYouKnowPeople : allPeople)

    return (
      <div className="flex-1 flex flex-col bg-white overflow-y-auto">
        {/* Search Header */}
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-base font-medium text-gray-900 mb-3">Find People on Pmail</h2>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or profession..."
              value={peopleSearch}
              onChange={(e) => setPeopleSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="px-5 pt-4 pb-2 border-b border-gray-100">
          <div className="flex gap-2">
            <button
              onClick={() => setPeopleTab('who-you-know')}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                peopleTab === 'who-you-know'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Who You Know
            </button>
            <button
              onClick={() => setPeopleTab('all-people')}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                peopleTab === 'all-people'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              All People
            </button>
          </div>
        </div>

        {/* People Grid */}
        <div className="p-5">
          <div className="grid grid-cols-3 gap-2">
            {displayedPeople.map((person, idx) => {
              const initials = (person.name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
              const colors = ['from-blue-400 to-blue-600', 'from-purple-400 to-purple-600', 'from-green-400 to-green-600', 'from-orange-400 to-orange-600']
              const color = colors[idx % colors.length]
              return (
              <div key={person.id || idx} className={`border rounded-xl p-1.5 transition-all ${
                person._expired
                  ? 'border-amber-200 hover:border-amber-400 bg-amber-50/30'
                  : 'border-gray-200 hover:border-blue-300'
              }`}>
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className={`w-7 h-7 bg-gradient-to-br ${color} rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <h3 className="text-xs font-medium text-gray-900 truncate leading-tight">{person.name}</h3>
                        {person.verified && <VerifiedBadge className="w-3 h-3 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 truncate leading-tight">{person.country || person.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0 ml-1">
                    <div className="flex items-center gap-0.5">
                      <div className={`w-3 h-3 ${person.knoccPrice >= 50 ? 'bg-purple-500' : 'bg-green-500'} rounded-full flex items-center justify-center`}>
                        <DollarSign className="w-1.5 h-1.5 text-white" strokeWidth={3} />
                      </div>
                      <span className="text-xs font-medium text-gray-700">${person.knoccPrice}</span>
                    </div>
                    {contactIds.has(person.id) ? (
                      <span className="text-xs text-green-600 font-medium px-2 py-0.5">Chatting</span>
                    ) : person._expired ? (
                      <button
                        onClick={() => handleKnoccClick(person)}
                        title="Chat expired — Knocc again to reconnect"
                        className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2 py-0.5 rounded transition-colors font-medium"
                      >
                        Re-Knocc
                      </button>
                    ) : sentKnoccIds.has(person.id) ? (
                      <span className="text-xs text-gray-400 font-medium px-2 py-0.5">Pending</span>
                    ) : (
                      <button
                        onClick={() => handleKnoccClick(person)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded transition-colors font-medium"
                      >
                        Knocc
                      </button>
                    )}
                  </div>
                </div>
              </div>
              )
            })}
          </div>
          {displayedPeople.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">
              {peopleSearch.trim() ? 'No people found matching your search' : 'No people found'}
            </p>
          )}
        </div>

        {/* ── Knocc modal — must be inside this early-return block ────────── */}
        {showKnoccModal && selectedPerson && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Send Knocc Request</h2>
                  <p className="text-xs text-gray-500 mt-0.5">to {selectedPerson.name}</p>
                </div>
                <button
                  onClick={() => { setShowKnoccModal(false); setSelectedPerson(null); setKnoccReason(''); setActionError('') }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Recipient summary */}
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {(selectedPerson.name || '?').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{selectedPerson.name}</p>
                    <p className="text-xs text-gray-500">{selectedPerson.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-sm font-bold text-gray-900">{selectedPerson.knoccPrice}</span>
                    </div>
                    <p className="text-xs text-gray-400">knocc fee</p>
                  </div>
                </div>

                {/* Wallet balance check */}
                {walletBalance !== null && (
                  <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                    walletBalance >= selectedPerson.knoccPrice
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    <span>Your balance: <strong>${walletBalance.toFixed(2)}</strong></span>
                    {walletBalance < selectedPerson.knoccPrice && (
                      <span className="text-xs font-medium">
                        Need ${(selectedPerson.knoccPrice - walletBalance).toFixed(2)} more — add funds from Wallet
                      </span>
                    )}
                  </div>
                )}

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Reason for contact <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={knoccReason}
                    onChange={e => setKnoccReason(e.target.value)}
                    placeholder="Why do you want to contact this person?"
                    rows={3}
                    autoFocus
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                  />
                </div>

                {actionError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{actionError}</p>
                )}
              </div>

              <div className="px-5 pb-5 flex gap-3">
                <button
                  onClick={() => { setShowKnoccModal(false); setSelectedPerson(null); setKnoccReason(''); setActionError('') }}
                  className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendKnocc}
                  disabled={loading || !knoccReason.trim() || (walletBalance !== null && walletBalance < selectedPerson.knoccPrice)}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {loading ? 'Sending…' : walletBalance !== null && walletBalance < selectedPerson.knoccPrice
                    ? 'Insufficient balance'
                    : `Send Knocc ($${selectedPerson.knoccPrice})`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="w-7 h-7 text-gray-300" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No {isRequestView ? 'request' : 'email'} selected
          </h3>
          <p className="text-sm text-gray-500">
            Select {isRequestView ? 'a request' : 'an email'} to read its contents.
          </p>
        </div>
      </div>
    )
  }

  if (isRequestView) {
    // Real API shape: request.sender.name, request.sender.email, request.reason, request.paymentAmount, request.paymentType, request.status
    const senderName = email.sender?.name || email.senderName || email.sender || 'Unknown'
    const senderEmail = email.sender?.email || email.email || ''
    const country = email.sender?.country || email.additionalInfo?.country || ''

    return (
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-base font-medium text-gray-900">{senderName}</h2>
                <p className="text-sm text-gray-500">{senderEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {email.createdAt ? new Date(email.createdAt).toLocaleString() : email.timestamp}
              </span>
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Request Details */}
        <div className="flex-1 p-5 overflow-y-auto">
          <div className="max-w-2xl space-y-5">
            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Request Reason</h3>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{email.reason}</p>
            </div>

            {email.message && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Message</h3>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{email.message}</p>
              </div>
            )}

            <div>
              <h3 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Details</h3>
              <div className="bg-gray-50 p-3 rounded-md space-y-2">
                {country && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Country:</span>
                    <span className="text-gray-900 font-medium">{country}</span>
                  </div>
                )}
                {email.paymentType && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment type:</span>
                    <span className={`font-medium ${email.paymentType === 'PRYRO' ? 'text-purple-700' : 'text-green-700'}`}>
                      {email.paymentType}
                    </span>
                  </div>
                )}
                {email.paymentAmount != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount paid:</span>
                    <span className="font-semibold text-gray-900">${email.paymentAmount}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Error display */}
            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 flex items-center gap-2">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                {actionError}
              </div>
            )}

            {email.status === 'PENDING' && (
              <div className="flex gap-2">
                <button onClick={handleApproveRequest} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2.5 px-4 rounded-md transition-colors text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  {loading ? 'Processing…' : 'Approve & Add Contact'}
                </button>
                <button onClick={handleDeclineRequest} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-2.5 px-4 rounded-md transition-colors text-sm font-medium">
                  <XCircle className="w-4 h-4" />
                  {loading ? 'Processing…' : 'Decline'}
                </button>
              </div>
            )}

            {email.status !== 'PENDING' && (
              <div className={`p-3 rounded-md text-sm font-medium text-center ${
                email.status === 'APPROVED' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {email.status === 'APPROVED' ? '✓ Request approved' : '✕ Request declined'}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const handleStarEmail = async () => {
    setLoading(true)
    try {
      await emailAPI.starEmail(email.id)
      if (onRefresh) onRefresh()
    } catch (err) {
      setActionError(err.message || 'Failed to star email')
    } finally {
      setLoading(false)
    }
  }

  const formatBytes = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // The thread is either from the _thread array (grouped) or just the single email
  const thread = email._thread || [email]
  const isThread = thread.length > 1

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Reply/forward uses the LATEST message in the thread
  const latestMsg = thread[thread.length - 1]

  const buildReplyContext = () => {
    const senderObj = latestMsg.sender || {}
    const firstRecipient = latestMsg.recipients?.find(r => r.type === 'TO')?.recipient || {}
    const senderEmail = senderObj.email || firstRecipient.email || ''
    const senderName  = senderObj.name  || firstRecipient.name  || senderEmail || 'Unknown'
    return {
      senderId:    senderObj.id || firstRecipient.id || '',
      senderEmail,
      senderName,
      subject:  latestMsg.subject || '',
      body:     latestMsg.body    || '',
      date:     latestMsg.sentAt ? new Date(latestMsg.sentAt).toLocaleString() : '',
    }
  }

  const buildForwardContext = () => {
    const senderObj = latestMsg.sender || {}
    const senderEmail = senderObj.email || ''
    const senderName  = senderObj.name  || senderEmail || 'Unknown'
    return {
      senderId:    senderObj.id  || '',
      senderEmail,
      senderName,
      subject:     latestMsg.subject || '',
      body:        latestMsg.body    || '',
      date:        latestMsg.sentAt ? new Date(latestMsg.sentAt).toLocaleString() : '',
    }
  }

  // Sanitize helper reused per message
  // Use RETURN_DOM_FRAGMENT=false, ADD_TAGS for form elements, and explicitly
  // allow interactive elements so filled-in form values survive sanitization.
  const sanitizeBody = (body) => DOMPurify.sanitize(body || '(No content)', {
    ALLOWED_TAGS: ['p','br','strong','b','em','i','u','s','a','ul','ol','li',
                   'h1','h2','h3','h4','blockquote','pre','code','table',
                   'thead','tbody','tr','th','td','img','hr','div','span',
                   'input','textarea','select','option','label'],
    ALLOWED_ATTR: ['href','src','alt','style','class','target','rel',
                   'colspan','rowspan','width','height','align','border',
                   'cellpadding','cellspacing','type','value','placeholder',
                   'rows','cols','name','checked','selected','disabled',
                   'readonly','size','maxlength','for','id'],
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true,
    // Keep form elements — DOMPurify strips them by default as "dangerous"
    ADD_TAGS: ['input','textarea','select','option'],
    ADD_ATTR: ['value','type','checked','selected','readonly','disabled','placeholder','rows','name'],
  })

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Thread header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-medium text-gray-900 flex-1 min-w-0 truncate pr-4">
            {latestMsg.subject}
          </h2>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={handleStarEmail} disabled={loading}
              className="p-1.5 hover:bg-yellow-50 rounded-md transition-colors disabled:opacity-50"
              title={latestMsg.isStarred ? 'Unstar' : 'Star'}>
              <Star className={`w-4 h-4 ${latestMsg.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
            </button>
            <button onClick={handleDeleteEmail} disabled={loading}
              className="p-1.5 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
              title={isBinView ? 'Delete permanently' : 'Move to bin'}>
              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
            </button>
            <button className="p-1.5 hover:bg-gray-50 rounded-md transition-colors">
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
        {isThread && (
          <p className="text-xs text-gray-400">{thread.length} messages in this conversation</p>
        )}
      </div>

      {/* Thread messages */}
      <div className="flex-1 overflow-y-auto">
        {actionError && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-start gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{actionError}</span>
          </div>
        )}

        {thread.map((msg, idx) => {
          const isExpanded = expandedIds.has(msg.id)
          const isLast = idx === thread.length - 1
          const msgSenderName = msg.sender?.name || (typeof msg.sender === 'string' ? msg.sender : 'Unknown')
          const msgSenderEmail = msg.sender?.email || ''
          const avatarColors = ['bg-blue-500','bg-purple-500','bg-green-500','bg-orange-500','bg-pink-500','bg-teal-500']
          const avatarColor = avatarColors[Math.abs(
            (msgSenderName || '').split('').reduce((h, c) => c.charCodeAt(0) + ((h << 5) - h), 0)
          ) % avatarColors.length]
          const initials = msgSenderName !== 'Unknown'
            ? msgSenderName.trim().split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
            : '?'

          return (
            <div key={msg.id} className={`border-b border-gray-100 ${isLast ? '' : ''}`}>
              {/* Message header — always visible, click to expand/collapse */}
              <div
                className="flex items-center gap-2.5 px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpand(msg.id)}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${avatarColor}`}>
                  <span className="text-white text-xs font-semibold">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm">{msgSenderName}</span>
                    {msg.sender?.verified && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">✓ Verified</span>
                    )}
                  </div>
                  {!isExpanded && (
                    <p className="text-xs text-gray-400 truncate">
                      {msg.body ? msg.body.replace(/<[^>]+>/g, '').slice(0, 60) : ''}
                    </p>
                  )}
                  {isExpanded && (
                    <p className="text-xs text-gray-500">{msgSenderEmail}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs text-gray-400">
                    {msg.sentAt ? new Date(msg.sentAt).toLocaleString() : msg.timestamp}
                  </span>
                  {isExpanded
                    ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                    : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                </div>
              </div>

              {/* Message body — shown when expanded */}
              {isExpanded && (
                <div className="px-5 pb-5">
                  <div
                    className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizeBody(msg.body || msg.preview) }}
                  />
                  {/* Attachments */}
                  {msg.attachments?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                        {msg.attachments.length} Attachment{msg.attachments.length > 1 ? 's' : ''}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {msg.attachments.map((att) => (
                          <a key={att.id}
                            href={emailAPI.getAttachmentUrl(msg.id, att.id)}
                            target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 bg-gray-50 border border-gray-200 hover:border-blue-300 px-3 py-2 rounded-lg text-sm transition-colors">
                            <Paperclip className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-gray-700 truncate max-w-[160px]">{att.filename}</p>
                              <p className="text-xs text-gray-400">{formatBytes(att.size)}</p>
                            </div>
                            <Download className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Reply / Forward actions */}
      <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2">
        {onReply && (
          <button onClick={() => onReply(buildReplyContext())}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Reply className="w-4 h-4" /> Reply
          </button>
        )}
        {onForward && (
          <button onClick={() => onForward(buildForwardContext())}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Forward className="w-4 h-4" /> Forward
          </button>
        )}
      </div>

      {/* Knocc Modal for People Directory */}
      {showKnoccModal && selectedPerson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Send Knocc Request</h2>
              <button 
                onClick={() => {
                  setShowKnoccModal(false)
                  setSelectedPerson(null)
                  setKnoccReason('')
                }}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-5">
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-4">
                  {(() => {
                    const initials = (selectedPerson.name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                    return (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-lg font-medium">
                        {initials}
                      </div>
                    )
                  })()}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-medium text-gray-900">{selectedPerson.name}</h3>
                      {selectedPerson.verified && <VerifiedBadge className="w-4 h-4" />}
                    </div>
                    <p className="text-sm text-gray-500">{selectedPerson.country || selectedPerson.email}</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-md mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Knocc Price:</span>
                    <div className="flex items-center gap-1">
                      <div className={`w-4 h-4 ${selectedPerson.knoccPrice >= 50 ? 'bg-purple-500' : 'bg-green-500'} rounded-full flex items-center justify-center`}>
                        <DollarSign className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </div>
                      <span className="text-base font-semibold text-gray-900">${selectedPerson.knoccPrice}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Knocc Request*
                </label>
                <textarea
                  value={knoccReason}
                  onChange={(e) => setKnoccReason(e.target.value)}
                  placeholder="Explain why you want to connect..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowKnoccModal(false)
                    setSelectedPerson(null)
                    setKnoccReason('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendKnocc}
                  disabled={loading || !knoccReason.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {loading ? 'Sending...' : `Send Request ($${selectedPerson.knoccPrice})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmailDetail
