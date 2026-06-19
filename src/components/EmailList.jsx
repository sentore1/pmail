import React, { useState } from 'react'
import { Search, Filter, Bell, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react'

function EmailList({ emails, selectedEmail, onSelectEmail, viewType, onViewChange }) {
  const isRequestView = viewType === 'knocc-requests'
  const [inboxTab, setInboxTab] = useState('inbox') // 'inbox' or 'sent'
  const [knoccTab, setKnoccTab] = useState('all') // 'all', 'paid', or 'pryro'

  const handleTabChange = (tab) => {
    setInboxTab(tab)
    if (onViewChange) {
      onViewChange(tab)
    }
  }

  const handleKnoccTabChange = (tab) => {
    setKnoccTab(tab)
  }

  // Filter emails based on knocc tab
  const filteredEmails = isRequestView 
    ? emails.filter(email => {
        if (knoccTab === 'all') return true
        if (knoccTab === 'paid') return email.paymentType === 'paid'
        if (knoccTab === 'pryro') return email.paymentType === 'pryro'
        return true
      })
    : emails

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search emails"
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
                    inboxTab === 'inbox'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Inbox
                  <span className="ml-1.5 text-xs">{inboxTab === 'inbox' ? '5' : ''}</span>
                </button>
                <button
                  onClick={() => handleTabChange('sent')}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    inboxTab === 'sent'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Sent
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <h2 className="text-lg font-medium text-gray-900">Knocc Requests</h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleKnoccTabChange('pryro')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-colors flex items-center gap-1 ${
                      knoccTab === 'pryro'
                        ? 'bg-purple-50 text-purple-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-3.5 h-3.5 bg-purple-500 rounded-full flex items-center justify-center">
                      <DollarSign className="w-2 h-2 text-white" strokeWidth={3} />
                    </div>
                    Pryro
                  </button>
                  <button
                    onClick={() => handleKnoccTabChange('paid')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-colors flex items-center gap-1 ${
                      knoccTab === 'paid'
                        ? 'bg-green-50 text-green-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-3.5 h-3.5 bg-green-500 rounded-full flex items-center justify-center">
                      <DollarSign className="w-2 h-2 text-white" strokeWidth={3} />
                    </div>
                    Paid
                  </button>
                  <button
                    onClick={() => handleKnoccTabChange('all')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-colors ${
                      knoccTab === 'all'
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    All
                  </button>
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

      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        {filteredEmails.map((email) => (
          <div
            key={email.id}
            onClick={() => onSelectEmail(email)}
            className={`p-3 border-b border-gray-50 cursor-pointer transition-colors ${
              selectedEmail?.id === email.id ? 'bg-blue-50' : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex items-center gap-2 flex-1">
                {email.unread && !isRequestView && (
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></div>
                )}
                {isRequestView && (
                  <>
                    {email.paymentType === 'pryro' ? (
                      <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </div>
                    ) : email.paymentType === 'paid' ? (
                      <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </div>
                    ) : (
                      <Bell className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
                    )}
                  </>
                )}
                <span className={`text-gray-900 text-sm ${email.unread && !isRequestView ? 'font-medium' : ''}`}>
                  {email.sender}
                </span>
              </div>
              <span className="text-xs text-gray-400">{email.timestamp}</span>
            </div>

            <div className={isRequestView ? '' : 'ml-3.5'}>
              <p className="text-gray-700 mb-0.5 text-sm flex items-center gap-1.5">
                {isRequestView ? 'Reason: ' + email.reason : email.subject}
                {isRequestView && email.paymentType === 'pryro' && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">{email.paymentAmount}</span>
                )}
                {isRequestView && email.paymentType === 'paid' && (
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">{email.paymentAmount}</span>
                )}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {isRequestView ? email.email : email.preview}
              </p>
              
              {isRequestView && email.status === 'pending' && (
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    Pending
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default EmailList
