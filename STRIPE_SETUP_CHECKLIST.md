# Stripe Integration Setup Checklist

Use this checklist to complete your Stripe integration setup.

## 📋 Pre-Setup Checklist

- [ ] Node.js installed
- [ ] npm installed
- [ ] Project dependencies installed (`npm install` in root and `server/` folders)
- [ ] Both frontend and backend running successfully

## 🔧 Setup Steps

### Step 1: Create Stripe Account
- [ ] Go to [https://stripe.com](https://stripe.com)
- [ ] Click "Sign up"
- [ ] Complete registration
- [ ] Verify email address
- [ ] Login to Stripe Dashboard

### Step 2: Get API Keys
- [ ] Navigate to **Developers** → **API Keys**
- [ ] Locate **Publishable key** (starts with `pk_test_`)
- [ ] Copy publishable key to clipboard
- [ ] Locate **Secret key** (click "Reveal test key")
- [ ] Copy secret key to clipboard
- [ ] ⚠️ **IMPORTANT:** Never share or commit secret key to Git!

### Step 3: Configure Backend
- [ ] Open `server/.env` file
- [ ] Update `STRIPE_SECRET_KEY=` with your secret key (sk_test_...)
- [ ] Update `STRIPE_PUBLISHABLE_KEY=` with your publishable key (pk_test_...)
- [ ] Verify `TRANSACTION_FEE_PERCENTAGE=5` (or change as needed)
- [ ] Save file

**Expected configuration:**
```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_optional_for_now
TRANSACTION_FEE_PERCENTAGE=5
```

### Step 4: Configure Frontend
- [ ] Open `.env` file (in project root)
- [ ] Update `VITE_STRIPE_PUBLISHABLE_KEY=` with your publishable key
- [ ] Verify `VITE_TRANSACTION_FEE_PERCENTAGE=5` (should match backend)
- [ ] Save file

**Expected configuration:**
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
VITE_TRANSACTION_FEE_PERCENTAGE=5
```

### Step 5: Restart Servers
- [ ] Stop backend server (Ctrl+C)
- [ ] Stop frontend server (Ctrl+C)
- [ ] Restart backend: `cd server && npm run dev`
- [ ] Restart frontend: `npm run dev`
- [ ] Verify no errors in console

### Step 6: Verify Installation
- [ ] Backend console shows: "Server running on port 5000"
- [ ] Frontend console shows: "Local: http://localhost:5173"
- [ ] No Stripe-related errors in either console
- [ ] Browser console shows no errors when loading app

## 🧪 Testing Checklist

### Basic Payment Test
- [ ] Open application in browser
- [ ] Login with test account
- [ ] Click "Wallet" in sidebar
- [ ] Note current balance: $______
- [ ] Click "Add Funds" button
- [ ] Verify "Card" payment method is selected
- [ ] Enter amount: `50`
- [ ] Fill card details:
  - Card Number: `4242 4242 4242 4242`
  - Expiry: `12/26`
  - CVC: `123`
  - Name: `Test User`
- [ ] Verify fee display shows:
  - Deposit Amount: $50.00
  - Processing Fee (5%): $2.50
  - Total Charge: $52.50
- [ ] Click "Add $50.00 with Card"
- [ ] See processing state (loading spinner)
- [ ] See success message: "Successfully added $50.00! (Fee: $2.50)"
- [ ] Verify new balance: Previous balance + $50.00
- [ ] Modal auto-closes or returns to overview

### Verify in Stripe Dashboard
- [ ] Go to Stripe Dashboard
- [ ] Click "Payments" in sidebar
- [ ] Find your test payment
- [ ] Verify amount: $52.50 (includes fee)
- [ ] Verify status: "Succeeded"
- [ ] Verify description: "Pmail Wallet Top-up..."

### Test Multiple Amounts
- [ ] Test $10 deposit (should charge $10.50)
- [ ] Test $25 deposit (should charge $26.25)
- [ ] Test $100 deposit (should charge $105.00)
- [ ] Verify all amounts correctly credited to wallet

### Test Error Handling
- [ ] Use declined card: `4000 0000 0000 0002`
- [ ] Verify error message appears
- [ ] Verify wallet balance unchanged
- [ ] Use insufficient funds card: `4000 0000 0000 9995`
- [ ] Verify appropriate error message
- [ ] Try empty card number
- [ ] Verify validation error

### Test Transaction History
- [ ] Go to wallet overview
- [ ] Verify "Recent Transactions" section
- [ ] Find your test deposits
- [ ] Verify format: "Stripe deposit: $X.XX (Fee: $Y.YY, 5%)"
- [ ] Verify timestamps are correct
- [ ] Verify amounts match what you deposited

## 🔐 Security Checklist

### Environment Variables
- [ ] `.env` files are in `.gitignore`
- [ ] Secret keys never committed to Git
- [ ] No API keys visible in browser console
- [ ] Only publishable key used in frontend

### Payment Security
- [ ] Card details never sent to your server
- [ ] All payments processed through Stripe
- [ ] HTTPS enabled in production (later)
- [ ] CORS configured correctly

### Database
- [ ] Transaction records created successfully
- [ ] Payment intent IDs stored for reconciliation
- [ ] Fee amounts tracked correctly

## 📊 Revenue Verification

### Check Revenue Calculation
- [ ] Made test deposit of $100
- [ ] Stripe charged $105 (user's card)
- [ ] User received $100 (wallet balance)
- [ ] Company keeps $5 (your revenue)
- [ ] Math checks out: $105 = $100 + $5

### View in Stripe Dashboard
- [ ] Go to **Payments**
- [ ] Total charges = Wallet deposits + Fees
- [ ] Example: 2 payments of $52.50 = $105 total charged
- [ ] User wallets show $100 total
- [ ] Your revenue: $5

## 🐛 Troubleshooting

### If Payment Fails
- [ ] Check both .env files configured correctly
- [ ] Verify API keys match environment (both test or both live)
- [ ] Check browser console for errors
- [ ] Check backend console for errors
- [ ] Verify Stripe API keys are correct
- [ ] Check internet connection
- [ ] Review Stripe Dashboard → Logs for API errors

### If Fee Not Showing
- [ ] Verify `TRANSACTION_FEE_PERCENTAGE` set in `server/.env`
- [ ] Verify `VITE_TRANSACTION_FEE_PERCENTAGE` set in `.env`
- [ ] Restart both servers
- [ ] Clear browser cache
- [ ] Check browser console for calculation errors

### If Balance Not Updating
- [ ] Check backend console for database errors
- [ ] Verify JWT token is valid (try logging out/in)
- [ ] Check transaction was created in database
- [ ] Verify payment succeeded in Stripe Dashboard
- [ ] Check network tab for API response errors

## 📱 Production Readiness (When Going Live)

### Before Switching to Live Mode
- [ ] Complete Stripe account verification
- [ ] Add business information
- [ ] Connect bank account for payouts
- [ ] Test with small real amounts first
- [ ] Enable HTTPS on production server
- [ ] Update CORS for production domain
- [ ] Set up proper error monitoring
- [ ] Implement webhook handlers (optional but recommended)
- [ ] Get live API keys from Stripe
- [ ] Update .env files with live keys (pk_live_, sk_live_)
- [ ] Test thoroughly in staging environment
- [ ] Set up automated backups
- [ ] Document rollback procedure
- [ ] Inform users about new payment option

### Live API Keys
- [ ] Get live publishable key (pk_live_...)
- [ ] Get live secret key (sk_live_...)
- [ ] Update production .env files
- [ ] Never mix test and live keys
- [ ] Test with small amounts first

## ✅ Final Verification

### Everything Working?
- [ ] Test payments succeed
- [ ] Fees calculated correctly (5%)
- [ ] User balances update properly
- [ ] Transactions recorded
- [ ] Stripe Dashboard shows payments
- [ ] Error handling works
- [ ] No console errors
- [ ] Mobile responsive works
- [ ] Card input validation works
- [ ] Success/error messages display

### Documentation Read?
- [ ] Read `STRIPE_INTEGRATION.md`
- [ ] Read `STRIPE_SETUP_GUIDE.md`
- [ ] Understand payment flow
- [ ] Understand fee structure
- [ ] Know how to troubleshoot

## 🎉 Completion

### All Done?
- [ ] All checklist items completed
- [ ] Test payments working
- [ ] Ready to accept payments
- [ ] Team informed of new feature
- [ ] Users can add funds via Stripe

**Congratulations! Your Stripe integration is complete! 🚀**

---

## Quick Reference

### Test Card Numbers
```
Success:  4242 4242 4242 4242
Declined: 4000 0000 0000 0002
Low Funds: 4000 0000 0000 9995

Expiry: Any future date
CVC: Any 3 digits
```

### Fee Examples
```
$10  + $0.50  = $10.50
$25  + $1.25  = $26.25
$50  + $2.50  = $52.50
$100 + $5.00  = $105.00
```

### Important Files
```
server/.env                          - Backend config
.env                                 - Frontend config
server/src/controllers/walletController.js  - Payment logic
src/components/WalletModal.jsx      - Payment UI
```

### Support
- Stripe Docs: https://stripe.com/docs
- Test Cards: https://stripe.com/docs/testing
- Dashboard: https://dashboard.stripe.com

---

**Last Updated:** January 2026  
**Status:** Ready for Testing  
**Version:** 1.0.0
