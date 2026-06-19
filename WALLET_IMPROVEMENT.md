# Wallet Improvements with Lightning Network Integration

## ✅ Completed Backend Enhancements

### 1. **New Routes Added** (`wallet.js`)
- `POST /api/wallet/create-invoice` - Create Lightning Network invoice
- `GET /api/wallet/invoice/:invoiceId/status` - Check invoice payment status
- `POST /api/wallet/withdraw` - Withdraw funds (bank or Lightning)

### 2. **Controller Functions** (`walletController.js`)
- `createLightningInvoice()` - Generates Lightning invoice via Polar API
- `checkInvoiceStatus()` - Polls invoice status and credits wallet when paid
- `withdrawFunds()` - Handles withdrawals to bank or Lightning addresses
- Helper functions for USD/Satoshi conversion

### 3. **Polar Lightning Integration**
```javascript
// Configuration (add to .env)
POLAR_API_URL=http://localhost:8081
POLAR_MACAROON=<your_macaroon_here>
```

### 4. **Frontend API Updates** (`api.js`)
- `createLightningInvoice(amount)` - Request Lightning invoice
- `checkInvoiceStatus(invoiceId)` - Check if invoice is paid
- `withdrawFunds(amount, paymentRequest)` - Withdraw to bank or Lightning

## 🎯 New Wallet Features

### Deposit Methods
1. **Credit/Debit Card** - Instant deposits (existing)
2. **Lightning Network** - Low-fee Bitcoin deposits
   - Generate Lightning invoice
   - Display QR code
   - Auto-detect payment
   - Instant credit to wallet

### Withdrawal Methods
1. **Bank Transfer** - Traditional withdrawal (1-3 days)
2. **Lightning Network** - Instant Bitcoin withdrawals
   - Enter Lightning address or invoice
   - Instant transfer
   - Low fees

### UI Improvements
1. **Tab Navigation**
   - Overview (balance + transactions)
   - Deposit (add funds)
   - Withdraw (transfer out)

2. **Payment Method Selection**
   - Card vs Lightning with icons
   - Visual indication of selected method
   - Fee comparison

3. **Lightning Invoice Display**
   - QR code for easy scanning
   - Copy invoice button
   - Real-time payment detection
   - Automatic wallet credit

4. **Better Transaction History**
   - Clearer transaction types
   - Icons for deposit/withdrawal
   - Lightning-specific descriptions

## 📦 Required Dependencies

Add to `server/package.json`:
```json
{
  "dependencies": {
    "axios": "^1.6.0"
  }
}
```

Install:
```bash
cd server
npm install axios
```

## 🔧 Setup Instructions

### 1. Install Polar
```bash
# Download from https://lightningpolar.com/
# Or use Docker:
docker pull polarlightning/polar
```

### 2. Configure Environment Variables
Add to `server/.env`:
```env
POLAR_API_URL=http://localhost:8081
POLAR_MACAROON=your_macaroon_here
```

### 3. Update Prisma Schema
The Transaction model already supports WITHDRAWAL type in the comment, but ensure it's documented.

### 4. Test the Integration
```bash
# Start Polar Lightning Network
# Start backend server
cd server
npm start

# Start frontend
cd ..
npm run dev
```

## 🎨 UI Flow

### Deposit Flow
1. Click "Add Funds" button
2. Choose payment method (Card or Lightning)
3. Enter amount
4. If Lightning:
   - Generate invoice
   - Display QR code
   - Wait for payment
   - Auto-credit wallet
5. If Card:
   - Simulate payment
   - Instant credit

### Withdrawal Flow
1. Click "Withdraw" button
2. Choose method (Bank or Lightning)
3. Enter amount
4. If Lightning: Enter Lightning address/invoice
5. Confirm withdrawal
6. Process payment

## 🔐 Security Considerations

1. **Macaroon Security**: Store Polar macaroon securely in environment variables
2. **Amount Validation**: Check user balance before withdrawals
3. **Rate Limiting**: Implement rate limits on Lightning operations
4. **Error Handling**: Graceful handling of Lightning Network failures

## 📊 Transaction Types

- `DEPOSIT` - Funds added via card or Lightning
- `WITHDRAWAL` - Funds withdrawn to bank or Lightning
- `KNOCC_SENT` - Payment for sending Knocc request
- `KNOCC_RECEIVED` - Payment received from Knocc request
- `REFUND` - Refunded transactions

## 🚀 Future Enhancements

1. **Real BTC Price Feed**: Integrate live Bitcoin price API
2. **Invoice Expiration**: Handle expired Lightning invoices
3. **Withdrawal Limits**: Daily/monthly withdrawal limits
4. **Fee Display**: Show network fees before transactions
5. **Multi-currency**: Support multiple currencies
6. **Receipt Generation**: PDF receipts for transactions
7. **Auto-convert**: Auto-convert between USD and BTC

## 📝 Notes

- Lightning Network requires running Polar or a real Lightning node
- For testing, use Polar's simulated network
- For production, connect to a real Lightning node (LND, C-Lightning, Eclair)
- Consider using services like OpenNode or Strike for production Lightning payments
