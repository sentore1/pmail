import React, { useState } from 'react'
import { X, Save, Shield, UserPlus, Globe, Phone, Calendar, Users as UsersIcon, User, DollarSign } from 'lucide-react'
import { userAPI } from '../services/api'
import InviteFriendsModal from './InviteFriendsModal'

function SettingsModal({ onClose, user, onLogout, onUpdate }) {
  const [showInviteModal, setShowInviteModal] = useState(false)
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

  const handleSave = async () => {
    setLoading(true)
    setError('')
    setSuccess(false)
    
    try {
      const response = await userAPI.updateProfile({
        name: settings.name,
        email: settings.email,
        phoneNumber: settings.whatsappNumber,
        age: settings.age ? parseInt(settings.age) : null,
        gender: settings.gender,
        country: settings.country,
        knoccPrice: parseFloat(settings.knoccPrice)
      })
      
      if (response.user) {
        onUpdate(response.user)
        setSuccess(true)
        setTimeout(() => {
          onClose()
        }, 1500)
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
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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

            {/* Gmail Integration */}
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
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Connect Gmail & Send Invites
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
      
      {/* Invite Friends Modal */}
      {showInviteModal && (
        <InviteFriendsModal 
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  )
}

export default SettingsModal
