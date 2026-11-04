# Stripe Payment Integration

## Overview
This document describes the Stripe payment integration for the Pmail wallet system, including the 5% transaction fee implementation.

## Features
- **Stripe Payment Processing**: Secure card payments via Stripe
- **Transaction Fee**: Automatic 5% fee on all card deposits (configurable)
- **Real-time Payment Confirmation**: Immediate wallet credit after successful payment
- **Transaction History**: All deposits tracked with fee breakdown
- **Security**: PCI-compliant payment handling through Stripe

## Architecture

### Backend (Node.js/Express)
- **Stripe SDK**: `stripe` npm package
- **Payment Intent Flow**: Two-step process for secure payments
- **Idempotency**: Prevents duplicate processing of payments

### Frontend (React)
- **Stripe.js**: `@stripe/stripe-js` for secure card input
- **Payment UI**: Custom card form with validation
- **Fee Display**: Transparent fee breakdown before payment

## Configuration

### 1. Get Stripe API Keys
1. Sign up at [https://stripe.com](https://stripe.com)
2. Get your API keys from the Dashboard
3. Use test keys for development (start with `sk_test_` and `pk_test_`)

### 2. Backend Configuration
Edit `server/.env`:
```env
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
TRANSACTION_FEE_PERCENTAGE=5
```

### 3. Frontend Configuration
Edit `.env`:
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
VITE_TRANSACTION_FEE_PERCENTAGE=5
```

## Transaction Fee Structure

### How It Works
When a user adds funds to their wallet:
- User wants to deposit: **$100.00**
- Transaction fee (5%): **$5.00**
- Total charged to card: **$105.00**
- User receives in wallet: **$100.00**
- Company receives: **$5.00**

### Fee Calculation
```javascript
const feePercentage = 5; // configurable via TRANSACTION_FEE_PERCENTAGE
const depositAmount = 100.00;
const feeAmount = depositAmount * (feePercentage / 100); // $5.00
const totalCharged = depositAmount + feeAmount; // $105.00
```

### Configuration
Change the fee percentage by updating:
- Backend: `TRANSACTION_FEE_PERCENTAGE` in `server/.env`
- Frontend: `VITE_TRANSACTION_FEE_PERCENTAGE` in `.env`

## Payment Flow

### Step 1: User Initiates Payment
1. User opens wallet modal
2. Selects "Card" payment method
3. Enters amount and card details
4. Sees fee breakdown before confirming

### Step 2: Create Payment Intent
```
Frontend → POST /api/wallet/stripe/create-payment-intent
Body: { amount: 100 }

Backend Response:
{
  clientSecret: "pi_xxx_secret_xxx",
  paymentIntentId: "pi_xxx",
  amount: 100,
  feeAmount: 5,
  totalAmount: 105,
  feePercentage: 5
}
```

### Step 3: Stripe Payment Confirmation
```
Frontend → Stripe.confirmCardPayment(clientSecret, cardDetails)
Stripe Response: { paymentIntent: { status: 'succeeded' } }
```

### Step 4: Credit Wallet
```
Frontend → POST /api/wallet/stripe/confirm-payment
Body: { paymentIntentId: "pi_xxx" }

Backend:
1. Verifies payment with Stripe
2. Checks for duplicate processing
3. Credits user wallet with deposit amount
4. Records transaction with fee details
5. Returns updated wallet balance
```

## API Endpoints

### Create Payment Intent
**POST** `/api/wallet/stripe/create-payment-intent`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "amount": 100.00
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "amount": 100.00,
  "feeAmount": 5.00,
  "totalAmount": 105.00,
  "feePercentage": 5
}
```

### Confirm Payment
**POST** `/api/wallet/stripe/confirm-payment`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "paymentIntentId": "pi_xxx"
}
```

**Response:**
```json
{
  "message": "Funds added successfully",
  "walletBalance": 200.00,
  "depositAmount": 100.00,
  "feeAmount": 5.00,
  "totalCharged": 105.00
}
```

## Database Schema

### Transaction Record
```javascript
{
  userId: 123,
  type: 'DEPOSIT',
  amount: 100.00,  // Amount credited to user wallet
  description: 'Stripe deposit: $100.00 (Fee: $5.00, 5%) - pi_xxx',
  createdAt: '2026-01-15T10:30:00Z'
}
```

## Testing

### Test Card Numbers
Stripe provides test cards for development:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Insufficient Funds**: `4000 0000 0000 9995`

**Note:** Use any future expiry date and any 3-digit CVC

### Test Scenarios

#### 1. Successful Payment
```
Amount: $50
Expected Fee: $2.50
Total Charge: $52.50
Wallet Credit: $50.00
```

#### 2. Failed Payment
```
Card: 4000 0000 0000 0002
Expected: Error message shown to user
Wallet: No change
```

#### 3. Duplicate Prevention
```
1. Complete payment successfully
2. Try to confirm same paymentIntentId again
3. Expected: Returns existing balance, no duplicate credit
```

## Security Features

### PCI Compliance
- Card details never touch our servers
- Stripe.js handles secure card input
- Payment data tokenized by Stripe

### Idempotency
- Payment intent ID used to prevent double-processing
- Database checks for existing transactions
- Safe to retry confirmation requests

### Validation
- Server-side amount validation
- Payment status verification with Stripe
- User authentication required for all endpoints

## Revenue Tracking

### Company Revenue
All transaction fees are company revenue:
```javascript
// Get total fees collected
SELECT SUM(
  CAST(
    SUBSTRING(description FROM 'Fee: \\$([0-9.]+)') 
    AS DECIMAL
  )
) as total_fees
FROM transactions
WHERE type = 'DEPOSIT' 
AND description LIKE '%Stripe deposit%'
```

### Financial Reporting
Transaction records include:
- Deposit amount (credited to user)
- Fee amount (company revenue)
- Fee percentage (for auditing)
- Stripe payment intent ID (for reconciliation)

## Error Handling

### Common Errors
1. **Card Declined**: User-friendly message, no wallet change
2. **Insufficient Funds**: Suggest lower amount
3. **Network Error**: Retry mechanism with exponential backoff
4. **Invalid Card**: Real-time validation feedback

### Error Messages
```javascript
// Card declined
"Payment failed. Your card was declined. Please try another card."

// Insufficient funds
"Payment failed. Card has insufficient funds."

// Network error
"Payment processing error. Please try again."
```

## Monitoring

### Stripe Dashboard
- View all transactions
- Monitor success rates
- Track revenue
- Handle disputes/refunds

### Application Logs
```javascript
// Backend logs include:
- Payment intent creation
- Payment confirmation
- Fee calculations
- Error details
```

## Future Enhancements

### Planned Features
1. **Webhook Integration**: Real-time payment notifications
2. **Refund Support**: Handle payment refunds
3. **Multiple Payment Methods**: ACH, Apple Pay, Google Pay
4. **Subscription Billing**: Recurring payments
5. **Fee Tiers**: Volume-based fee discounts

### Webhook Setup (Coming Soon)
```javascript
// Webhook endpoint
POST /api/wallet/stripe/webhook

// Events to handle:
- payment_intent.succeeded
- payment_intent.payment_failed
- charge.refunded
```

## Support

### Stripe Documentation
- [Payment Intents API](https://stripe.com/docs/payments/payment-intents)
- [Testing](https://stripe.com/docs/testing)
- [Error Codes](https://stripe.com/docs/error-codes)

### Troubleshooting
1. **Payments not working**: Check API keys match environment (test/live)
2. **Fee not showing**: Verify `TRANSACTION_FEE_PERCENTAGE` is set
3. **Card errors**: Ensure using test cards in development
4. **Balance not updating**: Check backend logs for confirmation errors

## Compliance

### Legal Requirements
- Display total charge before payment
- Show fee breakdown transparently
- Provide transaction receipts
- Store payment records for auditing

### Stripe Compliance
- Follow Stripe's terms of service
- Handle customer data securely
- Implement proper error handling
- Monitor for fraud

---

**Last Updated:** January 2026
**Version:** 1.0.0
