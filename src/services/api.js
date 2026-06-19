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
    return response.json();
  },

  login: async (email, password) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  },

  getMe: async () => {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return response.json();
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
    return response.json();
  },

  getRequests: async (filter = 'all') => {
    const response = await fetch(`${API_URL}/knocc/requests?filter=${filter}`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  respondToRequest: async (id, action) => {
    const response = await fetch(`${API_URL}/knocc/requests/${id}/respond`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action }),
    });
    return response.json();
  },
};

// User API
export const userAPI = {
  searchUsers: async (query) => {
    const response = await fetch(`${API_URL}/users/search?query=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  getContacts: async () => {
    const response = await fetch(`${API_URL}/users/contacts`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  getBlockedUsers: async () => {
    const response = await fetch(`${API_URL}/users/blocked`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  blockUser: async (userId) => {
    const response = await fetch(`${API_URL}/users/block/${userId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  unblockUser: async (userId) => {
    const response = await fetch(`${API_URL}/users/block/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  updateProfile: async (profileData) => {
    const response = await fetch(`${API_URL}/users/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData),
    });
    return response.json();
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
    return response.json();
  },

  createLightningInvoice: async (amount) => {
    const response = await fetch(`${API_URL}/wallet/create-invoice`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount }),
    });
    return response.json();
  },

  checkInvoiceStatus: async (invoiceId) => {
    const response = await fetch(`${API_URL}/wallet/invoice/${invoiceId}/status`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  withdrawFunds: async (amount, paymentRequest = null) => {
    const response = await fetch(`${API_URL}/wallet/withdraw`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount, paymentRequest }),
    });
    return response.json();
  },

  getBalance: async () => {
    const response = await fetch(`${API_URL}/wallet/balance`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  getTransactions: async () => {
    const response = await fetch(`${API_URL}/wallet/transactions`, {
      headers: getAuthHeaders(),
    });
    return response.json();
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
    return response.json();
  },

  sendBulkInvitations: async (contacts) => {
    const response = await fetch(`${API_URL}/invitations/bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ contacts }),
    });
    return response.json();
  },

  getSentInvitations: async (status = null) => {
    const url = status 
      ? `${API_URL}/invitations?status=${status}` 
      : `${API_URL}/invitations`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  getInvitationStats: async () => {
    const response = await fetch(`${API_URL}/invitations/stats`, {
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  resendInvitation: async (invitationId) => {
    const response = await fetch(`${API_URL}/invitations/${invitationId}/resend`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return response.json();
  },

  cancelInvitation: async (invitationId) => {
    const response = await fetch(`${API_URL}/invitations/${invitationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return response.json();
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
};
