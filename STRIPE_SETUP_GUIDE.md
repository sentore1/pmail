# Quick Stripe Setup Guide

Follow these steps to integrate Stripe payments with your Pmail wallet.

## Step 1: Get Stripe Account
1. Go to [https://stripe.com](https://stripe.com)
2. Sign up for a free account
3. Verify your email

## Step 2: Get API Keys
1. Log into Stripe Dashboard
2. Go to **Developers** → **API Keys**
3. Copy your **Publishable key** (starts with `pk_test_`)
4. Copy your **Secret key** (starts with `sk_test_`)
   - **⚠️ Important:** Keep the secret key private!

## Step 3: Configure Backend
1. Open `server/.env`
2. Add your Stripe keys:
```env
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_optional_for_now
TRANSACTION_FEE_PERCENTAGE=5
```

## Step 4: Configure Frontend
1. Open `.env` (root folder)
2. Add your Stripe publishable key:
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
VITE_TRANSACTION_FEE_PERCENTAGE=5
```

## Step 5: Install Dependencies (Already Done)
The following packages have been installed:
- Backend: `stripe` (npm package)
- Frontend: `@stripe/stripe-js`

## Step 6: Test Payment
1. Start the application:
```bash
npm run dev          # Frontend
cd server && npm run dev    # Backend
```

2. Open the app and login
3. Click on **Wallet** in the sidebar
4. Click **Add Funds**
5. Select **Card** payment method
6. Enter test card details:
   - **Card Number:** 4242 4242 4242 4242
   - **Expiry:** Any future date (e.g., 12/26)
   - **CVC:** Any 3 digits (e.g., 123)
   - **Name:** Any name
7. Enter amount (e.g., $50)
8. You'll see the fee breakdown: $50 + $2.50 (5%) = $52.50
9. Click **Add $50.00 with Card**
10. Wait for confirmation
11. Check your wallet balance - it should increase by $50

## Step 7: Verify in Stripe Dashboard
1. Go to Stripe Dashboard → **Payments**
2. You should see your test payment
3. Amount charged: $52.50 (includes 5% fee)

## Transaction Fee Explained

### Example: $100 deposit
- User deposits: **$100.00**
- Processing fee (5%): **$5.00**
- Total charged to card: **$105.00**
- User receives in wallet: **$100.00**
- Your company revenue: **$5.00**

### Change Fee Percentage
To change from 5% to another percentage:
1. Update `TRANSACTION_FEE_PERCENTAGE` in `server/.env`
2. Update `VITE_TRANSACTION_FEE_PERCENTAGE` in `.env`
3. Restart both servers

## Test Cards

### Successful Payments
- **Visa:** 4242 4242 4242 4242
- **Mastercard:** 5555 5555 5555 4444
- **American Express:** 3782 822463 10005

### Failed Payments (for testing error handling)
- **Card Declined:** 4000 0000 0000 0002
- **Insufficient Funds:** 4000 0000 0000 9995
- **Incorrect CVC:** 4000 0000 0000 0127

**Note:** All test cards work with any future expiry date and any CVC (except the specific test cases above)

## Going Live (Production)

### When Ready for Real Payments:
1. Complete Stripe account verification
2. Add business information
3. Connect bank account for payouts
4. Switch from test keys to live keys:
   - Live keys start with `pk_live_` and `sk_live_`
5. Update `.env` files with live keys
6. Test thoroughly with small amounts first

### Security Checklist Before Going Live:
- [ ] Environment variables set correctly
- [ ] Secret keys never committed to Git
- [ ] HTTPS enabled on production server
- [ ] CORS configured properly
- [ ] Rate limiting implemented
- [ ] Error handling tested
- [ ] Webhook signature verification enabled

## Troubleshooting

### Payment not working?
1. **Check API keys match:**
   - Both should be test keys (`pk_test_` and `sk_test_`)
   - Or both should be live keys (`pk_live_` and `sk_live_`)
   - Don't mix test and live keys!

2. **Check .env files loaded:**
   ```bash
   # Backend
   cd server && npm run dev
   # Should see Stripe initialized in logs
   
   # Frontend  
   npm run dev
   # Check browser console for Stripe errors
   ```

3. **Check Stripe Dashboard:**
   - Go to Developers → Logs
   - See if API calls are reaching Stripe
   - Check for error messages

### Balance not updating?
1. Check browser console for errors
2. Check backend logs
3. Verify JWT token is valid
4. Check database for transaction records

### Fee not showing correctly?
1. Verify `TRANSACTION_FEE_PERCENTAGE` is set in both `.env` files
2. Restart both frontend and backend servers
3. Clear browser cache

## Revenue Tracking

### View Your Earnings:
1. **Stripe Dashboard:**
   - Go to **Payments** → View all successful charges
   - Your revenue = Total charges - Total deposits to users

2. **Database Query:**
```sql
-- Get total fees collected
SELECT 
  COUNT(*) as total_deposits,
  SUM(amount) as total_deposited_to_users,
  -- Fee information is in transaction description
  SUM(amount) * 0.05 as estimated_company_revenue
FROM transactions
WHERE type = 'DEPOSIT' 
AND description LIKE '%Stripe deposit%'
```

## Support Resources
- **Stripe Documentation:** [https://stripe.com/docs](https://stripe.com/docs)
- **Stripe Support:** Available in dashboard
- **Test Card Numbers:** [https://stripe.com/docs/testing](https://stripe.com/docs/testing)

## Next Steps
1. ✅ Complete this setup
2. ✅ Test with test cards
3. ✅ Verify fee calculations
4. 📝 Consider webhook integration for better reliability
5. 📝 Add refund functionality if needed
6. 📝 Implement receipt emails
7. 🚀 Go live when ready!

---

**Need Help?** Check `STRIPE_INTEGRATION.md` for detailed technical documentation.
