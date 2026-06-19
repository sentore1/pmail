import { google } from 'googleapis';

// Initialize OAuth2 client
const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/google/callback'
  );
};

// Generate Google OAuth URL
export const getAuthUrl = async (req, res) => {
  try {
    const oauth2Client = getOAuth2Client();

    const scopes = [
      'https://www.googleapis.com/auth/contacts.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: req.user.id, // Pass user ID to associate with the callback
    });

    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
};

// Handle OAuth callback
export const handleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = state; // User ID from state parameter

    if (!code) {
      return res.status(400).send('Authorization code not provided');
    }

    const oauth2Client = getOAuth2Client();
    
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Redirect back to frontend with success message
    const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/contacts-imported?success=true`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/contacts-imported?success=false`;
    res.redirect(redirectUrl);
  }
};

// Fetch Google Contacts
export const getContacts = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const people = google.people({ version: 'v1', auth: oauth2Client });

    // Fetch contacts
    const response = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      personFields: 'names,emailAddresses,photos',
    });

    const contacts = response.data.connections || [];

    // Format contacts
    const formattedContacts = contacts
      .filter(contact => contact.emailAddresses && contact.emailAddresses.length > 0)
      .map(contact => ({
        name: contact.names?.[0]?.displayName || 'Unknown',
        email: contact.emailAddresses[0].value,
        photo: contact.photos?.[0]?.url || null,
      }));

    res.json({ contacts: formattedContacts });
  } catch (error) {
    console.error('Error fetching Google contacts:', error);
    
    if (error.code === 401) {
      return res.status(401).json({ 
        error: 'Invalid or expired access token',
        requiresReauth: true 
      });
    }

    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
};

// Alternative: Get contacts with authorization code
export const getContactsWithCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const oauth2Client = getOAuth2Client();
    
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const people = google.people({ version: 'v1', auth: oauth2Client });

    // Fetch contacts
    const response = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      personFields: 'names,emailAddresses,photos',
    });

    const contacts = response.data.connections || [];

    // Format contacts
    const formattedContacts = contacts
      .filter(contact => contact.emailAddresses && contact.emailAddresses.length > 0)
      .map(contact => ({
        name: contact.names?.[0]?.displayName || 'Unknown',
        email: contact.emailAddresses[0].value,
        photo: contact.photos?.[0]?.url || null,
      }));

    res.json({ contacts: formattedContacts });
  } catch (error) {
    console.error('Error fetching Google contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
};
