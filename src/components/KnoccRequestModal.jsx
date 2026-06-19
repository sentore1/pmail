import React, { useState } from 'react'
import { X, Send, AlertCircle, DollarSign } from 'lucide-react'
import { knoccAPI, userAPI } from '../services/api'

function KnoccRequestModal({ onClose }) {
  const [step, setStep] = useState(1) // 1=search, 2=form
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSearch = async (q) => {
    setSearchQuery(q)
    if (!q.trim()) { setSearchResults([]); return }
    try {
      const res = await userAPI.searchUsers(q)
      setSearchResults(res.users || [])
    } catch {
      setSearchResults([])
    }
  }

  const handleSelectUser = (user) => {
    setSelectedUser(user)
    setSearchResults([])
    setSearchQuery(user.email)
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedUser) { setError('Please select a recipient'); return }
    if (!reason.trim()) { setError('Please provide a reason'); return }

    setLoading(true)
    setError('')
    try {
      await knoccAPI.sendRequest({
        recipientEmail: selectedUser.email,
        reason,
        message,
        paymentAmount: selectedUser.knoccPrice,
      })
      setSuccess(true)
      setTimeout(onClose, 1800)
    } catch (err) {
      setError(err.message || 'Failed to send request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Send Knocc Request</h2>
            <p className="text-sm text-gray-500 mt-0.5">Request permission to contact someone on Pmail</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Request sent!</h3>
            <p className="text-sm text-gray-500">
              Your Knocc request has been sent to {selectedUser?.name}. You'll be notified when they respond.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Info banner */}
            <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Knocc requests require a payment to the recipient. They'll review your reason and decide whether to approve contact.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
            )}

            {/* Recipient search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map((u) => (
                      <button key={u.id} type="button" onClick={() => handleSelectUser(u)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left border-b border-gray-100 last:border-b-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                          <DollarSign className="w-3.5 h-3.5" />{u.knoccPrice}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected user details */}
            {selectedUser && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{selectedUser.name}</p>
                    <p className="text-xs text-gray-500">{selectedUser.email}</p>
                    {selectedUser.country && (
                      <p className="text-xs text-gray-400 mt-0.5">{selectedUser.country}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-5 h-5 ${selectedUser.knoccPrice >= 50 ? 'bg-purple-500' : 'bg-green-500'} rounded-full flex items-center justify-center`}>
                      <DollarSign className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                    <span className="text-base font-bold text-gray-900">${selectedUser.knoccPrice}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for contact <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Be specific and professional. Explain why you want to contact this person…"
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
              />
            </div>

            {/* Optional message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Initial message (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a short message to accompany your request…"
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={onClose}
                className="px-5 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm">
                Cancel
              </button>
              <button type="submit" disabled={loading || !selectedUser || !reason.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium text-sm">
                <Send className="w-4 h-4" />
                {loading ? 'Sending…' : selectedUser ? `Send Knocc ($${selectedUser.knoccPrice})` : 'Send Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default KnoccRequestModal
