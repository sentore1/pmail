# Wallet Stripe Payment UI Preview

## Visual Layout

### 1. Wallet Overview (Default View)
```
┌─────────────────────────────────────────────┐
│  ← My Wallet                            × │
│  Manage your Pmail funds                   │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Available Balance                   │   │
│  │ $150.00                             │   │
│  │                                     │   │
│  │ [+ Add Funds]  [↗ Withdraw]       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────┬──────────────┐            │
│  │ Pryro       │ Standard     │            │
│  │ Request     │ Request      │            │
│  │ $50+        │ $1           │            │
│  └─────────────┴──────────────┘            │
│                                             │
│  Recent Transactions                        │
│  ┌───────────────────────────────────────┐ │
│  │ ↓ Funds Added        +$100.00         │ │
│  │   Stripe deposit                      │ │
│  │   Today, 10:30 AM                     │ │
│  ├───────────────────────────────────────┤ │
│  │ ↑ Knocc Request Sent  -$50.00        │ │
│  │   To: john@pmail.com                  │ │
│  │   Yesterday, 3:45 PM                  │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 2. Add Funds - Card Payment Selected
```
┌─────────────────────────────────────────────┐
│  ← Add Funds                            × │
│  Choose your payment method                │
├─────────────────────────────────────────────┤
│                                             │
│  Choose Payment Method                      │
│  ┌────────────┬────────────┐               │
│  │ [💳] Card  │ [⚡] Lightning              │
│  │  Instant   │   Low fees │               │
│  │  (Stripe)  │            │               │
│  └────────────┴────────────┘               │
│  └── SELECTED ──┘                          │
│                                             │
│  Amount (USD)                               │
│  ┌─────────────────────────────────┐       │
│  │ $ 100.00                        │       │
│  └─────────────────────────────────┘       │
│                                             │
│  [$10]  [$25]  [$50]  [$100]              │
│                                             │
│  ┌─────────────────────────────────┐       │
│  │ Card Details                    │       │
│  │                                 │       │
│  │ Card Number                     │       │
│  │ [4242 4242 4242 4242]          │       │
│  │                                 │       │
│  │ Expiry      CVC                │       │
│  │ [12/26]     [123]              │       │
│  │                                 │       │
│  │ Cardholder Name                │       │
│  │ [John Doe]                     │       │
│  │                                 │       │
│  │ ⓘ Transaction Fee               │       │
│  │   Deposit Amount:    $100.00    │       │
│  │   Processing Fee:      $5.00    │       │
│  │   (5%)                          │       │
│  │   ─────────────────────────────  │       │
│  │   Total Charge:      $105.00    │       │
│  └─────────────────────────────────┘       │
│                                             │
│  [💳 Add $100.00 with Card]                │
│                                             │
│  🔒 Secured by Stripe • 5% fee applies     │
└─────────────────────────────────────────────┘
```

### 3. Payment Processing State
```
┌─────────────────────────────────────────────┐
│  ← Add Funds                            × │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │         [⏰ Processing Payment...]   │   │
│  │                                     │   │
│  │    Please wait, do not close this   │   │
│  │         window...                   │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 4. Payment Success
```
┌─────────────────────────────────────────────┐
│  ← Add Funds                            × │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ✓ Successfully added $100.00!       │   │
│  │   (Fee: $5.00)                      │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Redirecting to overview...                 │
└─────────────────────────────────────────────┘
```

### 5. Payment Error
```
┌─────────────────────────────────────────────┐
│  ← Add Funds                            × │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ⚠️ Payment failed. Your card was     │   │
│  │    declined. Please try another card.│   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Try Again]                                │
└─────────────────────────────────────────────┘
```

## Color Scheme

### Overview Tab
- **Background:** White
- **Balance Card:** Blue gradient (from-blue-500 to-blue-600)
- **Text:** White on blue, gray-900 on white
- **Buttons:** Blue-600 primary, white/transparent secondary

### Card Payment Form
- **Background:** Gray-50 for card details section
- **Inputs:** White with gray-300 border
- **Focus:** Blue-500 ring
- **Fee Info:** Blue-50 background with blue-600 text

### Status Messages
- **Success:** Green-50 background, green-600 text
- **Error:** Red-50 background, red-600 text
- **Processing:** Gray with spinning icon

## Interactive Elements

### Card Number Input
```
Type: 4242424242424242
Shows: 4242 4242 4242 4242 (auto-formatted)
```

### Expiry Date Input
```
Type: 1226
Shows: 12/26 (auto-formatted)
```

### Amount Presets
```
Clicking [$50] automatically fills amount field with 50
```

### Fee Calculation (Real-time)
```
Amount: $100
Fee (5%): $5.00
Total: $105.00

Amount: $50
Fee (5%): $2.50
Total: $52.50

Amount: $25
Fee (5%): $1.25
Total: $26.25
```

## Payment Method Toggle

### Card Selected (Default)
```
┌──────────────────┐   ┌──────────────────┐
│  [💳] Card      │   │  ⚡ Lightning    │
│   Instant       │   │   Low fees       │
│  (via Stripe)   │   │                  │
│  ◄──SELECTED──  │   │                  │
└──────────────────┘   └──────────────────┘
```

### Lightning Selected
```
┌──────────────────┐   ┌──────────────────┐
│  💳 Card         │   │  [⚡] Lightning  │
│   Instant       │   │   Low fees       │
│  (via Stripe)   │   │  ◄──SELECTED──  │
└──────────────────┘   └──────────────────┘
```

## Transaction List Display

### Format Examples
```
Recent Transactions

↓ Funds Added                    +$100.00
  Stripe deposit: $100.00 (Fee: $5.00, 5%)
  Today, 10:30 AM

↑ Knocc Request Sent              -$50.00
  To: john@pmail.com
  Yesterday, 3:45 PM

↓ Funds Added                     +$25.00
  Stripe deposit: $25.00 (Fee: $1.25, 5%)
  Jan 10, 2:15 PM

↑ Withdrawal                     -$100.00
  To bank account
  Jan 8, 9:00 AM
```

## Mobile Responsive

### Mobile View (< 640px)
```
┌───────────────────────┐
│  ← Add Funds      × │
├───────────────────────┤
│                       │
│  Choose Payment       │
│  ┌─────────────────┐ │
│  │  💳 Card        │ │
│  │   Instant       │ │
│  └─────────────────┘ │
│  ┌─────────────────┐ │
│  │  ⚡ Lightning   │ │
│  │   Low fees      │ │
│  └─────────────────┘ │
│                       │
│  Amount (USD)         │
│  ┌─────────────────┐ │
│  │ $ [100.00]      │ │
│  └─────────────────┘ │
│                       │
│  Card Details         │
│  ┌─────────────────┐ │
│  │ Card Number     │ │
│  │ [4242...]       │ │
│  │                 │ │
│  │ Expiry    CVC   │ │
│  │ [12/26]  [123] │ │
│  │                 │ │
│  │ Name            │ │
│  │ [John Doe]      │ │
│  │                 │ │
│  │ Total: $105.00  │ │
│  └─────────────────┘ │
│                       │
│  [Add with Card]      │
└───────────────────────┘
```

## Animations

### Loading Spinner
```
⏰ (rotating clock icon)
```

### Success Check
```
✓ (green checkmark fades in)
```

### Error Alert
```
⚠️ (red warning icon shakes)
```

### Balance Update
```
$100.00 → (smooth transition) → $200.00
```

## Accessibility Features

- **Keyboard Navigation:** All inputs accessible via Tab
- **Screen Readers:** ARIA labels on all form fields
- **Focus Indicators:** Visible blue ring on focused elements
- **Error Announcements:** Screen reader alerts for errors
- **Color Contrast:** WCAG AA compliant

## Error States

### Validation Errors
```
Card Number
[____________________]
⚠️ Please fill in all card details

Amount (USD)
[0.00]
⚠️ Amount must be at least $1
```

### Payment Errors
```
⚠️ Payment failed. Your card was declined.
⚠️ Card has insufficient funds.
⚠️ Payment processing error. Please try again.
```

## Success States

### Payment Complete
```
✓ Successfully added $100.00! (Fee: $5.00)
  Your new balance: $250.00
```

### Auto-redirect
```
Redirecting to overview in 3 seconds...
(automatically switches to overview tab)
```

---

**UI Framework:** React + Tailwind CSS  
**Icons:** Lucide React  
**Payment:** Stripe Elements (custom styled)  
**Animations:** CSS transitions  
**Responsive:** Mobile-first design
