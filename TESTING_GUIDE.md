# PMAIL Testing Guide

## 🧪 Complete Testing Guide for All Features

### Prerequisites
1. Backend running on `http://localhost:5000`
2. Frontend running on `http://localhost:5173`
3. PostgreSQL database set up and migrated
4. Two test users for testing Knocc requests

---

## Test Scenario 1: User Registration & Login

### Step 1: Register User A
1. Open app in browser
2. Click "Register" tab
3. Fill in all fields:
   - Name: "Alice Johnson"
   - Email: "alice@test.com"
   - Password: "password123"
   - Phone: "+1234567890"
   - Age: 28
   - Gender: Female
   - Country: USA
   - Knocc Price: $75
4. Click "Register"
5. **Expected**: Redirected to dashboard with empty inbox

### Step 2: Register User B (in incognito/another browser)
1. Open app in incognito window
2. Register second user:
   - Name: "Bob Smith"
   - Email: "bob@test.com"
   - Password: "password123"
   - Phone: "+0987654321"
   - Age: 32
   - Gender: Male
   - Country: Canada
   - Knocc Price: $50
3. Click "Register"
4. **Expected**: Redirected to dashboard

### Step 3: Test Logout/Login
1. Click "More" in sidebar → "Settings"
2. Click "Logout"
3. **Expected**: Return to login page
4. Login with credentials
5. **Expected**: Return to dashboard

✅ **PASS**: Registration and authentication working

---

## Test Scenario 2: Wallet Management

### Step 1: Check Initial Balance
1. Click "More" → "Wallet"
2. **Expected**: Balance shows $0.00
3. **Expected**: No transactions

### Step 2: Add Funds
1. In wallet modal, enter amount: 100
2. Click "Add Funds"
3. **Expected**: Success message
4. **Expected**: Balance updates to $100.00
5. **Expected**: Transaction history shows "DEPOSIT: +$100.00"

### Step 3: Add More Funds
1. Add another $50
2. **Expected**: Balance shows $150.00
3. **Expected**: Two transactions in history

✅ **PASS**: Wallet functionality working

---

## Test Scenario 3: Send Knocc Request

### Step 1: Find User in Directory (User A → User B)
1. As User A, click "Knocc Requests" in sidebar
2. **Expected**: Empty state with people directory
3. Click "All People" tab
4. **Expected**: See User B in the list
5. **Expected**: User B shows $50 price badge (green)

### Step 2: Send Knocc Request
1. Click "Knocc" button on User B's card
2. **Expected**: Modal opens with User B's details
3. Enter reason: "I'd like to discuss a business opportunity"
4. Click "Send Request ($50)"
5. **Expected**: Loading state
6. **Expected**: Success message
7. **Expected**: Modal closes

### Step 3: Check Wallet Deduction
1. Click "More" → "Wallet"
2. **Expected**: Balance reduced to $100.00
3. **Expected**: Transaction shows "KNOCC_SENT: -$50.00 to Bob Smith"

✅ **PASS**: Knocc request sent and wallet charged

---

## Test Scenario 4: Receive & Approve Knocc Request

### Step 1: View Request (As User B)
1. Switch to User B's browser
2. Click "Knocc Requests" in sidebar
3. **Expected**: See request from Alice Johnson
4. **Expected**: Badge shows count "1"
5. Click on the request
6. **Expected**: Request details show:
   - Sender: Alice Johnson
   - Reason: "I'd like to discuss..."
   - Payment: $50 (Priority)

### Step 2: Approve Request
1. Click "Approve & Add Contact" button
2. **Expected**: Loading state
3. **Expected**: Request disappears
4. **Expected**: Return to empty Knocc Requests view

### Step 3: Verify Contact Added (User B)
1. Click "Write" to compose email
2. Start typing "Alice" in To field
3. **Expected**: Alice Johnson appears in autocomplete
4. **Expected**: No payment required indicator

### Step 4: Verify Wallet Credit (User B)
1. Click "More" → "Wallet"
2. **Expected**: Balance shows $50.00
3. **Expected**: Transaction: "KNOCC_RECEIVED: +$50.00 from Alice Johnson"

✅ **PASS**: Knocc approval and payment transfer working

---

## Test Scenario 5: Send Email Between Approved Contacts

### Step 1: Compose Email (User B → User A)
1. As User B, click "Write"
2. **Expected**: Compose modal opens
3. In To field, type "Alice"
4. **Expected**: Alice Johnson appears in dropdown
5. Click on Alice to add
6. Fill in:
   - Subject: "Re: Business Opportunity"
   - Body: "Hi Alice, I'd be happy to discuss. Let's schedule a call."
7. Click "Send Email"
8. **Expected**: No Knocc payment modal (already approved)
9. **Expected**: Success message
10. **Expected**: Modal closes

### Step 2: Check Sent Emails (User B)
1. Click "Sent" tab in email list
2. **Expected**: See sent email to Alice Johnson
3. **Expected**: Subject and preview visible

### Step 3: Receive Email (User A)
1. Switch to User A's browser
2. **Expected**: Inbox shows "1" badge
3. Click "Inbox" tab
4. **Expected**: See email from Bob Smith
5. Click on email
6. **Expected**: Email detail opens
7. **Expected**: Subject: "Re: Business Opportunity"
8. **Expected**: Full body visible

✅ **PASS**: Email sending between contacts working

---

## Test Scenario 6: Star Email

### Step 1: Star Email (As User A)
1. With Bob's email open, look at top-right buttons
2. **Expected**: See Star icon (unfilled, gray)
3. Click Star button
4. **Expected**: Loading state briefly
5. **Expected**: Star turns yellow and filled
6. Click Star again
7. **Expected**: Star becomes unfilled/gray

### Step 2: Check Starred Folder
1. Click "More" → "Starred"
2. **Expected**: See starred email (if still starred)
3. **Expected**: Email shows star indicator

✅ **PASS**: Star functionality working

---

## Test Scenario 7: Delete Email

### Step 1: Delete Email (As User A)
1. Open any email
2. Look at top-right buttons
3. **Expected**: See Trash icon next to Star
4. Click Delete button
5. **Expected**: Email closes
6. **Expected**: Return to inbox
7. **Expected**: Email removed from inbox

### Step 2: Check Bin
1. Click "More" → "Bin"
2. **Expected**: See deleted email
3. **Expected**: Email still accessible

✅ **PASS**: Delete functionality working

---

## Test Scenario 8: Email with CC/BCC

### Step 1: Send Email with CC (User A)
1. Click "Write"
2. Add User B in To field
3. Click "Add CC" link
4. **Expected**: CC field appears
5. Type another email in CC field
6. Add subject and body
7. Click "Send Email"
8. **Expected**: Email sent

### Step 2: Verify CC Recipients
1. Click "Sent" tab
2. Open the email
3. **Expected**: See both To and CC recipients listed

✅ **PASS**: CC/BCC functionality working

---

## Test Scenario 9: Profile Settings

### Step 1: Update Profile (As User A)
1. Click "More" → "Settings"
2. **Expected**: See current profile info
3. Update fields:
   - Phone: "+1111111111"
   - Age: 29
   - Knocc Price: $100
4. Click "Save Changes"
5. **Expected**: Loading state
6. **Expected**: Success message
7. **Expected**: Modal closes

### Step 2: Verify Changes
1. Reopen settings
2. **Expected**: New values displayed
3. Logout and login again
4. Open settings
5. **Expected**: Changes persisted

✅ **PASS**: Profile update working

---

## Test Scenario 10: Decline Knocc Request

### Step 1: Send Another Request (User B → User A)
1. As User B, add $75 to wallet
2. Click "Knocc Requests"
3. Click "All People" tab
4. Send Knocc request to User A
5. **Expected**: Wallet charged $75

### Step 2: Decline Request (As User A)
1. As User A, click "Knocc Requests"
2. **Expected**: See request from Bob Smith
3. Click on request
4. Click "Decline Request"
5. **Expected**: Loading state
6. **Expected**: Request disappears
7. **Expected**: Return to empty state

### Step 3: Verify No Contact Added
1. Click "Write"
2. Try to find Bob in autocomplete
3. **Expected**: Bob NOT in contact list

### Step 4: Verify Wallet (User A)
1. Check wallet
2. **Expected**: Balance unchanged
3. **Expected**: No KNOCC_RECEIVED transaction

### Step 5: Verify Wallet (User B)
1. As User B, check wallet
2. **Expected**: $75 NOT refunded
3. **Expected**: KNOCC_SENT transaction still shows -$75

✅ **PASS**: Decline functionality working (money not refunded)

---

## Test Scenario 11: People Directory Tabs

### Step 1: Who You Know Tab
1. Click "Knocc Requests"
2. Click "Who You Know" tab
3. **Expected**: See approved contacts only
4. **Expected**: 3-column grid layout
5. **Expected**: Compact cards with verification badges

### Step 2: All People Tab
1. Click "All People" tab
2. **Expected**: See all users except approved contacts
3. **Expected**: Same compact card layout
4. **Expected**: Knocc buttons functional

### Step 3: Search (if implemented)
1. Type in search box
2. **Expected**: Filter results (may not be implemented yet)

✅ **PASS**: People directory working

---

## 📊 Feature Completion Checklist

| Feature | Status | Notes |
|---------|--------|-------|
| User Registration | ✅ | Full profile collected |
| User Login | ✅ | JWT authentication |
| Auto-login | ✅ | Token persistence |
| Logout | ✅ | Clears token |
| Wallet - View Balance | ✅ | Real-time from DB |
| Wallet - Add Funds | ✅ | DEPOSIT transaction |
| Wallet - Transaction History | ✅ | All types shown |
| Send Knocc Request | ✅ | Charges wallet |
| View Knocc Requests | ✅ | Filtered display |
| Approve Knocc Request | ✅ | Adds contact, transfers funds |
| Decline Knocc Request | ✅ | No refund |
| People Directory | ✅ | Two tabs, compact cards |
| Send Email to Contact | ✅ | No payment required |
| View Inbox | ✅ | Real emails |
| View Sent Emails | ✅ | Real sent emails |
| Email Detail View | ✅ | Full content |
| Star Email | ✅ | Toggle starred state |
| Delete Email | ✅ | Move to bin |
| Email with CC | ✅ | Multiple recipients |
| Email with BCC | ✅ | Hidden recipients |
| Update Profile | ✅ | Persisted to DB |
| View Settings | ✅ | Current user info |
| Verification Badges | ✅ | Instagram style |
| Loading States | ✅ | All async actions |
| Error Handling | ✅ | User-friendly messages |

---

## 🐛 Known Issues / Edge Cases

### Minor Issues
1. **Search functionality**: People directory search bar not connected
2. **Pagination**: No pagination for large datasets
3. **Real-time updates**: No WebSocket, requires manual refresh
4. **Delete confirmation**: No confirmation dialog before delete

### Edge Cases to Test
1. **Insufficient wallet balance**: Try sending Knocc request with $0 balance
2. **Duplicate Knocc requests**: Try sending request to same user twice
3. **Empty states**: All sections show proper empty states
4. **Long emails**: Test with very long email content
5. **Special characters**: Test with emojis and special chars in content

### Future Enhancements
1. **Email threading**: Group related emails
2. **Attachments**: File upload support
3. **Rich text editor**: Formatting options
4. **Notifications**: Real-time alerts
5. **Search**: Global search across emails
6. **Filters**: Advanced filtering options
7. **Email folders**: Custom folder creation
8. **Undo delete**: Restore from bin

---

## 🎯 Success Criteria

**ALL TESTS SHOULD PASS WITH:**
- ✅ No console errors
- ✅ All buttons responsive
- ✅ Loading states visible during async operations
- ✅ Success/error messages clear and helpful
- ✅ Data persists after page refresh
- ✅ Wallet balance updates correctly
- ✅ Email counts accurate
- ✅ UI remains clean and minimalistic

---

## 🚀 Quick Smoke Test (5 minutes)

If you need to quickly verify everything works:

1. **Register** → Creates account ✅
2. **Add $100 to wallet** → Balance updates ✅
3. **Send Knocc request** → Wallet charged ✅
4. **Switch user, approve request** → Contact added ✅
5. **Send email** → Email received ✅
6. **Star email** → Star toggles ✅
7. **Delete email** → Moves to bin ✅
8. **Update settings** → Profile saved ✅

**If all 8 steps work, system is fully functional!** 🎉

---

## 📞 Troubleshooting

### Backend Not Responding
- Check if backend is running: `curl http://localhost:5000/api/auth/me`
- Check database connection
- Review server logs

### Frontend Not Loading Data
- Open browser console
- Check for CORS errors
- Verify API_URL in `.env` or `api.js`
- Check network tab for failed requests

### Authentication Issues
- Clear localStorage
- Check JWT_SECRET matches in backend
- Verify token format in Network tab

### Database Issues
- Run migrations: `npx prisma migrate dev`
- Reset database: `npx prisma migrate reset` (careful!)
- Check PostgreSQL is running

---

**HAPPY TESTING!** 🧪✨
