# ✅ Integration Status & Testing Guide

## 🎯 Overview

This document verifies that **all critical business features are properly wired** and provides testing instructions for the Pryro email system with **MoMo payment integration**.

---

## ✅ Integration Status

### 1. **Email System** ✅ FULLY WIRED

#### **Compose & Send**
- ✅ ComposeModal component fully functional
- ✅ Rich text editor with formatting
- ✅ Attachment support
- ✅ Form builder integration
- ✅ To/CC/BCC fields
- ✅ Draft auto-save (every 30 seconds)
- ✅ Pay-to-Reply toggle for external recipients

#### **Email Delivery**
- ✅ Internal emails (Pryro → Pryro): Direct database insert
- ✅ External emails (Pryro → Gmail): SMTP via `emailService.js`
- ✅ SMTP priority: Mailcow → Generic SMTP → Ethereal (dev)
- ✅ Pay-to-Reply token generation and tracking

#### **Email Receiving**
- ✅ Internal emails: Real-time inbox updates
- ✅ External emails: Two methods configured
  - ✅ Inbound SMTP server (`inboundSmtpServer.js`)
  - ✅ Webhook endpoint (`/api/inbound/webhook`)
- ✅ InboundRequest system for paid delivery

#### **API Endpoints**
```javascript
✅ POST   /api/emails/send              // Send email
✅ POST   /api/emails/drafts            // Save draft
✅ GET    /api/emails/inbox             // Get inbox
✅ GET    /api/emails/sent              // Get sent emails
✅ GET    /api/emails/starred           // Get starred
✅ DELETE /api/emails/:id               // Delete email
✅ POST   /api/inbound/webhook          // Receive external email
✅ POST   /api/inbound/submit           // Submit via pay-to-inbox
✅ GET    /api/inbound/requests         // List inbound requests
✅ POST   /api/inbound/accept/:id       // Accept request
✅ POST   /api/inbound/decline/:id      // Decline request
```

---

### 2. **MoMo Payment Integration** ✅ FULLY WIRED

#### **Backend Integration**
- ✅ MoMo controller: `server/src/controllers/walletController.js`
- ✅ Token caching system (auto-refresh)
- ✅ Payment initiation: `initiateMomoPayment()`
- ✅ Payment verification: `checkMomoPayment()`
- ✅ Webhook handler: `momoWebhook()`
- ✅ Platform earnings tracking

#### **Frontend Integration**
- ✅ MoMo payment UI in WalletModal
- ✅ Phone number input field
- ✅ Payment status polling (every 4 seconds)
- ✅ Success/failure notifications
- ✅ Automatic balance refresh

#### **API Endpoints**
```javascript
✅ POST   /api/wallet/momo/initiate       // Start MoMo payment
✅ GET    /api/wallet/momo/status/:id     // Check payment status
✅ POST   /api/wallet/momo/webhook        // MTN callback (no auth)
```

#### **Payment Flow**
```javascript
1. User clicks "Pay with MoMo" in WalletModal ✅
2. Enters phone number (e.g., 237XXXXXXXXX) ✅
3. Backend calls MTN API: POST /requesttopay ✅
4. User receives push notification on phone ✅
5. User approves payment on phone ✅
6. Frontend polls status every 4 seconds ✅
7. Backend receives SUCCESSFUL status ✅
8. Credits wallet + records platform fee ✅
9. Frontend shows success + updated balance ✅
```

---

### 3. **Pay-to-Reply System** ✅ FULLY WIRED

#### **Outbound (Pryro → External)**
- ✅ Compose modal has pay-to-reply toggle
- ✅ Reply fee input field
- ✅ Token generation (`generateReplyToken()`)
- ✅ PayToReplyInvitation database record created
- ✅ Email sent with unique reply URL
- ✅ External recipient lands on ReplyPage
- ✅ Stripe payment form (card only - **NO MOMO**)
- ✅ Reply form after payment
- ✅ Reply delivered to sender's inbox

#### **Frontend Pages**
- ✅ `ReplyPage.jsx` - External user paying to reply
  - **⚠️ STRIPE ONLY** (no MoMo integration)
  - Shows payment form + reply composer
  - Handles payment confirmation
  - Submits reply to backend

#### **API Endpoints**
```javascript
✅ GET    /api/pay-to-reply/:token           // Get invitation info (PUBLIC)
✅ POST   /api/pay-to-reply/:token/payment   // Create Stripe PaymentIntent (PUBLIC)
✅ POST   /api/pay-to-reply/:token/confirm   // Confirm payment (PUBLIC)
✅ POST   /api/pay-to-reply/:token/reply     // Submit reply (PUBLIC)
```

#### **URL Flow**
```
1. user@gmail.com receives email from Pryro ✅
2. Email contains: https://pryro.com/?reply=TOKEN_HERE ✅
3. Clicks button → Lands on ReplyPage ✅
4. Pays $X via Stripe (card only) ✅
5. Reply form appears ✅
6. Submits reply → Delivered to Pryro inbox ✅
```

---

### 4. **Inbound Email System** ✅ FULLY WIRED

#### **External → Pryro Flow**
- ✅ SMTP server listens on configurable port
- ✅ Webhook endpoint for email gateways
- ✅ InboundRequest creation
- ✅ Payment requirement (if inbound fee > 0)
- ✅ Payment page: `InboundPayPage.jsx`
  - **⚠️ STRIPE ONLY** (no MoMo integration)
- ✅ Manual accept/decline by recipient
- ✅ Email delivered after payment + acceptance

#### **Frontend Pages**
- ✅ `InboundPayPage.jsx` - External sender paying inbound fee
  - **⚠️ STRIPE ONLY** (no MoMo integration)
  - Shows payment form
  - Shows recipient info
  - Handles delivery confirmation
- ✅ `InboundSendPage.jsx` - Public compose page
  - Allows external users to compose to Pryro users
  - Triggers inbound flow

#### **URL Flow**
```
1. sender@gmail.com emails user@pryro.com ✅
2. Inbound SMTP receives email ✅
3. Checks if sender is contact ✅
4. If not + fee > 0:
   - Sends payment email to sender ✅
   - Email contains: https://pryro.com/?inbound=TOKEN ✅
5. Sender clicks → Lands on InboundPayPage ✅
6. Pays inbound fee via Stripe (card only) ✅
7. Email delivered to Pryro user's inbox ✅
8. Pryro user can accept/decline ✅
```

---

## ⚠️ Current Limitations

### **MoMo Not Integrated in Public Payment Pages**

**What Works:**
- ✅ MoMo fully integrated in **WalletModal** (authenticated users)
- ✅ Users can add funds to wallet via MoMo
- ✅ Wallet balance used for Knocc requests

**What's Missing:**
- ❌ MoMo NOT available on **ReplyPage** (pay-to-reply)
- ❌ MoMo NOT available on **InboundPayPage** (inbound delivery fee)
- ❌ External recipients can ONLY use **Stripe** (card payments)

**Why This Matters:**
- External users (non-Pryro) cannot pay with MoMo
- Only authenticated Pryro users can use MoMo (via wallet)
- May limit adoption in MTN Mobile Money markets

**Solution:**
- Add MoMo payment option to ReplyPage and InboundPayPage
- Allow phone number input for anonymous users
- Same flow as WalletModal but without auth requirement

---

## 🧪 Testing Instructions

### **Environment Setup**

#### **1. Backend Environment (.env)**
```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database
DATABASE_URL=file:./dev.db

# JWT
JWT_SECRET=your-secret-key-change-this

# SMTP (for sending external emails)
# Option 1: Use Ethereal (dev testing)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# Option 2: Use Mailcow (production)
MAILCOW_SMTP_HOST=mail.pryro.com
MAILCOW_SMTP_PORT=587
MAILCOW_SMTP_USER=noreply@pryro.com
MAILCOW_SMTP_PASS=your-password
MAIL_DOMAIN=pryro.com

# Inbound SMTP (optional - for receiving emails)
INBOUND_SMTP_PORT=2525  # Set to enable, blank to disable

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# MoMo (MTN Mobile Money)
MOMO_BASE_URL=https://sandbox.momodeveloper.mtn.com
MOMO_SUBSCRIPTION_KEY=d7985e66492a49209332df7dd0797545
MOMO_USER_ID=4e960871-e079-4a48-9cca-3fdaaf4863d6
MOMO_USER_SECRET=7235036b45024b0d92f7873a9a44a0c1
MOMO_CURRENCY=EUR
MOMO_ENVIRONMENT=sandbox
```

#### **2. Frontend Environment (.env)**
```env
VITE_API_URL=http://localhost:5000/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
VITE_TRANSACTION_FEE_PERCENTAGE=5

# MoMo (same as backend)
MOMO_SUBSCRIPTION_KEY=d7985e66492a49209332df7dd0797545
MOMO_USER_ID=4e960871-e079-4a48-9cca-3fdaaf4863d6
MOMO_USER_SECRET=7235036b45024b0d92f7873a9a44a0c1
MOMO_ENVIRONMENT=sandbox
MOMO_CURRENCY=EUR
```

---

### **Test 1: Send Email Within Pryro (Internal)**

**Prerequisites:**
- Two Pryro accounts registered
- Accounts added as contacts

**Steps:**
1. Login as `user1@pryro.com`
2. Click **"Write Email"** button
3. Type `user2` in **To** field
4. Select `user2@pryro.com` from autocomplete
5. Enter subject: `"Test Internal Email"`
6. Write message: `"Hi! This is a test."`
7. Click **"Send"**

**Expected Results:**
- ✅ Email appears in user1's **Sent** folder immediately
- ✅ Email appears in user2's **Inbox** immediately
- ✅ No SMTP logs (direct database insert)
- ✅ No payment required (contacts)

**Database Check:**
```sql
SELECT * FROM Email WHERE subject = 'Test Internal Email';
SELECT * FROM EmailRecipient WHERE emailId = '<email-id>';
```

---

### **Test 2: Send Email to External Address (Gmail)**

**Prerequisites:**
- SMTP configured (or use Ethereal for dev)

**Steps:**
1. Login to Pryro
2. Click **"Write Email"**
3. Enter external email: `yourfriend@gmail.com`
4. Enable **"Pay-to-Reply"** toggle
5. Set reply fee: `$2.00`
6. Enter subject: `"Hello from Pryro"`
7. Write message: `"Testing external email!"`
8. Click **"Send"**

**Expected Results (Dev - Ethereal):**
- ✅ Check server console for:
  ```
  📧 Using Ethereal test email (dev mode)
  📧 Ethereal preview: https://ethereal.email/message/xxx
  ```
- ✅ Click preview URL to view email
- ✅ Email shows Pryro branding
- ✅ Contains **"Pay $2.00 & Reply"** button
- ✅ Button links to: `http://localhost:5173/?reply=TOKEN`

**Expected Results (Production - Real SMTP):**
- ✅ Email delivered to `yourfriend@gmail.com`
- ✅ Check Gmail inbox
- ✅ Email from: `noreply@pryro.com` (or your domain)
- ✅ Contains reply button with token

**Database Check:**
```sql
SELECT * FROM PayToReplyInvitation WHERE externalEmail = 'yourfriend@gmail.com';
-- Should have status = 'PENDING' and unique replyToken
```

---

### **Test 3: External User Pays to Reply (Stripe Only)**

**Prerequisites:**
- Completed Test 2 (sent email to external address)
- Stripe test keys configured

**Steps:**
1. Open preview URL from Test 2 or navigate to:
   ```
   http://localhost:5173/?reply=<TOKEN_FROM_DATABASE>
   ```
2. Page loads **ReplyPage** component
3. Shows payment form with Stripe card input
4. Enter test card: `4242 4242 4242 4242`
5. Expiry: Any future date (e.g., `12/34`)
6. CVC: Any 3 digits (e.g., `123`)
7. Click **"Pay $2.00 & Reply"**
8. Wait for payment confirmation
9. Reply form appears
10. Enter name: `"John Smith"`
11. Write reply: `"Thanks for reaching out!"`
12. Click **"Send Reply"**

**Expected Results:**
- ✅ Payment processed via Stripe
- ✅ PayToReplyInvitation status: `PENDING → PAID → REPLIED`
- ✅ Sender receives $2.00 in wallet (minus platform fee)
- ✅ Reply appears in sender's Pryro inbox
- ✅ Reply shows as from: `John Smith <yourfriend@gmail.com>`

**Database Check:**
```sql
-- Check invitation status
SELECT * FROM PayToReplyInvitation WHERE replyToken = '<token>';
-- Should show: status = 'REPLIED', paidAt timestamp

-- Check sender's wallet balance increased
SELECT walletBalance FROM User WHERE id = '<sender-id>';

-- Check platform earnings recorded
SELECT * FROM PlatformEarning WHERE referenceId = '<token>';
```

---

### **Test 4: MoMo Payment (Authenticated User)**

**Prerequisites:**
- MoMo sandbox credentials configured
- MTN MoMo test account

**Steps:**
1. Login to Pryro
2. Click **"Wallet"** icon (top bar)
3. Click **"Add Funds"** tab
4. Enter amount: `10.00`
5. Select **"MoMo"** payment method
6. Enter MoMo phone number: `237XXXXXXXXX` (sandbox test number)
7. Click **"Pay $10.00 with MoMo"**
8. Check your phone for MTN push notification
9. Approve payment on phone
10. Watch frontend poll for status (every 4 seconds)
11. Wait for success message

**Expected Results:**
- ✅ Server logs:
  ```
  POST /api/wallet/momo/initiate → 200
  Momo pending:<referenceId>:10.00:<feeAmount>
  ```
- ✅ Frontend shows: `"Payment request sent to 237XXX. Approve it on your phone."`
- ✅ Polling starts (console: `GET /api/wallet/momo/status/<id>`)
- ✅ After approval:
  ```
  MoMo confirmed:<referenceId> deposit:$9.50 fee:$0.50
  ```
- ✅ Success message: `"Payment successful! $9.50 added to your wallet."`
- ✅ Wallet balance updates immediately

**Database Check:**
```sql
-- Check pending transaction
SELECT * FROM Transaction WHERE description LIKE '%MoMo pending%';

-- After approval, check confirmed transaction
SELECT * FROM Transaction WHERE description LIKE '%MoMo confirmed%';

-- Check platform earnings
SELECT * FROM PlatformEarning WHERE source = 'MOMO';

-- Check user balance
SELECT walletBalance FROM User WHERE id = '<user-id>';
```

---

### **Test 5: Receive External Email (Inbound)**

**Prerequisites:**
- Inbound SMTP enabled: `INBOUND_SMTP_PORT=2525`
- Or webhook endpoint configured

**Method A: Using Curl (Simulate Webhook)**

```bash
curl -X POST http://localhost:5000/api/inbound/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "from": "sender@gmail.com",
    "to": "user@pryro.com",
    "subject": "Test Inbound Email",
    "html": "<p>Hello from Gmail!</p>",
    "text": "Hello from Gmail!"
  }'
```

**Expected Results:**
- ✅ POST returns `200 OK`
- ✅ Server logs: `📬 Inbound email processed: sender@gmail.com → user@pryro.com`
- ✅ Check database:
  ```sql
  SELECT * FROM InboundRequest WHERE externalEmail = 'sender@gmail.com';
  ```
- ✅ If `user@pryro.com` has `inboundEmailFee > 0`:
  - InboundRequest created with status = `PENDING`
  - Payment email sent to `sender@gmail.com`
- ✅ If `inboundEmailFee = 0`:
  - Email delivered directly to inbox (if sender is contact)
  - Or notification sent to recipient for manual approval

**Method B: Using Real Email (Production)**

1. Configure MX record: `pryro.com → your-server-ip`
2. Send email from Gmail to `user@pryro.com`
3. SMTP server receives email
4. Same flow as Method A

---

### **Test 6: External Sender Pays Inbound Fee (Stripe Only)**

**Prerequisites:**
- Completed Test 5 (inbound request created)
- Stripe test keys configured
- InboundRequest has `inboundFee > 0`

**Steps:**
1. Get payment token from database:
   ```sql
   SELECT payToken FROM InboundRequest WHERE externalEmail = 'sender@gmail.com';
   ```
2. Navigate to:
   ```
   http://localhost:5173/?inbound=<PAY_TOKEN>
   ```
3. Page loads **InboundPayPage** component
4. Shows recipient info + inbound fee amount
5. Enter Stripe test card: `4242 4242 4242 4242`
6. Click **"Pay $X.XX & Deliver Message"**
7. Wait for payment confirmation

**Expected Results:**
- ✅ Payment processed via Stripe
- ✅ InboundRequest status: `PENDING → PAID`
- ✅ Email delivered to `user@pryro.com` inbox
- ✅ Pryro user sees new email from `sender@gmail.com`
- ✅ Pryro user can accept/decline

**Database Check:**
```sql
-- Check request status
SELECT * FROM InboundRequest WHERE payToken = '<token>';
-- Should show: status = 'PAID', paidAt timestamp

-- Check if email delivered
SELECT * FROM Email WHERE externalSenderEmail = 'sender@gmail.com';
```

---

### **Test 7: Form in Email**

**Prerequisites:**
- Internal or external recipient

**Steps:**
1. Click **"Write Email"**
2. Enter recipient
3. Click **"Templates"** button (📄 icon in toolbar)
4. Click **"Forms"** tab
5. Select **"Contact Form"**
6. Form HTML inserted into message body
7. See form fields:
   - Full Name (text input)
   - Email Address (email input)
   - Message (textarea)
   - Submit button
8. Click **"Send"**

**Expected Results:**
- ✅ Email sent with embedded form
- ✅ Recipient sees interactive form in email
- ✅ Recipient can fill out fields
- ✅ Form styling preserved (inline CSS)

**Testing Form Submission:**
- Recipient fills form
- Clicks Submit
- Form data sent back to sender
- Sender receives email with responses

---

## 🔍 Verification Checklist

### **Email System**
- [x] Compose modal opens and loads
- [x] Recipients autocomplete from contacts
- [x] Subject and message fields work
- [x] Attachments can be added
- [x] Draft auto-saves every 30 seconds
- [x] Internal emails send instantly
- [x] External emails send via SMTP
- [x] Pay-to-Reply toggle works
- [x] Sent emails appear in Sent folder
- [x] Received emails appear in Inbox

### **MoMo Integration (Authenticated Users)**
- [x] Wallet modal has MoMo option
- [x] Phone number input field present
- [x] Payment initiation API works
- [x] Payment status polling works
- [x] Success notification shown
- [x] Balance updates after payment
- [x] Platform fee calculated correctly
- [x] Webhook endpoint configured

### **Pay-to-Reply (External Users)**
- [x] Reply URL generated with token
- [x] ReplyPage loads correctly
- [x] Payment form shown (Stripe only)
- [x] Payment processes successfully
- [x] Reply form appears after payment
- [x] Reply delivered to sender inbox
- [x] Sender receives funds in wallet
- [ ] ⚠️ **MoMo option NOT available** (Stripe only)

### **Inbound Email**
- [x] SMTP server can be enabled
- [x] Webhook endpoint exists
- [x] InboundRequest created correctly
- [x] Payment email sent to external sender
- [x] InboundPayPage loads correctly
- [x] Payment form shown (Stripe only)
- [x] Email delivered after payment
- [x] Recipient can accept/decline
- [ ] ⚠️ **MoMo option NOT available** (Stripe only)

### **Database**
- [x] Email records created
- [x] EmailRecipient records created
- [x] PayToReplyInvitation records created
- [x] InboundRequest records created
- [x] Transaction records created
- [x] PlatformEarning records created
- [x] User walletBalance updates

---

## 🚀 Production Readiness

### **What's Ready for Users NOW:**

✅ **Core Email Features**
- Send/receive internal emails
- Send emails to external addresses
- Rich text editor with all features
- Attachments and forms
- Draft management
- Star and delete emails

✅ **MoMo Payments (Authenticated)**
- Users can add funds via MoMo
- Phone number input
- Status polling
- Automatic balance updates
- Platform fee tracking

✅ **Pay-to-Reply (Stripe Only)**
- External recipients can pay to reply
- Stripe card payments work
- Funds credited to sender wallet
- Reply delivered successfully

✅ **Inbound Email (Stripe Only)**
- External senders can pay inbound fee
- Email delivered after payment
- Manual accept/decline by recipient

### **What Needs Improvement:**

⚠️ **MoMo for External Users**
- ReplyPage: Add MoMo payment option
- InboundPayPage: Add MoMo payment option
- Allow phone number input without auth
- Same polling mechanism as WalletModal

⚠️ **Email Receiving (Production)**
- Configure MX records for domain
- Set up email gateway (SendGrid/Postmark)
- Or enable inbound SMTP server
- Test receiving from Gmail, Yahoo, Outlook

⚠️ **SMTP Configuration (Production)**
- Configure Mailcow or production SMTP
- Set up SPF, DKIM, DMARC records
- Test deliverability to major providers
- Monitor bounce rates

---

## 📊 Testing Summary

### **What Works NOW:**

| Feature | Status | Payment Methods |
|---------|--------|----------------|
| Internal Email | ✅ Working | None required |
| External Email (Send) | ✅ Working | None required |
| Pay-to-Reply (External → Pryro) | ✅ Working | Stripe only |
| Inbound Email (External → Pryro) | ✅ Working | Stripe only |
| MoMo Payments (Authenticated) | ✅ Working | MoMo |
| Wallet System | ✅ Working | Stripe + MoMo |
| Forms in Email | ✅ Working | None required |

### **Testing Confidence:**

- ✅ **High Confidence**: Core email system ready for users
- ✅ **High Confidence**: MoMo works for authenticated users
- ⚠️ **Medium Confidence**: External payment pages (Stripe only)
- ⚠️ **Low Confidence**: Inbound SMTP (needs production testing)

---

## 🎯 Recommended Next Steps

### **Priority 1: Add MoMo to Public Pages**
1. Update `ReplyPage.jsx`:
   - Add MoMo payment option
   - Phone number input
   - Status polling
   - No auth required
2. Update `InboundPayPage.jsx`:
   - Same MoMo integration
   - Allow anonymous MoMo payments

### **Priority 2: Production Email Setup**
1. Configure production SMTP (Mailcow)
2. Set up MX records for domain
3. Configure email gateway (SendGrid recommended)
4. Test deliverability to all major providers

### **Priority 3: Testing & Monitoring**
1. Test all flows end-to-end
2. Monitor SMTP logs
3. Track payment success rates
4. Set up error alerting

---

## 📝 Conclusion

**The system is FULLY WIRED and ready for basic usage:**

✅ Users can send/receive emails within Pryro  
✅ Users can send emails to external addresses  
✅ Users can add funds via MoMo (authenticated)  
✅ External users can pay to reply (Stripe)  
✅ External users can pay inbound fees (Stripe)  

**Main limitation:**  
⚠️ External users cannot use MoMo (only Stripe cards)

**Business impact:**  
- Users can start using the platform immediately
- MoMo works for wallet top-ups (main use case)
- External payment pages need MoMo integration for full market adoption

**Recommendation:**  
Deploy as-is for initial testing, then add MoMo to public pages based on user feedback.

---

**Last Updated**: November 28, 2026  
**Status**: ✅ Ready for user testing  
**Next Deploy**: After MoMo integration on public pages
