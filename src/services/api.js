const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Helper: parse response and throw on HTTP errors
const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
};

// Auth API
export const authAPI = {
  register: async (userData) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  login: async (email, password) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  checkUsername: async (username) => {
    const response = await fetch(`${API_URL}/auth/check-username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    return handleResponse(response);
  },

  getMe: async () => {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// Email API
export const emailAPI = {
  sendEmail: async (emailData) => {
    const response = await fetch(`${API_URL}/emails`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(emailData),
    });
    return handleResponse(response);
  },

  getInbox: async () => {
    const response = await fetch(`${API_URL}/emails/inbox`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getSentEmails: async () => {
    const response = await fetch(`${API_URL}/emails/sent`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getStarredEmails: async () => {
    const response = await fetch(`${API_URL}/emails/starred`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getBinEmails: async () => {
    const response = await fetch(`${API_URL}/emails/bin`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getEmailById: async (id) => {
    const response = await fetch(`${API_URL}/emails/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  deleteEmail: async (id) => {
    const response = await fetch(`${API_URL}/emails/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  starEmail: async (id) => {
    const response = await fetch(`${API_URL}/emails/${id}/star`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  restoreEmail: async (id) => {
    const response = await fetch(`${API_URL}/emails/${id}/restore`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  permanentlyDeleteEmail: async (id) => {
    const response = await fetch(`${API_URL}/emails/${id}/permanent`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Drafts
  saveDraft: async (draftData) => {
    const response = await fetch(`${API_URL}/emails/drafts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(draftData),
    });
    return handleResponse(response);
  },

  updateDraft: async (draftData) => {
    const response = await fetch(`${API_URL}/emails/drafts`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(draftData),
    });
    return handleResponse(response);
  },

  getDrafts: async () => {
    const response = await fetch(`${API_URL}/emails/drafts`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  deleteDraft: async (id) => {
    const response = await fetch(`${API_URL}/emails/drafts/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getAttachmentUrl: (emailId, attachmentId) =>
    `${API_URL}/emails/${emailId}/attachments/${attachmentId}`,
};

// Knocc API
export const knoccAPI = {
  sendRequest: async (requestData) => {
    const response = await fetch(`${API_URL}/knocc/request`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestData),
    });
    return handleResponse(response);
  },

  getRequests: async (filter = 'all') => {
    const response = await fetch(`${API_URL}/knocc/requests?filter=${filter}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getSentRequests: async () => {
    const response = await fetch(`${API_URL}/knocc/sent`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  respondToRequest: async (id, action) => {
    const response = await fetch(`${API_URL}/knocc/requests/${id}/respond`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action }),
    });
    return handleResponse(response);
  },
};

// User API
export const userAPI = {
  getAllUsers: async () => {
    const response = await fetch(`${API_URL}/users/all`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  searchUsers: async (query) => {
    const response = await fetch(`${API_URL}/users/search?query=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getContacts: async () => {
    const response = await fetch(`${API_URL}/users/contacts`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getBlockedUsers: async () => {
    const response = await fetch(`${API_URL}/users/blocked`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  blockUser: async (userId) => {
    const response = await fetch(`${API_URL}/users/block/${userId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  unblockUser: async (userId) => {
    const response = await fetch(`${API_URL}/users/block/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateProfile: async (profileData) => {
    const response = await fetch(`${API_URL}/users/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData),
    });
    return handleResponse(response);
  },
};

// Wallet API
export const walletAPI = {
  addFunds: async (amount) => {
    const response = await fetch(`${API_URL}/wallet/add-funds`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount }),
    });
    return handleResponse(response);
  },

  createLightningInvoice: async (amount) => {
    const response = await fetch(`${API_URL}/wallet/create-invoice`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount }),
    });
    return handleResponse(response);
  },

  checkInvoiceStatus: async (invoiceId) => {
    const response = await fetch(`${API_URL}/wallet/invoice/${encodeURIComponent(invoiceId)}/status`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  withdrawFunds: async (amount, paymentRequest = null) => {
    const response = await fetch(`${API_URL}/wallet/withdraw`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount, paymentRequest }),
    });
    return handleResponse(response);
  },

  getBalance: async () => {
    const response = await fetch(`${API_URL}/wallet/balance`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getTransactions: async (page = 1, limit = 50) => {
    const response = await fetch(`${API_URL}/wallet/transactions?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// Invitation API
export const invitationAPI = {
  sendInvitation: async (email, name) => {
    const response = await fetch(`${API_URL}/invitations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, name }),
    });
    return handleResponse(response);
  },

  sendBulkInvitations: async (contacts) => {
    const response = await fetch(`${API_URL}/invitations/bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ contacts }),
    });
    return handleResponse(response);
  },

  getSentInvitations: async (status = null) => {
    const url = status
      ? `${API_URL}/invitations?status=${status}`
      : `${API_URL}/invitations`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  getInvitationStats: async () => {
    const response = await fetch(`${API_URL}/invitations/stats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  resendInvitation: async (invitationId) => {
    const response = await fetch(`${API_URL}/invitations/${invitationId}/resend`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  cancelInvitation: async (invitationId) => {
    const response = await fetch(`${API_URL}/invitations/${invitationId}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// Google API
export const googleAPI = {
  getAuthUrl: async () => {
    const response = await fetch(`${API_URL}/google/auth-url`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  getContacts: async (accessToken) => {
    const response = await fetch(`${API_URL}/google/contacts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ accessToken }),
    });
    return response.json();
  },

  getContactsWithCode: async (code) => {
    const response = await fetch(`${API_URL}/google/contacts-with-code`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ code }),
    });
    return response.json();
  },

  // AI learning — reads the user's own Pmail sent emails (no external OAuth needed)
  getLearningProfile: async () => {
    const response = await fetch(`${API_URL}/intelligence/learning-profile`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  runLearning: async () => {
    const response = await fetch(`${API_URL}/intelligence/learn`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Legacy Gmail OAuth stubs (kept for compatibility, not used without Google Cloud)
  getGmailAuthUrl: async () => { throw new Error('Gmail OAuth not configured'); },
  getGmailStatus: async () => ({ connected: false, lastSynced: null, learnedTopics: [] }),
  revokeGmailAccess: async () => {},
  syncGmailLearning: async () => {},
};
