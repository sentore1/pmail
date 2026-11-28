# Email System Flow - Complete Explanation

## Overview
Pryro has a sophisticated email system that handles both **internal emails** (between Pryro users) and **external emails** (to/from Gmail, Yahoo, etc.) with pay-to-reply functionality and form support.

---

## 1. 🖊️ Composing an Email (ComposeModal.jsx)

### How the Compose Modal Works:

#### **Opening the Composer**
- Click the **"Write Email"** button in the UI
- The `ComposeModal` component opens with:
  - **To field** - Add recipients (internal or external)
  - **CC/BCC fields** - Optional carbon copy fields
  - **Subject line**
  - **Rich text editor** - Supports formatting, images, attachments, emojis, tables, etc.
  - **Form builder** - Insert interactive forms (contact forms, feedback forms)

#### **Recipient Handling**
The system intelligently detects recipient types:

1. **Internal Pryro Users (Contacts)**
   - Shows autocomplete suggestions from your contact list
   - Marked as "approved" if already a contact
   - No extra fees required

2. **Internal Pryro Users (Not Contacts)**
   - System detects they're registered on Pryro
   - **Requires Knocc payment** to send (unless free)
   - Opens payment modal before sending

3. **External Email Addresses (Gmail, Yahoo, etc.)**
   - Any email not registered on Pryro
   - Sent via **SMTP** (email protocol)
   - Can enable **Pay-to-Reply** feature (recipient pays to respond)

#### **Rich Text Features**
The composer supports:
- Text formatting (bold, italic, underline)
- Lists (bullet points, numbered)
- Links and images
- File attachments
- Tables
- Code blocks
- Emojis
- Font selection

#### **Interactive Forms**
You can insert forms directly in emails:
- Contact forms (name, email, message)
- Feedback forms (ratings, comments)
- Custom fields (text inputs, textareas, radio buttons)
- Form data is captured when recipient fills them out

---

## 2. 📤 Sending Emails

### Internal Email Flow (Pryro to Pryro)

**Location**: `server/src/controllers/emailController.js` → `sendEmail()`

```javascript
1. User clicks "Send" in ComposeModal
2. Frontend calls: POST /api/emails/send
3. Backend validates:
   - At least one recipient exists
   - Subject is not empty
   - Contact relationships are valid
4. Email record created in database
5. Recipients resolved:
   - Check if each email is a registered Pryro user
   - Verify contact approval status
   - Check chat expiry (if set by recipient)
6. Email appears in recipient's inbox immediately
7. Sender sees email in "Sent" folder
```

**Code Flow**:
```javascript
// 1. Create email in database
const email = await prisma.email.create({
  data: {
    subject,
    body,
    senderId,
    isDraft: false,
    payToReplyEnabled,
    replyFee,
    attachments: {...}
  }
})

// 2. Resolve recipients (internal vs external)
for (const recipientEmail of to) {
  const user = await prisma.user.findUnique({ where: { email: recipientEmail } })
  if (user) {
    // Internal recipient - check contact approval
    const contact = await prisma.contact.findUnique({...})
    if (contact) {
      recipientRows.push({ emailId: email.id, recipientId: user.id, type: 'TO' })
    }
  } else {
    // External recipient - add to SMTP queue
    externalRecipients.push({ email: recipientEmail, type: 'TO' })
  }
}
```

---

### External Email Flow (Pryro to Gmail/etc.)

**Location**: `server/src/services/emailService.js` → `sendExternalEmail()`

```javascript
1. System detects recipient is not on Pryro
2. Generates unique reply token
3. Creates PayToReplyInvitation record
4. Sends email via SMTP:
   - Uses Mailcow SMTP (if configured)
   - Falls back to generic SMTP
   - Dev mode: Uses Ethereal (test inbox)
5. Email includes:
   - Original message content
   - "Reply" button linking to Pryro
   - Pay-to-Reply fee (if enabled)
```

**SMTP Configuration Priority**:
1. **Mailcow SMTP** (production) - `mail.pryro.com:587`
2. **Generic SMTP** - Custom SMTP server
3. **Ethereal** (dev) - Test email service with preview URLs

**Email Template Sent to External Recipients**:
```html
<div>
  <header style="background:#4f46e5">
    <h1>Pmail</h1>
    <p>You received a message from [Sender Name]</p>
  </header>
  <div>
    <h2>[Subject]</h2>
    <div>[Message Body - Full HTML]</div>
    <hr>
    <p>To reply to this email, a fee of $X.XX is required.</p>
    <a href="https://pryro.com/?reply=TOKEN_HERE">
      Pay $X.XX & Reply
    </a>
  </div>
</div>
```

**Code Example**:
```javascript
// Generate reply token
const replyToken = crypto.randomBytes(32).toString('hex')

// Create invitation record
await prisma.payToReplyInvitation.create({
  data: {
    emailId: email.id,
    senderId,
    externalEmail: ext.email,
    replyFee: fee,
    replyToken,
    status: 'PENDING'
  }
})

// Send via SMTP
await sendExternalEmail({
  to: 'user@gmail.com',
  senderName: 'John Doe',
  subject: 'Meeting Tomorrow',
  body: '<p>Hi! Are you free tomorrow?</p>',
  replyUrl: `https://pryro.com/?reply=${replyToken}`,
  replyFee: 1.00
})
```

---

## 3. 📥 Receiving Emails

### Internal Email (Pryro to Pryro)
- Emails appear instantly in inbox
- No SMTP involved (direct database insert)
- Stored in `Email` and `EmailRecipient` tables

### External Email (Gmail/etc. to Pryro)

**Two Methods**:

#### **Method 1: Inbound SMTP Server** (Self-hosted)
**Location**: `server/src/services/inboundSmtpServer.js`

```javascript
// Server listens on port 2525 (configurable)
1. External sender (Gmail) sends email to: user@pryro.com
2. MX record points to your server
3. SMTP server receives raw email
4. Parses email (from, to, subject, body)
5. Calls processInboundEmail()
6. Creates InboundRequest record
7. Notifies Pryro user
8. User can accept/decline (may require payment)
```

**Configuration**:
```env
# Enable inbound SMTP on port 2525
INBOUND_SMTP_PORT=2525
```

**MX Record Setup**:
```
# Point domain's MX record to your server
pryro.com.  IN  MX  10  mail.pryro.com.
```

#### **Method 2: Email Gateway Webhook** (Recommended for production)
**Location**: `server/src/controllers/inboundController.js` → `inboundWebhook()`

Use services like SendGrid, Postmark, or Mailgun:
```javascript
1. Configure SendGrid Inbound Parse
2. Point to: https://pryro.com/api/inbound/webhook
3. SendGrid forwards emails as POST requests
4. processInboundEmail() handles the email
5. Same flow as SMTP method
```

**SendGrid Setup**:
```
1. Go to SendGrid → Settings → Inbound Parse
2. Add subdomain: inbound.pryro.com
3. Destination URL: https://pryro.com/api/inbound/webhook
4. Update MX record to point to SendGrid
```

---

### Inbound Email Processing Flow

**Location**: `server/src/controllers/inboundController.js` → `processInboundEmail()`

```javascript
export const processInboundEmail = async ({
  recipientEmail,  // user@pryro.com
  externalEmail,   // sender@gmail.com
  externalName,    // "John Smith"
  subject,
  body
}) => {
  // 1. Find Pryro recipient
  const recipient = await prisma.user.findUnique({
    where: { email: recipientEmail }
  })
  
  if (!recipient) {
    throw { status: 404, message: 'No Pryro user at that address' }
  }
  
  // 2. Check if sender is approved contact
  const isContact = await prisma.contact.findFirst({
    where: {
      userId: recipient.id,
      contact: { email: externalEmail }
    }
  })
  
  if (isContact) {
    // 3A. Approved contact - deliver directly
    await prisma.email.create({
      data: {
        subject,
        body,
        externalSenderEmail: externalEmail,
        externalSenderName: externalName,
        recipients: {
          create: { recipientId: recipient.id, type: 'TO' }
        }
      }
    })
    return
  }
  
  // 3B. Unknown sender - create inbound request
  const inboundFee = recipient.inboundEmailFee || 0
  const payToken = generatePayToken()
  
  const request = await prisma.inboundRequest.create({
    data: {
      recipientId: recipient.id,
      externalEmail,
      externalName,
      subject,
      body,
      payToken,
      inboundFee,
      status: 'PENDING'
    }
  })
  
  // 4. Send payment request to external sender
  if (inboundFee > 0) {
    await sendPaymentRequestEmail({
      to: externalEmail,
      senderName: externalName,
      recipientName: recipient.name,
      subject,
      inboundFee,
      payUrl: `https://pryro.com/inbound/pay/${payToken}`
    })
  } else {
    // Free - notify recipient to approve/decline
    await sendInboundNotificationEmail({
      to: recipient.email,
      recipientName: recipient.name,
      senderName: externalName,
      senderEmail: externalEmail,
      subject
    })
  }
}
```

---

## 4. 💰 Pay-to-Reply System

### For Outbound Emails (Pryro → External)

**Scenario**: You send an email to someone@gmail.com with $2 reply fee

```javascript
1. Enable "Pay to Reply" toggle in compose modal
2. Set reply fee (e.g., $2.00)
3. Email sent with unique reply token
4. External recipient clicks "Reply" button
5. Lands on: https://pryro.com/?reply=TOKEN_HERE
6. Sees payment page (Stripe/MoMo)
7. Pays $2.00
8. Gets access to reply form
9. Submits reply
10. Reply appears in your Pryro inbox
```

**Frontend Flow**:
```jsx
// In ComposeModal.jsx
<div>
  <label>
    <input 
      type="checkbox"
      checked={payToReplyEnabled}
      onChange={(e) => setPayToReplyEnabled(e.target.checked)}
    />
    Enable Pay-to-Reply
  </label>
  
  {payToReplyEnabled && (
    <input
      type="number"
      value={replyFee}
      onChange={(e) => setReplyFee(e.target.value)}
      placeholder="Reply fee (USD)"
    />
  )}
</div>
```

---

### For Inbound Emails (External → Pryro)

**Scenario**: Someone@gmail.com emails you@pryro.com (you have $5 inbound fee)

```javascript
1. External sender emails you@pryro.com
2. Inbound SMTP server receives email
3. Checks if sender is in your contacts
4. If not, creates InboundRequest
5. Sends payment email to sender
6. Sender clicks payment link
7. Pays $5.00 via Stripe/MoMo
8. Payment confirmed
9. Email delivered to your inbox
10. Sender added as temporary contact
```

**Backend Flow**:
```javascript
// When external email arrives
const inboundFee = recipient.inboundEmailFee || 0

if (inboundFee > 0) {
  // Send payment request
  await sendPaymentRequestEmail({
    to: externalEmail,
    subject: 'Payment Required to Deliver Your Email',
    payUrl: `${CLIENT_URL}/inbound/pay/${payToken}`,
    inboundFee
  })
} else {
  // Free inbound - just notify recipient
  // Recipient must manually accept/decline
}
```

---

## 5. 📋 Form System in Emails

### How Forms Work

**Location**: ComposeModal.jsx → "Insert Template" → "Form" tab

```javascript
// User inserts form template
const formHTML = `
<div class="pmail-form">
  <div class="form-field">
    <label>Full Name</label>
    <input 
      type="text" 
      name="fullName" 
      placeholder="Enter your full name"
      style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;"
    />
  </div>
  
  <div class="form-field">
    <label>Email Address</label>
    <input 
      type="email" 
      name="email" 
      placeholder="Enter your email"
      style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;"
    />
  </div>
  
  <div class="form-field">
    <label>Message</label>
    <textarea 
      name="message"
      placeholder="Write your message here..."
      style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;min-height:100px;"
    ></textarea>
  </div>
  
  <button style="background:#4f46e5;color:#fff;padding:10px 20px;border:none;border-radius:6px;">
    Submit
  </button>
</div>
`

// Form is sent as part of email body
// Recipient can fill it out and submit
```

**Form Types Available**:
1. **Contact Form** - Name, Email, Message
2. **Feedback Form** - Name, Email, Rating (1-5 stars), Comments
3. **Custom Forms** - Build your own with text, textarea, radio, checkbox fields

**How Recipients Interact**:
1. Receive email with embedded form
2. Fill out fields in their email client (or Pryro inbox)
3. Click "Submit"
4. Form data sent back to sender
5. Sender receives response as email or structured data

---

## 6. 🔄 Email Status & Storage

### Database Schema (Simplified)

```prisma
model Email {
  id        String   @id @default(uuid())
  subject   String
  body      String   // HTML content
  senderId  String?  // null = external sender
  isDraft   Boolean  @default(false)
  sentAt    DateTime @default(now())
  
  // Pay-to-reply settings
  payToReplyEnabled Boolean @default(false)
  replyFee          Float   @default(0)
  
  // External sender info (for inbound emails)
  externalSenderEmail String?
  externalSenderName  String?
  
  sender      User?            @relation("SentEmails", fields: [senderId])
  recipients  EmailRecipient[]
  attachments Attachment[]
  stars       EmailStar[]
  deletes     EmailDelete[]
}

model EmailRecipient {
  id          String @id @default(uuid())
  emailId     String
  recipientId String
  type        String // "TO", "CC", "BCC"
  
  email     Email @relation(fields: [emailId])
  recipient User  @relation(fields: [recipientId])
}

model PayToReplyInvitation {
  id            String   @id @default(uuid())
  emailId       String
  senderId      String
  externalEmail String
  replyFee      Float
  replyToken    String   @unique
  status        String   // "PENDING", "PAID", "REPLIED"
  paidAt        DateTime?
  
  email  Email @relation(fields: [emailId])
  sender User  @relation(fields: [senderId])
}

model InboundRequest {
  id              String   @id @default(uuid())
  recipientId     String
  externalEmail   String
  externalName    String?
  subject         String
  body            String
  payToken        String   @unique
  inboundFee      Float    @default(0)
  status          String   // "PENDING", "PAID", "ACCEPTED", "DECLINED"
  paidAt          DateTime?
  respondedAt     DateTime?
  createdAt       DateTime @default(now())
  
  recipient User @relation(fields: [recipientId])
}
```

---

## 7. 🧪 Testing the Email System

### Test Scenario 1: Send Email Within Pryro (Internal)

```bash
# Prerequisites
1. Create two Pryro accounts (user1@pryro.com, user2@pryro.com)
2. Add each other as contacts

# Test Steps
1. Login as user1@pryro.com
2. Click "Write Email"
3. Type "user2" in To field
4. Select user2@pryro.com from autocomplete
5. Enter subject: "Test Internal Email"
6. Write message: "Hi! This is a test."
7. Click "Send"

# Expected Result
✅ Email appears in user1's "Sent" folder
✅ Email appears in user2's "Inbox" folder
✅ No SMTP involved (direct database insert)
```

---

### Test Scenario 2: Send Email to External (Gmail)

```bash
# Prerequisites
1. Configure SMTP in server/.env:
   - For dev: Leave SMTP_HOST blank (uses Ethereal)
   - For production: Set MAILCOW_SMTP_HOST or SMTP_HOST

# Test Steps
1. Login to Pryro
2. Click "Write Email"
3. Type external email: "yourfriend@gmail.com"
4. Enable "Pay-to-Reply" toggle
5. Set reply fee: "$1.00"
6. Enter subject: "Hello from Pryro"
7. Write message: "Testing external email!"
8. Click "Send"

# Expected Result (Dev Mode - Ethereal)
✅ Check server console for preview URL:
   "📧 Ethereal preview: https://ethereal.email/message/xxx"
✅ Click link to view email in Ethereal inbox
✅ See "Pay $1.00 & Reply" button

# Expected Result (Production - Real SMTP)
✅ Email delivered to yourfriend@gmail.com
✅ Gmail shows email from: noreply@pryro.com (or your@pryro.com)
✅ Email includes Pryro branding and reply button
```

---

### Test Scenario 3: Receive Email from External (Gmail → Pryro)

#### **Method A: Using Inbound SMTP Server**

```bash
# Setup
1. Enable inbound SMTP:
   server/.env: INBOUND_SMTP_PORT=2525
   
2. Configure MX record (production) or use port forwarding (dev):
   # Production
   pryro.com.  IN  MX  10  mail.pryro.com.
   
   # Dev (use ngrok or similar)
   ngrok tcp 2525
   # Note the forwarding address
   
3. Send test email from Gmail to: user@pryro.com

# Expected Result
✅ Server logs: "📬 Inbound email processed: sender@gmail.com → user@pryro.com"
✅ If sender not in contacts:
   - Creates InboundRequest
   - Sends payment email to sender (if inbound fee > 0)
   - Sender must pay to deliver email
✅ If sender is contact:
   - Email appears directly in inbox
```

#### **Method B: Using Webhook (SendGrid/Postmark)**

```bash
# Setup
1. Configure SendGrid Inbound Parse
2. Point to: https://your-domain.com/api/inbound/webhook
3. Send test email from Gmail

# Test with curl (simulate webhook)
curl -X POST http://localhost:5000/api/inbound/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "sender@gmail.com",
    "to": "user@pryro.com",
    "subject": "Test Inbound",
    "html": "<p>Hello from Gmail!</p>"
  }'

# Expected Result
✅ POST /api/inbound/webhook returns 200 OK
✅ processInboundEmail() called
✅ Email delivered or payment requested
```

---

### Test Scenario 4: Pay-to-Reply Flow

```bash
# Prerequisites
1. Send email to external recipient with $2 reply fee
2. External recipient receives email

# Test Steps
1. External recipient opens email (Gmail)
2. Clicks "Pay $2.00 & Reply" button
3. Lands on: https://pryro.com/?reply=TOKEN_HERE
4. Sees payment page (Stripe or MoMo)
5. Enters payment details
6. Submits payment
7. Payment confirmed
8. Reply form appears
9. Types reply message
10. Clicks "Send Reply"

# Expected Result
✅ Payment processed (Stripe/MoMo)
✅ PayToReplyInvitation status: "PENDING" → "PAID" → "REPLIED"
✅ Reply delivered to original sender's Pryro inbox
✅ Reply shows as from: sender@gmail.com (external)
```

---

### Test Scenario 5: Form in Email

```bash
# Test Steps
1. Click "Write Email"
2. Enter recipient
3. Click "Templates" button (📄 icon)
4. Click "Forms" tab
5. Select "Contact Form"
6. Form inserted into email body
7. Click "Send"

# Expected Result
✅ Email sent with embedded form
✅ Recipient sees:
   - Full Name field
   - Email field
   - Message textarea
   - Submit button
✅ Recipient fills form and clicks "Submit"
✅ Form data sent back to sender
✅ Sender receives email with form responses
```

---

## 8. 🔧 Configuration & Environment

### SMTP Configuration (server/.env)

```env
# ── Mailcow (Recommended for Production) ──
MAILCOW_API_URL="https://mail.pryro.com"
MAILCOW_API_KEY="your-mailcow-api-key"
MAIL_DOMAIN="pryro.com"
MAILCOW_SMTP_HOST="mail.pryro.com"
MAILCOW_SMTP_PORT=587
MAILCOW_SMTP_SECURE=false
MAILCOW_SMTP_USER="noreply@pryro.com"
MAILCOW_SMTP_PASS="your-password"

# ── Generic SMTP (Alternative) ──
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM_NAME="Pmail"
SMTP_FROM_EMAIL="noreply@pmail.app"

# ── Inbound SMTP (Optional) ──
INBOUND_SMTP_PORT=2525  # Set to enable, blank to disable
```

### How SMTP Priority Works

```javascript
// In emailService.js → getTransporter()

if (MAILCOW_SMTP_HOST && MAILCOW_SMTP_USER) {
  // 1. Try Mailcow first (production setup)
  transporter = nodemailer.createTransport({...mailcow config})
} 
else if (SMTP_HOST && SMTP_USER) {
  // 2. Fall back to generic SMTP
  transporter = nodemailer.createTransport({...smtp config})
} 
else {
  // 3. Dev mode: Use Ethereal (test email)
  transporter = nodemailer.createTransport({...ethereal config})
  console.log('📧 Using Ethereal - Preview URLs will be logged')
}
```

---

## 9. 🚀 Production Deployment Checklist

### Email Sending (Outbound)
- [ ] Configure Mailcow or SMTP credentials in `server/.env`
- [ ] Test email delivery to Gmail, Yahoo, Outlook
- [ ] Verify SPF, DKIM, DMARC records for domain
- [ ] Set up email authentication (prevents spam folder)

### Email Receiving (Inbound)
- [ ] Choose method: Self-hosted SMTP OR Email gateway
- [ ] **Self-hosted**: Enable `INBOUND_SMTP_PORT`, configure MX record
- [ ] **Gateway**: Configure SendGrid/Postmark webhook to `/api/inbound/webhook`
- [ ] Test receiving emails from external addresses
- [ ] Verify pay-to-inbox flow (if inbound fees enabled)

### Pay-to-Reply System
- [ ] Configure Stripe API keys (`STRIPE_SECRET_KEY`)
- [ ] Configure MTN MoMo credentials (`MOMO_SUBSCRIPTION_KEY`, etc.)
- [ ] Test payment flow end-to-end
- [ ] Verify reply delivery after payment

### Forms & Attachments
- [ ] Test form rendering in different email clients
- [ ] Verify attachment upload/download
- [ ] Check attachment size limits (default: 10MB)

### Security
- [ ] Enable HTTPS for all endpoints
- [ ] Set strong `JWT_SECRET`, `ADMIN_SECRET`, `WEBHOOK_SECRET`
- [ ] Rate limit email sending (prevent spam)
- [ ] Validate recipient email formats
- [ ] Sanitize HTML in email bodies (prevent XSS)

---

## 10. 📊 Monitoring & Logs

### Server Logs (What to Watch)

```bash
# SMTP Transport
📧 Mailcow SMTP transport configured for mail.pryro.com
📧 SMTP transport configured for smtp.gmail.com:587
📧 Using Ethereal test email (dev mode)

# Email Sent
📧 External email sent to user@gmail.com (messageId: <xxx@ethereal.email>)
📧 Ethereal preview: https://ethereal.email/message/xxx

# Inbound SMTP
📬 Inbound SMTP server listening on port 2525
📬 Inbound email processed: sender@gmail.com → user@pryro.com

# Errors
❌ Failed to send external email to user@gmail.com: Connection timeout
❌ Inbound SMTP parse error: Invalid email format
```

### Database Queries to Monitor

```sql
-- Check pending pay-to-reply invitations
SELECT * FROM PayToReplyInvitation WHERE status = 'PENDING';

-- Check pending inbound requests
SELECT * FROM InboundRequest WHERE status = 'PENDING';

-- Count emails sent today
SELECT COUNT(*) FROM Email WHERE sentAt >= CURRENT_DATE AND isDraft = false;

-- Check failed external deliveries
SELECT * FROM Email WHERE id NOT IN (
  SELECT emailId FROM PayToReplyInvitation WHERE status != 'FAILED'
);
```

---

## 11. 🐛 Common Issues & Solutions

### Issue: Email not sent to external address

**Symptoms**: 
- No error shown
- Email not in Gmail inbox
- Server logs show success

**Solutions**:
1. Check SMTP credentials in `server/.env`
2. Verify firewall allows SMTP port (587 or 465)
3. Check spam folder in Gmail
4. Configure SPF/DKIM records for domain
5. Use Ethereal mode to test: Set `SMTP_HOST=""` temporarily

---

### Issue: Inbound emails not received

**Symptoms**:
- Send email to user@pryro.com
- Nothing appears in Pryro inbox
- No logs on server

**Solutions**:
1. Check `INBOUND_SMTP_PORT` is set in `server/.env`
2. Verify MX record points to your server
3. Test with curl webhook method instead
4. Check firewall allows inbound SMTP port
5. Enable debug logs in `inboundSmtpServer.js`

---

### Issue: Pay-to-reply button not working

**Symptoms**:
- External recipient clicks button
- Lands on 404 page
- Or payment form doesn't load

**Solutions**:
1. Check `CLIENT_URL` in `server/.env` matches frontend URL
2. Verify reply token generated: `SELECT * FROM PayToReplyInvitation`
3. Check Stripe/MoMo keys are configured
4. Test payment gateway in Stripe dashboard
5. Verify reply token in URL matches database

---

### Issue: Forms not rendering in email

**Symptoms**:
- Form fields appear as plain text
- Submit button doesn't work
- Styling broken

**Solutions**:
1. Check email client supports HTML (most do)
2. Use inline CSS (email clients strip `<style>` tags)
3. Test in multiple clients (Gmail, Outlook, Apple Mail)
4. Avoid JavaScript (email clients block it)
5. Use tables for layout (better email client support)

---

## 12. 🎯 Key Takeaways

### How Email Works in Pryro:

1. **Internal emails** (Pryro → Pryro) = Instant, no SMTP, database only
2. **External emails** (Pryro → Gmail) = SMTP protocol, Mailcow/Ethereal
3. **Inbound emails** (Gmail → Pryro) = SMTP server OR webhook gateway
4. **Pay-to-reply** = Unique token + payment gateway (Stripe/MoMo)
5. **Forms** = HTML embedded in email body, submitted as replies
6. **Attachments** = Base64 encoded in database OR file system

### Architecture Summary:

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRYRO EMAIL SYSTEM                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │  Compose UI  │───▶│   Backend    │───▶│   Database   │     │
│  │ (React JSX)  │    │ (Node/Express│    │  (Prisma)    │     │
│  └──────────────┘    │   + Prisma)  │    └──────────────┘     │
│                      └───┬──────┬───┘                          │
│                          │      │                               │
│                 Internal │      │ External                      │
│                   Email  │      │  Email                        │
│                          ▼      ▼                               │
│                  ┌───────────────────┐                          │
│                  │   Direct Insert   │  ┌──────────────┐       │
│                  │   to Recipient    │  │ SMTP Service │       │
│                  │   Inbox           │  │ (Nodemailer) │       │
│                  └───────────────────┘  └──────┬───────┘       │
│                                                 │               │
│                                                 ▼               │
│                                        ┌────────────────┐       │
│                                        │ Email Gateway  │       │
│                                        │ (Mailcow/      │       │
│                                        │  Ethereal)     │       │
│                                        └────────┬───────┘       │
│                                                 │               │
│                                                 ▼               │
│                                        ┌────────────────┐       │
│                                        │ External Inbox │       │
│                                        │ (Gmail, Yahoo) │       │
│                                        └────────────────┘       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  INBOUND EMAILS (Gmail → Pryro)                         │   │
│  │  ┌────────────┐    ┌──────────────┐    ┌────────────┐  │   │
│  │  │  External  │───▶│ SMTP Server  │───▶│  Inbound   │  │   │
│  │  │   Sender   │    │  OR Webhook  │    │ Controller │  │   │
│  │  │  (Gmail)   │    │   Gateway    │    │            │  │   │
│  │  └────────────┘    └──────────────┘    └─────┬──────┘  │   │
│  │                                               │         │   │
│  │                                               ▼         │   │
│  │                                   ┌────────────────────┐│   │
│  │                                   │ Create Inbound     ││   │
│  │                                   │ Request (may       ││   │
│  │                                   │ require payment)   ││   │
│  │                                   └────────────────────┘│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 13. 🧩 Code References

### Key Files:
- **Frontend Compose**: `src/components/ComposeModal.jsx` (lines 1-1577)
- **Email Controller**: `server/src/controllers/emailController.js` (lines 56-228)
- **SMTP Service**: `server/src/services/emailService.js` (lines 1-250)
- **Inbound Controller**: `server/src/controllers/inboundController.js` (lines 162-620)
- **Inbound SMTP Server**: `server/src/services/inboundSmtpServer.js` (lines 1-100)
- **Database Schema**: `server/prisma/schema.prisma`

### API Endpoints:
```javascript
// Outbound
POST   /api/emails/send              → Send email (internal or external)
POST   /api/emails/drafts            → Save draft
GET    /api/emails/inbox             → Get inbox
GET    /api/emails/sent              → Get sent emails

// Inbound
POST   /api/inbound/webhook          → Receive external email (gateway)
POST   /api/inbound/submit           → Submit reply via pay-to-reply
GET    /api/inbound/requests         → List inbound requests
POST   /api/inbound/accept/:id       → Accept inbound request
POST   /api/inbound/decline/:id      → Decline inbound request

// Pay-to-Reply
GET    /api/pay-to-reply/:token      → Get pay-to-reply details
POST   /api/pay-to-reply/:token/pay  → Process payment
POST   /api/pay-to-reply/:token/reply → Submit reply after payment
```

---

## 🎉 Summary

Pryro's email system is a **hybrid architecture**:
- **Internal emails** = Fast, direct database inserts (no SMTP)
- **External emails** = Traditional SMTP protocol with pay-to-reply monetization
- **Forms** = Rich HTML embedded in emails for interactive responses
- **Pay-to-Reply** = Unique token-based system for monetizing replies
- **Inbound** = SMTP server or webhook gateway for receiving external emails

The system seamlessly handles both Pryro-to-Pryro and Pryro-to-World communication while enabling monetization through pay-to-reply and inbound fees.

---

**Need Help?**
- Check server logs for SMTP errors
- Use Ethereal mode for testing (no real email sent)
- Test with curl for webhook debugging
- Review Prisma database for email records

**Last Updated**: November 28, 2026
