import { google } from 'googleapis';
import prisma from '../utils/prisma.js';

const getOAuth2Client = (opts = {}) => new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  opts.redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/google/callback'
);

// ── GET /api/google/auth-url  (contacts only) ──────────────────────────────
export const getAuthUrl = async (req, res) => {
  try {
    const oauth2Client = getOAuth2Client();

    const scopes = [
      'https://www.googleapis.com/auth/contacts.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: req.user.id,
    });

    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
};

// ── GET /api/google/gmail-auth-url  (sent mail AI learning) ───────────────
export const getGmailAuthUrl = async (req, res) => {
  try {
    const oauth2Client = getOAuth2Client({
      redirectUri: process.env.GOOGLE_GMAIL_REDIRECT_URI ||
        'http://localhost:5000/api/google/gmail-callback',
    });

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: req.user.id,
    });

    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating Gmail auth URL:', error);
    res.status(500).json({ error: 'Failed to generate Gmail auth URL' });
  }
};

// ── GET /api/google/callback ───────────────────────────────────────────────
// Public route — receives the OAuth code, fetches ALL contacts, then renders
// a tiny HTML page that calls window.opener.postMessage with the results
export const handleCallback = async (req, res) => {
  const { code, state: userId, error: oauthError } = req.query;

  if (oauthError || !code) {
    return res.send(buildPopupPage({ success: false, error: oauthError || 'No code received' }));
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const people = google.people({ version: 'v1', auth: oauth2Client });

    // Paginate through ALL contacts
    const allContacts = [];
    let pageToken = undefined;

    do {
      const response = await people.people.connections.list({
        resourceName: 'people/me',
        pageSize: 1000,
        personFields: 'names,emailAddresses,photos',
        ...(pageToken && { pageToken }),
      });
      const conns = response.data.connections || [];
      for (const c of conns) {
        if (!c.emailAddresses?.length) continue;
        allContacts.push({
          name:  c.names?.[0]?.displayName || '',
          email: c.emailAddresses[0].value,
          photo: c.photos?.[0]?.url || null,
        });
      }
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    // Also pull other contacts directory (Other Contacts) for maximum coverage
    try {
      let otherPageToken = undefined;
      do {
        const other = await people.otherContacts.list({
          pageSize: 1000,
          readMask: 'names,emailAddresses,photos',
          ...(otherPageToken && { pageToken: otherPageToken }),
        });
        for (const c of (other.data.otherContacts || [])) {
          if (!c.emailAddresses?.length) continue;
          allContacts.push({
            name:  c.names?.[0]?.displayName || '',
            email: c.emailAddresses[0].value,
            photo: c.photos?.[0]?.url || null,
          });
        }
        otherPageToken = other.data.nextPageToken;
      } while (otherPageToken);
    } catch { /* Other Contacts API may not be enabled — not fatal */ }

    // De-duplicate by email (case-insensitive)
    const seen = new Set();
    const unique = allContacts.filter(c => {
      const key = c.email.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.send(buildPopupPage({ success: true, contacts: unique, total: unique.length }));
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.send(buildPopupPage({ success: false, error: 'Failed to fetch contacts' }));
  }
};

// Tiny self-closing HTML page that sends results to the opener and closes itself
function buildPopupPage(payload) {
  const origin = process.env.CLIENT_URL || 'http://localhost:5173';
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Importing contacts…</title></head>
<body>
<p style="font-family:sans-serif;color:#374151;padding:24px">
  ${payload.success
    ? `✅ Imported ${payload.total} contacts. Closing…`
    : `❌ Error: ${payload.error}. Closing…`}
</p>
<script>
  try {
    window.opener && window.opener.postMessage(${json}, '${origin}');
  } catch(e) {}
  setTimeout(() => window.close(), 1200);
</script>
</body>
</html>`;
}

// ── POST /api/google/contacts (legacy — still supported) ──────────────────
export const getContacts = async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'Access token is required' });

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const people = google.people({ version: 'v1', auth: oauth2Client });
    const response = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      personFields: 'names,emailAddresses,photos',
    });

    const contacts = (response.data.connections || [])
      .filter(c => c.emailAddresses?.length)
      .map(c => ({
        name:  c.names?.[0]?.displayName || '',
        email: c.emailAddresses[0].value,
        photo: c.photos?.[0]?.url || null,
      }));

    res.json({ contacts });
  } catch (error) {
    console.error('Error fetching Google contacts:', error);
    if (error.code === 401) return res.status(401).json({ error: 'Invalid or expired access token', requiresReauth: true });
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
};

// ── POST /api/google/contacts-with-code (legacy) ───────────────────────────
export const getContactsWithCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Authorization code is required' });

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const people = google.people({ version: 'v1', auth: oauth2Client });
    const response = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      personFields: 'names,emailAddresses,photos',
    });

    const contacts = (response.data.connections || [])
      .filter(c => c.emailAddresses?.length)
      .map(c => ({
        name:  c.names?.[0]?.displayName || '',
        email: c.emailAddresses[0].value,
        photo: c.photos?.[0]?.url || null,
      }));

    res.json({ contacts });
  } catch (error) {
    console.error('Error in getContactsWithCode:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
};

// ── GET /api/google/gmail-callback ────────────────────────────────────────
// OAuth callback for Gmail sent-mail AI learning.
// Stores the refresh token on the user record so we can sync later.
export const handleGmailCallback = async (req, res) => {
  const gmailRedirectUri =
    process.env.GOOGLE_GMAIL_REDIRECT_URI ||
    'http://localhost:5000/api/google/gmail-callback';
  const { code, state: userId, error: oauthError } = req.query;
  const origin = process.env.CLIENT_URL || 'http://localhost:5173';

  if (oauthError || !code) {
    return res.send(buildGmailPopupPage(origin, { success: false, error: oauthError || 'No code received' }));
  }

  try {
    const oauth2Client = getOAuth2Client({ redirectUri: gmailRedirectUri });
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token && !tokens.access_token) {
      return res.send(buildGmailPopupPage(origin, { success: false, error: 'No tokens received' }));
    }

    // Persist refresh token so we can re-fetch without the user re-authorising
    await prisma.user.update({
      where: { id: userId },
      data: {
        gmailAccessEnabled: true,
        gmailRefreshToken: tokens.refresh_token || null,
      },
    });

    // Kick off initial learning (non-blocking)
    learnFromGmailSent(userId, tokens).catch(console.error);

    res.send(buildGmailPopupPage(origin, { success: true }));
  } catch (error) {
    console.error('Gmail OAuth callback error:', error);
    res.send(buildGmailPopupPage(origin, { success: false, error: 'Failed to connect Gmail' }));
  }
};

// ── POST /api/google/gmail-revoke ─────────────────────────────────────────
// User revokes Gmail access — clears stored token and disables the feature.
export const revokeGmailAccess = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (user?.gmailRefreshToken) {
      try {
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({ refresh_token: user.gmailRefreshToken });
        await oauth2Client.revokeCredentials();
      } catch { /* best-effort revocation */ }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        gmailAccessEnabled: false,
        gmailRefreshToken: null,
        gmailLastSynced: null,
      },
    });

    res.json({ message: 'Gmail access revoked successfully' });
  } catch (error) {
    console.error('Error revoking Gmail access:', error);
    res.status(500).json({ error: 'Failed to revoke Gmail access' });
  }
};

// ── POST /api/google/gmail-sync ───────────────────────────────────────────
// Manually trigger a Gmail sent-mail sync / re-learn.
export const syncGmailLearning = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user?.gmailAccessEnabled || !user?.gmailRefreshToken) {
      return res.status(400).json({ error: 'Gmail access not connected. Please connect Gmail first.' });
    }

    const tokens = { refresh_token: user.gmailRefreshToken };
    const result = await learnFromGmailSent(userId, tokens);

    res.json({
      message: 'Gmail sync complete',
      topicsLearned: result.topics,
      emailsAnalyzed: result.count,
    });
  } catch (error) {
    console.error('Gmail sync error:', error);
    res.status(500).json({ error: 'Failed to sync Gmail data' });
  }
};

// ── GET /api/google/gmail-status ──────────────────────────────────────────
export const getGmailStatus = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        gmailAccessEnabled: true,
        gmailLastSynced: true,
        gmailLearnedTopics: true,
      },
    });

    res.json({
      connected: user?.gmailAccessEnabled || false,
      lastSynced: user?.gmailLastSynced || null,
      learnedTopics: user?.gmailLearnedTopics
        ? JSON.parse(user.gmailLearnedTopics)
        : [],
    });
  } catch (error) {
    console.error('Error fetching Gmail status:', error);
    res.status(500).json({ error: 'Failed to fetch Gmail status' });
  }
};

// ── Internal: fetch sent mail and extract topics / writing signals ─────────
async function learnFromGmailSent(userId, tokens) {
  const gmailRedirectUri =
    process.env.GOOGLE_GMAIL_REDIRECT_URI ||
    'http://localhost:5000/api/google/gmail-callback';

  const oauth2Client = getOAuth2Client({ redirectUri: gmailRedirectUri });
  oauth2Client.setCredentials(tokens);

  // Auto-refresh tokens when expired
  oauth2Client.on('tokens', async (newTokens) => {
    if (newTokens.refresh_token) {
      await prisma.user.update({
        where: { id: userId },
        data: { gmailRefreshToken: newTokens.refresh_token },
      });
    }
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Fetch up to 100 sent messages for initial learning
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    labelIds: ['SENT'],
    maxResults: 100,
  });

  const messages = listRes.data.messages || [];
  const topics = new Map(); // topic → count
  let analyzedCount = 0;

  const TOPIC_KEYWORDS = {
    tech:       ['code','software','api','bug','deploy','server','database','feature','git','dev','engineer'],
    business:   ['meeting','invoice','proposal','contract','client','project','deadline','budget','team','revenue'],
    creative:   ['design','logo','brand','creative','artwork','photo','video','content','write','edit'],
    health:     ['health','medical','doctor','appointment','medicine','wellness','fitness','diet'],
    finance:    ['payment','invoice','salary','tax','investment','budget','expense','cost','price'],
    personal:   ['lunch','dinner','party','trip','vacation','family','friend','birthday','weekend'],
    education:  ['course','class','study','research','paper','university','degree','certificate'],
    legal:      ['contract','agreement','terms','legal','attorney','lawsuit','compliance','gdpr'],
  };

  for (const msg of messages.slice(0, 100)) {
    try {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'To'],
      });

      const subject = detail.data.payload?.headers?.find(h => h.name === 'Subject')?.value || '';
      const combined = subject.toLowerCase();

      for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
        if (keywords.some(kw => combined.includes(kw))) {
          topics.set(topic, (topics.get(topic) || 0) + 1);
        }
      }
      analyzedCount++;
    } catch { /* skip individual message errors */ }
  }

  // Convert to sorted list (most frequent first)
  const topicList = Array.from(topics.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic);

  // Merge with any existing intelligence interests
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { interests: true },
  });

  const existingInterests = user?.interests ? JSON.parse(user.interests) : [];
  const merged = [...new Set([...topicList, ...existingInterests])];

  await prisma.user.update({
    where: { id: userId },
    data: {
      gmailLearnedTopics: JSON.stringify(topicList),
      gmailLastSynced: new Date(),
      // Merge into main interests so autopilot can use them
      interests: JSON.stringify(merged),
    },
  });

  return { topics: topicList, count: analyzedCount };
}

// Tiny self-closing HTML page for Gmail OAuth popup
function buildGmailPopupPage(origin, payload) {
  const json = JSON.stringify({ ...payload, gmailAuth: true }).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${payload.success ? 'Gmail connected' : 'Connection failed'}</title></head>
<body>
<p style="font-family:sans-serif;color:#374151;padding:24px">
  ${payload.success
    ? '✅ Gmail connected. Learning from your sent emails… Closing.'
    : `❌ Error: ${payload.error}. Closing.`}
</p>
<script>
  try {
    window.opener && window.opener.postMessage(${json}, '${origin}');
  } catch(e) {}
  setTimeout(() => window.close(), 1500);
</script>
</body>
</html>`;
}
