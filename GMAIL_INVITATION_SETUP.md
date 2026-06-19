# Gmail Contacts Invitation System - Setup Guide

This guide explains how to set up and use the Gmail contacts invitation feature in Pmail.

## Features

✅ **Manual Invitation**: Send individual invitations to friends via email  
✅ **Google Contacts Import**: Import and invite all your Gmail contacts at once  
✅ **Bulk Invitations**: Select multiple contacts and invite them in one go  
✅ **Invitation Tracking**: View all sent invitations with their status  
✅ **Invitation Management**: Resend or cancel pending invitations  
✅ **Statistics Dashboard**: Track invitation success rate  

## Backend Setup

### 1. Database Migration

Run the Prisma migration to add the Invitation table:

```bash
cd server
npx prisma migrate dev --name add_invitations
npx prisma generate
```

### 2. Install Dependencies

Install the Google APIs package:

```bash
cd server
npm install googleapis
```

### 3. Configure Google OAuth

#### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Library**
4. Enable the following APIs:
   - **Google People API**
   - **Google+ API** (for user info)

#### Step 2: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Choose **Web application**
4. Configure:
   - **Name**: Pmail Gmail Integration
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (development)
     - Your production frontend URL
   - **Authorized redirect URIs**:
     - `http://localhost:5000/api/google/callback` (development)
     - Your production backend URL + `/api/google/callback`
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

#### Step 3: Update Environment Variables

Edit `server/.env` and add your credentials:

```env
GOOGLE_CLIENT_ID="your-actual-client-id-here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-actual-client-secret-here"
GOOGLE_REDIRECT_URI="http://localhost:5000/api/google/callback"
```

### 4. Start the Server

```bash
cd server
npm run dev
```

## Frontend Setup

No additional setup required for the frontend. The invitation feature is already integrated into the UI.

## Usage

### 1. Access the Invite Feature

- Log in to Pmail
- Click **"Invite Friends"** in the sidebar

### 2. Manual Invitation

1. Click the **"Manual Invite"** tab
2. Enter your friend's email address
3. Optionally add their name
4. Click **"Send Invitation"**

### 3. Import Gmail Contacts

1. Click the **"Import Contacts"** tab
2. Click **"Import from Google"**
3. Sign in with your Google account
4. Grant permissions to access your contacts
5. Select the contacts you want to invite
6. Click **"Send to X Contacts"**

### 4. View Invitation History

1. Click the **"Invitation History"** tab
2. View all sent invitations with their statuses:
   - **PENDING**: Invitation sent, waiting for acceptance
   - **ACCEPTED**: User has registered using the invite
   - **EXPIRED**: Invitation cancelled or expired
3. For pending invitations, you can:
   - **Resend**: Send the invitation email again
   - **Cancel**: Mark the invitation as expired

## API Endpoints

### Invitation Endpoints

```
POST   /api/invitations              # Send single invitation
POST   /api/invitations/bulk         # Send bulk invitations
GET    /api/invitations              # Get user's sent invitations
GET    /api/invitations/stats        # Get invitation statistics
POST   /api/invitations/:id/resend   # Resend invitation
DELETE /api/invitations/:id          # Cancel invitation
```

### Google OAuth Endpoints

```
GET    /api/google/auth-url                # Get OAuth authorization URL
GET    /api/google/callback                # OAuth callback handler
POST   /api/google/contacts                # Fetch contacts with access token
POST   /api/google/contacts-with-code     # Fetch contacts with auth code
```

## Security & Privacy

- User contacts are **never stored** on the server
- Contacts are only fetched when the user explicitly requests to import them
- Google OAuth tokens are used temporarily and not persisted
- Invitation codes are cryptographically secure (32 random bytes)
- All API endpoints require authentication

## Email Integration (Optional)

To send actual invitation emails, integrate an email service:

### Option 1: SendGrid

```bash
npm install @sendgrid/mail
```

```javascript
// In invitationController.js
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: invitation.email,
  from: 'noreply@pmail.com',
  subject: `${sender.name} invited you to join Pmail`,
  text: `Join Pmail using this invite code: ${invitation.inviteCode}`,
  html: `<strong>Join Pmail</strong><br>Invite code: ${invitation.inviteCode}`,
};

await sgMail.send(msg);
```

### Option 2: AWS SES

```bash
npm install @aws-sdk/client-ses
```

### Option 3: Nodemailer

```bash
npm install nodemailer
```

## Troubleshooting

### Google OAuth Issues

**Error: "redirect_uri_mismatch"**
- Ensure the redirect URI in Google Cloud Console matches your `.env` file exactly
- Include the protocol (`http://` or `https://`)

**Error: "Access blocked: This app's request is invalid"**
- Make sure Google People API is enabled in your project
- Verify OAuth consent screen is configured

**Error: "Invalid or expired access token"**
- The user needs to re-authorize the application
- Implement token refresh logic for production

### Database Issues

**Error: "Relation 'Invitation' does not exist"**
- Run `npx prisma migrate dev` to apply the schema changes
- Run `npx prisma generate` to regenerate the Prisma client

### CORS Issues

**Error: "CORS policy blocked"**
- Verify `CLIENT_URL` in `.env` matches your frontend URL
- Check that CORS is configured correctly in `server/src/index.js`

## Production Deployment

### Security Checklist

- [ ] Use HTTPS for all endpoints
- [ ] Update Google OAuth redirect URIs to production URLs
- [ ] Set strong `JWT_SECRET`
- [ ] Configure production `DATABASE_URL`
- [ ] Set appropriate CORS origins
- [ ] Implement rate limiting on invitation endpoints
- [ ] Add email verification for invitations
- [ ] Implement invitation expiration logic (e.g., 30 days)
- [ ] Add invitation quota per user (e.g., max 100 invitations per day)

### Environment Variables for Production

```env
NODE_ENV="production"
DATABASE_URL="your-production-database-url"
JWT_SECRET="your-very-secure-secret"
CLIENT_URL="https://pmail.yourdomain.com"
GOOGLE_CLIENT_ID="your-production-client-id"
GOOGLE_CLIENT_SECRET="your-production-client-secret"
GOOGLE_REDIRECT_URI="https://api.pmail.yourdomain.com/api/google/callback"
```

## Future Enhancements

- [ ] Add email templates for invitations
- [ ] Implement referral rewards system
- [ ] Add social sharing (WhatsApp, Twitter, etc.)
- [ ] Track invitation conversion rate
- [ ] Add invitation leaderboard
- [ ] Support for other email providers (Outlook, Yahoo)
- [ ] Implement invitation expiration dates
- [ ] Add invitation reminder emails

## Support

For issues or questions, please contact the development team or create an issue in the repository.
