import React, { useState, useEffect } from 'react'
import { HelpCircle, User, CheckCircle, XCircle, Bell, Search, Globe, DollarSign, X, Star, Trash2 } from 'lucide-react'
import { knoccAPI, userAPI, emailAPI } from '../services/api'

// Instagram/Twitter-style verification badge
const VerifiedBadge = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#3B82F6"/>
  </svg>
)

function EmailDetail({ email, viewType, onClose, onRefresh }) {
  const isRequestView = viewType === 'knocc-requests'
  const [peopleTab, setPeopleTab] = useState('who-you-know')
  const [allPeople, setAllPeople] = useState([])
  const [whoYouKnowPeople, setWhoYouKnowPeople] = useState([])
  const [loading, setLoading] = useState(false)
  const [showKnoccModal, setShowKnoccModal] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [knoccReason, setKnoccReason] = useState('')

  // Fetch people when in Knocc requests view without email selected
  useEffect(() => {
    if (!email && isRequestView) {
      fetchPeople()
    }
  }, [email, isRequestView])

  const fetchPeople = async () => {
    try {
      const [usersRes, contactsRes] = await Promise.all([
        userAPI.searchUsers(''),
        userAPI.getContacts()
      ])
      
      if (usersRes.users) {
        const approved = contactsRes.contacts || []
        const approvedIds = new Set(approved.map(c => c.id))
        
        setWhoYouKnowPeople(approved.slice(0, 2))
        setAllPeople(usersRes.users.filter(u => !approvedIds.has(u.id)))
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
      alert('Please provide a reason')
      return
    }
    
    setLoading(true)
    try {
      await knoccAPI.sendRequest({
        recipientEmail: selectedPerson.email,
        reason: knoccReason,
        message: '',
        paymentAmount: selectedPerson.knoccPrice
      })
      setShowKnoccModal(false)
      setKnoccReason('')
      alert('Knocc request sent successfully!')
    } catch (err) {
      alert(err.message || 'Failed to send Knocc request')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveRequest = async () => {
    if (!email) return
    setLoading(true)
    try {
      await knoccAPI.respondToRequest(email.id, 'approve')
      onClose()
      if (onRefresh) onRefresh()
    } catch (err) {
      alert(err.message || 'Failed to approve request')
    } finally {
      setLoading(false)
    }
  }

  const handleDeclineRequest = async () => {
    if (!email) return
    setLoading(true)
    try {
      await knoccAPI.respondToRequest(email.id, 'decline')
      onClose()
      if (onRefresh) onRefresh()
    } catch (err) {
      alert(err.message || 'Failed to decline request')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEmail = async () => {
    if (!email) return
    setLoading(true)
    try {
      await emailAPI.deleteEmail(email.id)
      onClose()
      if (onRefresh) onRefresh()
    } catch (err) {
      alert(err.message || 'Failed to delete email')
    } finally {
      setLoading(false)
    }
  }

  if (!email && isRequestView) {
    const displayedPeople = peopleTab === 'who-you-know' ? whoYouKnowPeople : allPeople

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
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Who You Know
            </button>
            <button
              onClick={() => setPeopleTab('all-people')}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                peopleTab === 'all-people'
                  ? 'bg-blue-50 text-blue-600'
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
            {displayedPeople.map((person, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl p-1.5 hover:border-blue-300 transition-all">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className={`w-7 h-7 bg-gradient-to-br ${person.color} rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0`}>
                      {person.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <h3 className="text-xs font-medium text-gray-900 truncate leading-tight">{person.name}</h3>
                        {person.verified ? (
                          <VerifiedBadge className="w-3 h-3 flex-shrink-0" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full border border-gray-300 flex-shrink-0"></div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate leading-tight">{person.profession}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0 ml-1">
                    <div className="flex items-center gap-0.5">
                      <div className={`w-3 h-3 ${person.knoccPrice >= 50 ? 'bg-purple-500' : 'bg-green-500'} rounded-full flex items-center justify-center`}>
                        <DollarSign className="w-1.5 h-1.5 text-white" strokeWidth={3} />
                      </div>
                      <span className="text-xs font-medium text-gray-700">${person.knoccPrice}</span>
                    </div>
                    <button 
                      onClick={() => handleKnoccClick(person)}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded transition-colors font-medium"
                    >
                      Knocc
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
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
                <h2 className="text-base font-medium text-gray-900">{email.sender}</h2>
                <p className="text-sm text-gray-500">{email.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{email.timestamp}</span>
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Request Details */}
        <div className="flex-1 p-5 overflow-y-auto">
          <div className="max-w-2xl">
            <div className="mb-5">
              <h3 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Request Reason</h3>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{email.reason}</p>
            </div>

            <div className="mb-5">
              <h3 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Additional Information</h3>
              <div className="bg-gray-50 p-3 rounded-md space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Country:</span>
                  <span className="text-gray-900 font-medium">{email.additionalInfo?.country}</span>
                </div>
                {email.paymentType && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment:</span>
                    <span className={`font-medium ${
                      email.paymentType === 'pryro' ? 'text-purple-700' : 'text-green-700'
                    }`}>
                      {email.paymentAmount} {email.paymentType === 'pryro' ? '(Priority)' : '(Standard)'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {email.status === 'pending' && (
              <div className="flex gap-2">
                <button 
                  onClick={handleApproveRequest}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2.5 px-4 rounded-md transition-colors text-sm font-medium"
                >
                  <CheckCircle className="w-4 h-4" />
                  {loading ? 'Processing...' : 'Approve & Add Contact'}
                </button>
                <button 
                  onClick={handleDeclineRequest}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-2.5 px-4 rounded-md transition-colors text-sm font-medium"
                >
                  <XCircle className="w-4 h-4" />
                  {loading ? 'Processing...' : 'Decline Request'}
                </button>
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
      alert(err.message || 'Failed to star email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-gray-900">{email.subject}</h2>
          <div className="flex items-center gap-1">
            <button 
              onClick={handleStarEmail}
              disabled={loading}
              className="p-1.5 hover:bg-yellow-50 rounded-md transition-colors disabled:opacity-50"
              title={email.starred ? "Unstar" : "Star"}
            >
              <Star className={`w-4 h-4 ${email.starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
            </button>
            <button 
              onClick={handleDeleteEmail}
              disabled={loading}
              className="p-1.5 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
            </button>
            <button className="p-1.5 hover:bg-gray-50 rounded-md transition-colors">
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </button>
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium ml-2">
              A
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center">
            <span className="text-purple-600 font-medium text-sm">{email.sender[0]}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 text-sm">{email.sender}</span>
              {email.knoccApproved && (
                <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Approved
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{email.email}</p>
          </div>
          <span className="text-xs text-gray-400">{email.timestamp}</span>
        </div>
      </div>

      {/* Email Body */}
      <div className="flex-1 p-5 overflow-y-auto">
        <div className="max-w-2xl">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {email.preview}
            {'\n\n'}
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
            {'\n\n'}
            Best regards,{'\n'}
            {email.sender}
          </p>
        </div>
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
                  <div className={`w-12 h-12 bg-gradient-to-br ${selectedPerson.color} rounded-full flex items-center justify-center text-white text-lg font-medium`}>
                    {selectedPerson.initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-medium text-gray-900">{selectedPerson.name}</h3>
                      {selectedPerson.verified && <VerifiedBadge className="w-4 h-4" />}
                    </div>
                    <p className="text-sm text-gray-500">{selectedPerson.profession}</p>
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
