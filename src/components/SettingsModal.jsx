import React, { useState, useEffect } from 'react'
import { X, Save, Shield, UserPlus, Globe, Phone, Calendar, Users as UsersIcon, User, DollarSign, Brain, CheckCircle, Loader, RefreshCw, AlertCircle } from 'lucide-react'
import { userAPI, googleAPI } from '../services/api'

function SettingsModal({ onClose, user, onLogout, onUpdate, onShowInvite }) {
  const [settings, setSettings] = useState({
    name: user?.name || '',
    email: user?.email || '',
    autoApprove: user?.autoApprove || false,
    requireReason: user?.requireReason !== undefined ? user.requireReason : true,
    whatsappNumber: user?.phoneNumber || '',
    age: user?.age || '',
    gender: user?.gender || '',
    country: user?.country || '',
    knoccPrice: user?.knoccPrice || 1,
    customFields: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // AI learning state (reads from user's own Pmail sent emails — no external service)
  const [learningProfile, setLearningProfile] = useState(null) // null = loading
  const [learningRunning, setLearningRunning] = useState(false)
  const [learningMessage, setLearningMessage] = useState(null)

  // Load learning profile on mount
  useEffect(() => {
    googleAPI.getLearningProfile()
      .then(data => setLearningProfile(data.profile))
      .catch(() => setLearningProfile({ connected: false, lastSynced: null, learnedTopics: [], allInterests: [] }))
  }, [])

  const handleRunLearning = async () => {
    setLearningRunning(true)
    setLearningMessage(null)
    try {
      const result = await googleAPI.runLearning()
      setLearningMessage({
        type: 'success',
        text: result.emailsAnalyzed === 0
          ? 'No sent emails yet — send some emails first and come back to run learning.'
          : `Analyzed ${result.emailsAnalyzed} sent emails. Learned topics: ${result.topics.join(', ') || 'none detected'}.`
      })
      // Refresh profile
      const updated = await googleAPI.getLearningProfile()
      setLearningProfile(updated.profile)
    } catch (err) {
      setLearningMessage({ type: 'error', text: err.message || 'Learning failed' })
    } finally {
      setLearningRunning(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')
    setSuccess(false)
    try {
      const response = await userAPI.updateProfile({
        name: settings.name,
        phoneNumber: settings.whatsappNumber,
        age: settings.age ? parseInt(settings.age) : null,
        gender: settings.gender,
        country: settings.country,
        knoccPrice: parseFloat(settings.knoccPrice),
        autoApprove: settings.autoApprove,
        requireReason: settings.requireReason,
      })
      if (response.user) {
        onUpdate(response.user)
        setSuccess(true)
        setTimeout(() => onClose(), 1500)
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Knocc Settings</h2>
            <p className="text-sm text-gray-500 mt-1">Configure how others can contact you</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
              Profile updated successfully!
            </div>
          )}
          
          <div className="space-y-6">
            {/* User Profile Card */}
            {user && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    {settings.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{settings.name}</h4>
                    <p className="text-sm text-gray-600">{settings.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Knocc Price: <span className="font-medium text-blue-600">${settings.knoccPrice}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Profile Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Basic Information
              </h3>
              
              <div className="space-y-4 ml-7">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm select-all">
                    {settings.email}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Email address cannot be changed</p>
                </div>
              </div>
            </div>

            {/* Request Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Request Settings
              </h3>
              
              <div className="space-y-4 ml-7">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.requireReason}
                    onChange={(e) => setSettings({ ...settings, requireReason: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Require reason for contact</span>
                    <p className="text-xs text-gray-500">Users must explain why they want to contact you</p>
                  </div>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.autoApprove}
                    onChange={(e) => setSettings({ ...settings, autoApprove: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Auto-approve all requests</span>
                    <p className="text-xs text-gray-500">Automatically accept all Knocc requests</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Profile Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-blue-600" />
                Profile Information
              </h3>
              
              <div className="space-y-4 ml-7">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    WhatsApp Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={settings.whatsappNumber}
                    onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                    placeholder="+1 234 567 8900"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Age
                    </label>
                    <input
                      type="number"
                      value={settings.age}
                      onChange={(e) => setSettings({ ...settings, age: e.target.value })}
                      placeholder="25"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender
                    </label>
                    <select
                      value={settings.gender}
                      onChange={(e) => setSettings({ ...settings, gender: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Country
                  </label>
                  <input
                    type="text"
                    value={settings.country}
                    onChange={(e) => setSettings({ ...settings, country: e.target.value })}
                    placeholder="United States"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Knocc Price ($)
                  </label>
                  <input
                    type="number"
                    value={settings.knoccPrice}
                    onChange={(e) => setSettings({ ...settings, knoccPrice: e.target.value })}
                    min="1"
                    step="0.01"
                    placeholder="1.00"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">What people pay to send you a Knocc request</p>
                </div>
              </div>
            </div>

            {/* AI Learning */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-600" />
                AI Learning — Sent Mail Analysis
              </h3>

              <div className="ml-7 space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-100">
                  <p className="text-sm text-gray-700 font-medium mb-1">Let the AI learn from your writing style</p>
                  <p className="text-xs text-gray-500">
                    Analyzes your sent emails inside Pmail to understand your interests, topics, and
                    communication style — so the autopilot can act with real confidence on your behalf.
                    No external access or account needed.
                  </p>
                </div>

                {learningMessage && (
                  <div className={`p-3 rounded-lg flex items-start gap-2 text-sm ${
                    learningMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {learningMessage.type === 'success'
                      ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                    <span>{learningMessage.text}</span>
                  </div>
                )}

                {learningProfile === null ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader className="w-4 h-4 animate-spin" /> Loading profile…
                  </div>
                ) : (
                  <div className="space-y-3">
                    {learningProfile.lastSynced && (
                      <p className="text-xs text-gray-500">
                        Last analyzed: {new Date(learningProfile.lastSynced).toLocaleString()}
                      </p>
                    )}

                    {learningProfile.learnedTopics?.length > 0 ? (
                      <div>
                        <p className="text-xs text-gray-500 mb-1.5">Topics learned from your emails:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {learningProfile.learnedTopics.map(topic => (
                            <span key={topic} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        No topics learned yet. Click "Analyze" to start.
                      </p>
                    )}

                    <button
                      onClick={handleRunLearning}
                      disabled={learningRunning}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {learningRunning
                        ? <><Loader className="w-4 h-4 animate-spin" /> Analyzing…</>
                        : <><RefreshCw className="w-4 h-4" /> {learningProfile.lastSynced ? 'Re-analyze' : 'Analyze My Emails'}</>}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Gmail Integration (Invite Friends) */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Gmail Integration
              </h3>
              
              <div className="ml-7">
                <p className="text-sm text-gray-600 mb-4">
                  Automatically invite your Gmail contacts to join Pmail
                </p>
                <button 
                  onClick={onShowInvite}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Connect Gmail &amp; Send Invites
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors font-medium"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
