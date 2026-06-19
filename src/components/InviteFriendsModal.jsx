import React, { useState, useEffect } from 'react';
import { X, Mail, Users, Download, Send, CheckCircle, XCircle, Loader, AlertCircle } from 'lucide-react';
import { googleAPI, invitationAPI } from '../services/api';

function InviteFriendsModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' or 'import'
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Import contacts state
  const [importLoading, setImportLoading] = useState(false);
  const [googleContacts, setGoogleContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sent invitations state
  const [sentInvitations, setSentInvitations] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadInvitationData();
  }, []);

  const loadInvitationData = async () => {
    try {
      const [invitationsRes, statsRes] = await Promise.all([
        invitationAPI.getSentInvitations(),
        invitationAPI.getInvitationStats(),
      ]);

      if (invitationsRes.invitations) {
        setSentInvitations(invitationsRes.invitations);
      }
      if (statsRes.stats) {
        setStats(statsRes.stats);
      }
    } catch (error) {
      console.error('Error loading invitation data:', error);
    }
  };

  const handleSendInvitation = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await invitationAPI.sendInvitation(email, name);
      
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: 'Invitation sent successfully!' });
        setEmail('');
        setName('');
        loadInvitationData();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send invitation' });
    } finally {
      setLoading(false);
    }
  };

  const handleImportGoogleContacts = async () => {
    setImportLoading(true);
    setMessage(null);

    try {
      // Get Google OAuth URL
      const { authUrl } = await googleAPI.getAuthUrl();
      
      if (!authUrl) {
        setMessage({ type: 'error', text: 'Failed to generate Google auth URL' });
        setImportLoading(false);
        return;
      }

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl,
        'Google Sign In',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for OAuth completion
      const checkPopup = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          setImportLoading(false);
          
          // Try to fetch contacts (this is a simplified approach)
          // In production, you'd handle the OAuth callback properly
          setMessage({ 
            type: 'info', 
            text: 'Please complete the authorization in the popup window' 
          });
        }
      }, 1000);

    } catch (error) {
      console.error('Error importing contacts:', error);
      setMessage({ type: 'error', text: 'Failed to import Google contacts' });
      setImportLoading(false);
    }
  };

  const handleSelectContact = (contact) => {
    const newSelected = new Set(selectedContacts);
    const contactKey = contact.email;
    
    if (newSelected.has(contactKey)) {
      newSelected.delete(contactKey);
    } else {
      newSelected.add(contactKey);
    }
    
    setSelectedContacts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      const allEmails = new Set(filteredContacts.map(c => c.email));
      setSelectedContacts(allEmails);
    }
  };

  const handleSendBulkInvitations = async () => {
    if (selectedContacts.size === 0) {
      setMessage({ type: 'error', text: 'Please select at least one contact' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const contactsToInvite = googleContacts
        .filter(c => selectedContacts.has(c.email))
        .map(c => ({ email: c.email, name: c.name }));

      const result = await invitationAPI.sendBulkInvitations(contactsToInvite);

      if (result.summary) {
        const { successful, failed, alreadyExists, alreadyInvited } = result.summary;
        setMessage({ 
          type: 'success', 
          text: `Sent: ${successful}, Already exists: ${alreadyExists}, Already invited: ${alreadyInvited}, Failed: ${failed}` 
        });
        
        // Clear selection and reload data
        setSelectedContacts(new Set());
        loadInvitationData();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send invitations' });
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = googleContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleResendInvitation = async (invitationId) => {
    try {
      await invitationAPI.resendInvitation(invitationId);
      setMessage({ type: 'success', text: 'Invitation resent successfully' });
      loadInvitationData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to resend invitation' });
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    try {
      await invitationAPI.cancelInvitation(invitationId);
      setMessage({ type: 'success', text: 'Invitation cancelled' });
      loadInvitationData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to cancel invitation' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Invite Friends to Pmail</h2>
            {stats && (
              <p className="text-sm text-gray-600 mt-1">
                {stats.total} invitations sent • {stats.accepted} accepted • {stats.pending} pending
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Message Banner */}
        {message && (
          <div className={`mx-6 mt-4 p-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' :
            message.type === 'error' ? 'bg-red-50 text-red-800' :
            'bg-blue-50 text-blue-800'
          }`}>
            {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {message.type === 'error' && <XCircle className="w-5 h-5" />}
            {message.type === 'info' && <AlertCircle className="w-5 h-5" />}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mail className="w-4 h-4 inline mr-2" />
            Manual Invite
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Download className="w-4 h-4 inline mr-2" />
            Import Contacts
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Invitation History
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Manual Invite Tab */}
          {activeTab === 'manual' && (
            <form onSubmit={handleSendInvitation} className="max-w-md mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="friend@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Friend's name"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Invitation
                  </>
                )}
              </button>
            </form>
          )}

          {/* Import Contacts Tab */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Import Gmail Contacts
                </h3>
                <p className="text-gray-600 mb-6">
                  Connect your Google account to import and invite your contacts
                </p>
                <button
                  onClick={handleImportGoogleContacts}
                  disabled={importLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {importLoading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Import from Google
                    </>
                  )}
                </button>
              </div>

              {/* Display imported contacts */}
              {googleContacts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search contacts..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleSelectAll}
                      className="ml-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {selectedContacts.size === filteredContacts.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                    {filteredContacts.map((contact) => (
                      <label
                        key={contact.email}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedContacts.has(contact.email)}
                          onChange={() => handleSelectContact(contact)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        {contact.photo && (
                          <img
                            src={contact.photo}
                            alt={contact.name}
                            className="w-10 h-10 rounded-full"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{contact.name}</div>
                          <div className="text-sm text-gray-600">{contact.email}</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={handleSendBulkInvitations}
                    disabled={loading || selectedContacts.size === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send to {selectedContacts.size} Contact{selectedContacts.size !== 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Invitation History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {sentInvitations.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No invitations sent yet</p>
                </div>
              ) : (
                sentInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {invitation.name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-600">{invitation.email}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Sent {new Date(invitation.sentAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        invitation.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                        invitation.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {invitation.status}
                      </span>
                      {invitation.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleResendInvitation(invitation.id)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Resend
                          </button>
                          <button
                            onClick={() => handleCancelInvitation(invitation.id)}
                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InviteFriendsModal;
